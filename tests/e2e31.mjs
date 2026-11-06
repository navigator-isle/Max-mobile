// Phone: Max's agents screen, weekly reports on the phone, fact-check banner on a note, music favorites & playlists.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const grounded = o => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(o) }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://negosyo.ph/x", title: "Negosyo guide" } }] } }] }));
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://www.youtube.com/results?")) { const q = new URL(url).searchParams.get("search_query"); return new Response(`<script>var ytInitialData = ${JSON.stringify({ a: [{ videoRenderer: { videoId: (q.replace(/\W/g, "") + "XXXXXXXXXXX").slice(0, 11), title: { runs: [{ text: q + " song" }] }, ownerText: { runs: [{ text: "Artist" }] } } }] })};</script>`); }
  if (url.includes("generativelanguage") && !url.includes("embed")) { const b = JSON.parse(o.body), t = b.contents.map(c => c.parts.map(p => p.text || "").join("")).join("\n");
    if (/boring" small businesses/.test(t)) return grounded({ ideas: ["Water refilling station", "Laundry shop"].map(n => ({ name: n, startupCostPhp: "₱150,000", monthlyProfitPhp: "₱20,000", whyItEarns: "demand", risks: "competition", permits: "Mayor's permit", runWhileAway: "caretaker", firstSteps: ["a", "b"], source: "negosyo.ph" })) });
    if (/writing your weekly report/.test(t)) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ status: ["2 new ideas, none repeated"], done: ["Searched 12 sources"], problems: [], improvements: ["Add costs"], missing: ["Your budget"], suggestions: ["Water refilling fits a seafarer"], next: ["10 more ideas"] }) }] } }] }));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "ok", action: null }) }] } }] })); }
  return new Response("{}", { status: 404 });
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8067", WK = "http://127.0.0.1:8853";
const sqlite = new DatabaseSync(":memory:");
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite) };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8853);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8067);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__yt = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t, confidence: .9 }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 30); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const ytFake = `window.YT={Player:function(el,o){const p={id:o.videoId,calls:[],setVolume(){},playVideo(){setTimeout(()=>o.events.onStateChange({data:1}),5)},pauseVideo(){},stopVideo(){},loadVideoById(id){p.id=id;p.calls.push(id);setTimeout(()=>o.events.onStateChange({data:1}),5)}};
 const f=document.createElement('iframe');(typeof el==='string'?document.getElementById(el):el).replaceWith(f);window.__yt.push(p);setTimeout(()=>o.events.onReady({target:p}),5);return p}};window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady();`;
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.route("https://www.youtube.com/iframe_api", r => r.fulfill({ contentType: "text/javascript", body: ytFake }));
const notes = JSON.stringify([{ id: "n1", title: "MARPOL Annex VI — sulphur", body: "<p>ECA limit 0.5%.</p>", category: "Maritime › IMO › Conventions", tags: [], createdAt: 1, updatedAt: 2 }]);
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", max_notes_v3: notes }, mock.toString()]);
// a fact-check result the Notes agent saved this morning
sqlite.exec("CREATE TABLE IF NOT EXISTS max_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)");
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") console.log("CONSOLE", m.text().slice(0, 300)); });
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
await p.evaluate(() => { try { window.cloud && (window.cloud.memory = true); } catch {} });
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(100); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(300); await p.evaluate(() => document.getElementById("homeStop").click()); };
const spoken = () => p.evaluate(() => window.__spoken.at(-1) || "");
const text = s => p.evaluate(s => document.querySelector(s)?.innerText || "", s);

