// Phone: 🎵 Music desk (songs in a small YouTube player, internet radio, turns down while Max talks) and the 🧾 activity log.
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
const vids = q => ({ contents: { a: [{ videoRenderer: { videoId: (q[0] + "AAAAAAAAAAA").slice(0, 10) + "1", title: { runs: [{ text: q + " — song one" }] }, ownerText: { runs: [{ text: "Artist" }] } } },
  { videoRenderer: { videoId: (q[0] + "BBBBBBBBBBB").slice(0, 10) + "2", title: { runs: [{ text: q + " — song two" }] }, ownerText: { runs: [{ text: "Artist" }] } } }] } });
const gem = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://www.youtube.com/results?")) { const q = new URL(url).searchParams.get("search_query"); return new Response(`<script>var ytInitialData = ${JSON.stringify(vids(q))};</script>`); }
  if (/radio-browser\.info/.test(url)) return new Response(JSON.stringify([{ name: "Smooth Jazz 24/7", url_resolved: "https://stream.example/jazz.mp3", codec: "MP3", countrycode: "US", tags: "jazz,smooth" }, { name: "Jazz Two", url_resolved: "https://stream.example/two.mp3", codec: "AAC" }]));
  if (url.includes("raw.githubusercontent.com")) return new Response("[]");
  if (url === "https://api.groq.com/openai/v1/chat/completions") return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ verdict: "minor", issues: ["Also mention the drill must be logged"], confidence: "high" }) } }] }));
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents?.at(-1)?.parts?.[0]?.text || "";
    const text = /focus/.test(q) ? JSON.stringify({ reply: "Putting on some focus music.", action: { type: "play_music", query: "lofi focus mix", details: { mode: "video" } } }) : JSON.stringify({ reply: "Answer to: " + q, action: null });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })); }
  return new Response("{}", { status: 404 });
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8064", WK = "http://127.0.0.1:8850";
const sqlite = new DatabaseSync(":memory:");
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GROQ_API_KEY: "g" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8850);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8064);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__yt = []; window.__audio = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 30); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onstart && u.onstart(), 5); setTimeout(() => u.onend && u.onend(), 120); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  // Fake radio: records what plays and at what volume.
  window.Audio = function () { const a = { src: "", volume: 1, paused: true, vols: [], play() { a.paused = false; setTimeout(() => a.onplaying && a.onplaying(), 10); return Promise.resolve(); }, pause() { a.paused = true; a.onpause && a.onpause(); } };
    let v = 1; Object.defineProperty(a, "volume", { get: () => v, set: x => { v = x; a.vols.push(Math.round(x * 100)); } }); window.__audio.push(a); return a; }; };
const ytFake = `window.YT={Player:function(el,o){const p={id:o.videoId,vols:[],calls:[],setVolume(v){p.vols.push(v)},playVideo(){p.calls.push('play');setTimeout(()=>o.events.onStateChange({data:1}),10)},pauseVideo(){p.calls.push('pause');o.events.onStateChange({data:2})},stopVideo(){p.calls.push('stop')},
 loadVideoById(id){p.id=id;p.calls.push('load:'+id);setTimeout(()=>o.events.onStateChange({data:1}),10)},fail(){o.events.onError({data:150})},end(){o.events.onStateChange({data:0})}};
 const f=document.createElement('iframe');f.id='ytFrame';(typeof el==='string'?document.getElementById(el):el).replaceWith(f);window.__yt.push(p);setTimeout(()=>o.events.onReady({target:p}),10);return p}};window.onYouTubeIframeAPIReady&&window.onYouTubeIframeAPIReady();`;
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.route("https://www.youtube.com/iframe_api", r => r.fulfill({ contentType: "text/javascript", body: ytFake }));
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(100); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(350); await p.evaluate(() => document.getElementById("homeStop").click()); };
const spoken = () => p.evaluate(() => window.__spoken.at(-1) || "");
const yt = () => p.evaluate(() => { const y = window.__yt.at(-1); return y ? { id: y.id, vols: y.vols, calls: y.calls } : null; });
const title = () => p.evaluate(() => document.getElementById("musicTitle")?.textContent || "");

