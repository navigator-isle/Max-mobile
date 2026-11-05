// Activity log (what each desk did, which brain answered, what failed) and the music desk's finder (YouTube songs, internet radio).
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; }
  bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const events = JSON.parse(fs.readFileSync(new URL("./fixtures/trader-events.json", import.meta.url), "utf8")).map((e, i) => ({ ...e, at: new Date(Date.now() - (i + 1) * 3600e3).toISOString() }));
const yt = { contents: { twoColumnSearchResultsRenderer: { primaryContents: { sectionListRenderer: { contents: [{ itemSectionRenderer: { contents: [
  { videoRenderer: { videoId: "AAAAAAAAAA1", title: { runs: [{ text: "Ben&Ben - Maybe The Night" }] }, ownerText: { runs: [{ text: "Ben&Ben" }] }, lengthText: { simpleText: "4:52" } } },
  { adSlotRenderer: {} },
  { videoRenderer: { videoId: "BBBBBBBBBB2", title: { runs: [{ text: "Ben&Ben - Kathang Isip" }] }, ownerText: { runs: [{ text: "Ben&Ben" }] }, lengthText: { simpleText: "5:01" } } }] } }] } } } } };
let gemMode = "ok", ytMode = "ok", radioCalls = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { if (gemMode === "down") return new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Sure.", action: { type: "play_music", query: "Ben&Ben", details: { mode: "video" } } }) }] } }] })); }
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/events.json")) return new Response(JSON.stringify(events));
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/summary.json")) return new Response("{}", { status: 404 });
  if (url.startsWith("https://www.youtube.com/results?")) { if (ytMode === "down") return new Response("no", { status: 503 });
    return new Response(`<html><script>var ytInitialData = ${JSON.stringify(yt)};</script><script>window["ytInitialPlayerResponse"] = {};</script></html>`); }
  if (/api\.radio-browser\.info\/json\/stations\/search/.test(url)) { radioCalls.push(url); if (url.startsWith("https://all.")) throw new Error("mirror down");
    return new Response(JSON.stringify([{ name: "Smooth Jazz 24/7", url_resolved: "https://stream.example/jazz.mp3", codec: "MP3", countrycode: "US", tags: "jazz,smooth jazz", bitrate: 128 },
      { name: "Old HTTP station", url_resolved: "http://insecure.example/x.mp3", codec: "MP3" }, { name: "OGG station", url_resolved: "https://x.example/a.ogg", codec: "OGG" }])); }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const sqlite = new DatabaseSync(":memory:");
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(sqlite) };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, body, e = env, method = body ? "POST" : "GET", pass_ = "p") => { const r = await w.fetch(new Request("https://x" + path, { method, headers: { "Content-Type": "application/json", "X-Max-Pass": pass_ }, body: body ? JSON.stringify(body) : undefined }), e); return { status: r.status, data: await r.json() }; };

// ---- activity ----
let r = await call("/api/chat", { message: "how is my paper trading doing?", allowActions: true });
r = await call("/api/chat", { message: "play some Ben&Ben", allowActions: true });
gemMode = "down"; r = await call("/api/chat", { message: "remind me tomorrow at 9", allowActions: true }); gemMode = "ok";
ok(r.status === 429, "(the brain was out for that one)");
r = await call("/api/activity", { items: [{ dept: "schedule", kind: "add_event", text: "Added “Call agency” for Thu 9:00", ms: 840 }, { dept: "web", kind: "site_audit", text: "site_audit failed", detail: "timeout", ok: false }] });
ok(r.status === 200 && r.data.saved === 2, "the phone sends the actions it carried out");
r = await call("/api/activity?days=7");
const it = r.data.items || [];
const chatT = it.find(x => x.kind === "chat" && /paper trading/.test(x.text));
ok(chatT && chatT.dept === "trading" && chatT.model === "gemini-3.5-flash" && chatT.ok === 1 && Number.isFinite(chatT.ms), "each answer is logged with its desk, the brain that answered and how long it took", JSON.stringify(chatT));
const chatM = it.find(x => x.kind === "chat" && /Ben&Ben/.test(x.text));
ok(chatM && chatM.dept === "music" && /action: play_music/.test(chatM.detail), "…and the action the brain chose (🎵 Music desk → play_music)", JSON.stringify(chatM));
const failed = it.find(x => x.kind === "chat" && /remind me/.test(x.text));
ok(failed && failed.ok === 0 && failed.dept === "schedule" && /every brain failed/.test(failed.detail), "a failed answer is logged as a failure, with the reason", JSON.stringify(failed));
ok(it.some(x => x.source === "phone" && x.kind === "add_event" && x.ok === 1) && it.some(x => x.source === "phone" && x.ok === 0 && x.detail === "timeout"), "phone actions are logged too, failures included");
ok(it.some(x => x.source === "paper trader" && x.dept === "trading" && /BUY|SELL|started|Market/i.test(x.text)), "the paper trader's own moves show up in the Trading desk's log", JSON.stringify(it.filter(x => x.source === "paper trader").slice(0, 1)));
ok(r.data.failures === 2 && r.data.brains["gemini-3.5-flash"] >= 2, "it counts failures and which brains answered", JSON.stringify({ f: r.data.failures, b: r.data.brains }));
ok(it.every((x, i) => i === 0 || it[i - 1].at >= x.at), "newest first");
r = await call("/api/activity?days=7&dept=trading");
ok(r.data.items.length && r.data.items.every(x => x.dept === "trading"), "can filter by desk");
r = await call("/api/activity?days=7", null, env, "GET", "wrong");
ok(r.status === 401, "the log is private (passcode needed)");
r = await call("/api/activity", { items: [{ dept: "hackers", text: "x".repeat(5000) }] });
r = await call("/api/activity?days=1");
ok(r.data.items.some(x => x.dept === "general" && x.text.length <= 200), "unknown desks and long text are cleaned up");
await w.scheduled({}, { ...env, MAX_OWNER_EMAIL: "" }, { waitUntil: p => p });
ok(true, "the hourly job runs with the log in place");

// ---- music ----
r = await call("/api/music?q=Ben%26Ben");
ok(r.status === 200 && r.data.mode === "video" && r.data.videos.length === 2 && r.data.videos[0].id === "AAAAAAAAAA1" && r.data.videos[0].title === "Ben&Ben - Maybe The Night" && r.data.videos[0].channel === "Ben&Ben", "finds songs on YouTube (id, title, channel)", JSON.stringify(r.data).slice(0, 200));
r = await call("/api/music?q=jazz&mode=radio");
ok(r.status === 200 && r.data.stations.length === 1 && r.data.stations[0].url === "https://stream.example/jazz.mp3", "finds internet radio: only secure (https) MP3/AAC streams the phone can play", JSON.stringify(r.data));
ok(radioCalls.some(u => u.startsWith("https://all.")) && radioCalls.some(u => u.startsWith("https://de1.")), "if one radio directory server is down it tries the next");
ytMode = "down";
r = await call("/api/music?q=bossa%20nova");
ok(r.status === 200 && r.data.mode === "radio" && r.data.stations.length && /radio instead/.test(r.data.note), "if YouTube search is down it plays radio instead", JSON.stringify(r.data).slice(0, 160));
r = await call("/api/music?q=");
ok(r.status === 400, "asks what to play when nothing was said");
r = await call("/health?deep=1", null, env, "GET");
ok(/not working/.test(r.data.musicYouTube) && /working — 1 stations/.test(r.data.musicRadio), "the health check tests both music sources", r.data.musicYouTube + " | " + r.data.musicRadio);
ytMode = "ok";
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