await say("show my departments");
await p.waitForTimeout(800);
const crew = await text("#crewBody");
const order = ["NOTES", "RESEARCH", "WEBSITES", "APPS", "SECURITY", "TRADING", "INVESTMENTS", "BUSINESS", "MUSIC", "SCHEDULE", "EMAIL", "TRAINING", "ACTIVITY"];
const pos = order.map(x => crew.indexOf("\n" + x + "\n") >= 0 ? crew.indexOf("\n" + x + "\n") : crew.indexOf(x));
ok(pos.every(x => x >= 0) && pos.every((x, i) => i === 0 || x > pos[i - 1]), "the agents screen: Notes, Researcher, Websites, Apps, Security, Trading, Investments, Business, Music, Schedule, Email (+ Coach, Activity)", JSON.stringify(pos));
ok(/🗂 Notes & Attachments/.test(crew) && /fact-checker/.test(crew) && /Each site has its own team/.test(crew) && /Each app has its own team/.test(crew) && /forex/.test(crew), "each agent shows its sub-workers", crew.slice(0, 300));
ok((crew.match(/📧 Weekly report: Sunday/g) || []).length === 11 && (crew.match(/📧 Report now/g) || []).length === 11, "every agent has its weekly report and a “Report now” button", (crew.match(/📧 Weekly report/g) || []).length);
await say("show the business report");
ok(/no Business report yet/i.test(await spoken()), "no report yet → Max says so and offers to make one", await spoken());
await say("send me the business report now");
const rep = await text("#dispBody");
ok(/Business report ready/.test(await spoken()) && /STATUS/.test(rep) && /2 new ideas, none repeated/.test(rep) && /Water refilling station/.test(rep) && /Negosyo guide/.test(rep), "“send me the business report now” → the agent works and the full report shows (status, ideas table, sources)", rep.slice(0, 400));
ok((await p.evaluate(() => document.getElementById("dispTitle").textContent)) === "🏪 Business report", "titled with the agent");
// the fact-check banner on a note
await worker.fetch(new Request(WK + "/api/agents"), env).catch(() => {});
sqlite.prepare("INSERT OR REPLACE INTO max_settings (key, value, updated_at) VALUES ('max_srv_notecheck', ?, 1)").run(JSON.stringify({ n1: { at: Date.now(), title: "MARPOL Annex VI — sulphur", verdict: "needs update", summary: "One limit is out of date.", expert: "Maritime expert", issues: [{ problem: "ECA limit shown as 0.5%", correct: "0.10% inside ECAs since 2015", source: "IMO" }], sources: [{ title: "IMO — sulphur 2020", url: "https://www.imo.org/x" }] } }));
await p.evaluate(() => localStorage.removeItem("max_cache_notechecks"));
await say("open the MARPOL Annex VI note"); await p.waitForTimeout(1500);
const banner = await text("#readCheck");
ok(/⚠ Maritime expert — needs update/.test(banner) && /0\.10% inside ECAs/.test(banner) && /IMO — sulphur 2020/.test(banner), "an outdated note shows the Maritime expert's correction and source right on the note", banner);
// music favorites
await say("play Ben&Ben"); await p.waitForTimeout(500);
await say("add this to my favorites");
ok(/Added “Ben&Ben song” to your favorites \(1\)/.test(await spoken()), "“add this to my favorites” saves the song playing", await spoken());
await say("play OPM love songs"); await p.waitForTimeout(400);
await say("add this to my gym playlist");
ok(/to your gym playlist/.test(await spoken()), "…or to a playlist by name", await spoken());
await say("play my favorites");
ok(/Playing your favorites — 1 song/.test(await spoken()) && /^BenBen/.test(await p.evaluate(() => window.__yt.at(-1).id)), "“play my favorites” plays them", await spoken());
await say("stop the music");
await say("show my music");
const lib = await text("#dispBody");
ok(/1 favorite/.test(lib) && /gym \(1\)/.test(lib) && /Ben&Ben · 1×|ben&ben · 1×/i.test(lib), "“show my music”: favorites, playlists and what he asks for most", lib.slice(0, 300));
ok(JSON.parse(await p.evaluate(() => localStorage.getItem("max_music"))).favorites.length === 1, "the music library is saved (and synced to the laptop)");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