await say("play Ben&Ben");
let y = await yt();
ok(y && y.id === "BAAAAAAAAA1" && y.calls.includes("play"), "“play Ben&Ben” finds the song and starts the YouTube player", JSON.stringify(y));
ok(await vis("#musicBar") && /Ben&Ben — song one/.test(await title()) && await p.locator("#ytFrame").isVisible(), "the music bar shows what's playing, with the small player visible", await title());
ok(/^Playing Ben&Ben — song one/.test(await spoken()), "Max says what he's playing", await spoken());
await p.waitForTimeout(1800); y = await yt();
ok(y.calls.includes("pause") && y.calls.at(-1) === "play", "the music paused while Max spoke, then came back by itself", JSON.stringify(y.calls));
ok(await p.locator("#musicPlay").textContent() === "⏸", "pause button shows while playing");
await say("next song");
y = await yt(); ok(/load:B.*2$/.test(y.calls.at(-1)) && /song two/.test(await title()), "“next song” plays the next one", JSON.stringify(y.calls));
await say("louder");
y = await yt(); ok(y.vols.at(-1) === 85 && /85%/.test(await spoken()), "“louder” turns it up (and it's remembered)", JSON.stringify(y.vols.slice(-3)) + " " + await spoken());
await p.click("#musicPlay"); await p.waitForTimeout(100);
y = await yt(); ok(y.calls.includes("pause") && await p.locator("#musicPlay").textContent() === "▶", "the ⏯ button pauses");
await p.click("#musicPlay"); await p.waitForTimeout(100);
await p.evaluate(() => window.__yt.at(-1).fail()); await p.waitForTimeout(300);
ok(await vis("#musicBar") === false || /stop/.test(JSON.stringify((await yt()).calls)), "a song that can't play is skipped (end of the list → music stops)", JSON.stringify((await yt()).calls));
await say("what song is this");
ok(/Nothing is playing/.test(await spoken()) || /This is/.test(await spoken()), "“what song is this” answers", await spoken());
await say("play jazz radio");
await p.waitForTimeout(1800);
let a = await p.evaluate(() => { const x = window.__audio.at(-1); return x ? { src: x.src, paused: x.paused, vols: x.vols, pauses: x.pauses || 0 } : null; });
ok(a && a.src === "https://stream.example/jazz.mp3" && !a.paused && /📻 Smooth Jazz/.test(await title()) && !(await p.locator("#musicVideoWrap").isVisible()), "“play jazz radio” plays an internet radio station (no video player)", JSON.stringify(a) + " " + await title());
ok(a.vols.at(-1) === 85 && !a.paused, "radio comes back after Max talks, at your volume", JSON.stringify(a));
await say("next station");
a = await p.evaluate(() => window.__audio.at(-1).src); ok(a === "https://stream.example/two.mp3", "“next station” changes the station", a);
await say("stop the music");
ok(!(await vis("#musicBar")) && await p.evaluate(() => window.__audio.at(-1).paused), "“stop the music” stops it and hides the bar");
await say("I need something to help me focus");
y = await yt();
ok(y && /^l/.test(y.id) && /🎵 Music desk/.test(await p.evaluate(() => document.getElementById("noteRefs").textContent)), "asked in his own words (no music words), Max picks music, it plays, and the 🎵 Music desk gets the credit", JSON.stringify(y));
await say("stop the music");
// ---- smarter brain: deep thinking + second-AI check, shown on the phone ----
await say("Explain why SOLAS requires monthly lifeboat drills and compare it with MARPOL Annex I");
const chips = await p.evaluate(() => [...document.querySelectorAll("#noteRefs .desk-chip")].map(x => x.textContent));
ok(chips.includes("🧠 Deep thinking") && chips.includes("✓ Double-checked · 1 note"), "a hard question shows 🧠 Deep thinking and ✓ Double-checked", JSON.stringify(chips));
await p.click("#noteRefs button.desk-chip"); await p.waitForTimeout(200);
ok(/Also mention the drill must be logged/.test(await p.evaluate(() => document.body.innerText)), "tap the check label to see what the second AI said");
await say("tell me a joke");
ok(!(await p.evaluate(() => document.getElementById("noteRefs").innerText)).includes("Deep thinking"), "everyday questions don't show it");
// ---- activity log ----
await p.waitForTimeout(3500);
await say("show my activity log");
const disp = await p.evaluate(() => document.getElementById("dispBody").innerText);
ok(await p.evaluate(() => document.getElementById("dispTitle").textContent) === "Activity log" && /SUMMARY/.test(disp), "“show my activity log” opens the log", disp.slice(0, 200));
ok(/🎵 Music desk — \d/.test(disp) && /🎵 Answered: “I need something to help me focus”/.test(disp) && /gemini-3\.5-flash/.test(disp), "it shows each desk's work, his questions and which brain answered", disp.slice(0, 500));
ok(/Playing Ben&Ben/.test(disp) && /Music off/.test(disp), "the music actions are in the log", disp.slice(0, 600));
const rows = sqlite.prepare("SELECT count(*) c FROM max_activity WHERE source='phone'").get().c;
ok(rows >= 5, "the phone's actions were saved in Max's database (so the laptop sees them too)", rows);
ok(/From Max’s database/.test(await p.evaluate(() => document.getElementById("dispSub").textContent)), "the log is read from the database");
await p.click("#dispBody button:has-text('🎵 Music desk')"); await p.waitForTimeout(800);
ok(/Activity log · Music desk/.test(await p.evaluate(() => document.getElementById("dispTitle").textContent)), "tap a desk to see only its work");
await say("what failed today");
ok(/Today/.test(await spoken()) && /failed|Nothing failed/.test(await spoken()), "“what failed today” answers out loud", await spoken());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
