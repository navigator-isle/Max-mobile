// Phone: 🎧 My songs — his own music copied into Max (no ads, instant), and music that pauses for the mic instead of fighting it.
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
const ORIGIN = "http://127.0.0.1:8066", WK = "http://127.0.0.1:8852";
const sqlite = new DatabaseSync(":memory:");
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GROQ_API_KEY: "g" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8852);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8066);
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

let ytSearches = 0; const _f = globalThis.fetch; globalThis.fetch = async (u, o) => { if (String(u).startsWith("https://www.youtube.com/results?")) ytSearches++; return _f(u, o); };
const cur = () => p.evaluate(() => { const x = window.__audio.at(-1); return x ? { src: x.src, paused: x.paused } : null; });
const showing = () => p.evaluate(() => document.getElementById("dispBody")?.textContent || "");
// 1) empty library
await say("my songs");
ok(/My songs is empty/.test(await spoken()) && /Add songs from phone/.test(await showing()), "“my songs” opens My songs (empty at first) with an Add button", await spoken());
// 2) add three songs from the phone (file picker)
const mk = n => ({ name: n, mimeType: "audio/mpeg", buffer: Buffer.alloc(4096, n.length) });
const [chooser] = await Promise.all([p.waitForEvent("filechooser"), p.locator("#dispBody button", { hasText: "Add songs from phone" }).click()]);
ok(chooser.isMultiple(), "the picker lets him choose many songs at once");
await chooser.setFiles([mk("Ben&Ben - Maybe the Night.mp3"), mk("Moira Dela Torre - Paubaya.mp3"), mk("03 IV of Spades - Mundo.mp3"), { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("x") }]);
await p.waitForFunction(() => JSON.parse(localStorage.getItem("max_my_songs") || "[]").length === 3, null, { timeout: 5000 }).catch(() => {});
const lib = await p.evaluate(() => JSON.parse(localStorage.getItem("max_my_songs") || "[]"));
ok(lib.length === 3 && lib.some(x => x.title === "Mundo" && x.artist === "IV of Spades") && lib.some(x => x.title === "Maybe the Night" && x.artist === "Ben&Ben"), "3 songs saved with title & artist from the file names (the .txt is ignored)", JSON.stringify(lib.map(x => [x.artist, x.title])));
ok(/🎧 My songs — 3 songs/.test(await showing()) && /Mundo — IV of Spades/.test(await showing()), "My songs lists them");
// 3) play by name → his own copy, not YouTube
await say("play Mundo");
let a = await cur();
ok(a && /^blob:/.test(a.src) && /🎧 Mundo · IV of Spades/.test(await title()) && ytSearches === 0, "“play Mundo” plays his own song (no YouTube, no ads)", JSON.stringify(a) + " " + await title() + " yt:" + ytSearches);
ok(/^Playing Mundo by IV of Spades/.test(await spoken()), "Max says what's playing", await spoken());
await p.waitForTimeout(1600);
ok(!(await cur()).paused, "the song plays right after Max answers (he stops listening so music starts at once)");
// 4) talking pauses the song (no mic fight), and it comes back
await p.evaluate(() => document.getElementById("maxOrb").classList.add("listening")); await p.waitForTimeout(200);
ok((await cur()).paused, "when he talks to Max the song pauses (not just quieter)");
await p.evaluate(() => document.getElementById("maxOrb").classList.remove("listening")); await p.waitForTimeout(1700);
ok(!(await cur()).paused, "…and comes back by itself when he's done");
// 5) artist name, "play my music", shuffle
await say("play Ben&Ben");
ok(/Maybe the Night/.test(await title()) && ytSearches === 0, "“play Ben&Ben” finds the artist in My songs first", await title());
await say("shuffle my songs");
ok(/^Playing 3 of your songs/.test(await spoken()), "“shuffle my songs” plays all of them", await spoken());
await say("next song");
ok(/🎧/.test(await title()) && !(await cur()).paused, "“next song” goes to the next of his songs", await title());
await say("what song is this");
ok(/from My songs/.test(await spoken()), "“what song is this” knows it's his own song", await spoken());
// 6) not in the library → YouTube as before, with a one-time tip about ads
await say("play Sponge Cola");
ok(ytSearches === 1 && /YouTube may show ads/.test(await spoken()), "a song he doesn't have → YouTube, with a one-time tip about ads", await spoken());
await say("play Moira");
ok(/Paubaya/.test(await title()), "back to his own song when he has it", await title());
// 7) hands-free doesn't listen over music
await p.evaluate(() => localStorage.setItem("max_handsfree", "true"));
await say("hands-free on"); await p.waitForTimeout(2600);
ok(!/say “Hey Max”/.test(await p.evaluate(() => document.getElementById("statusText")?.textContent || document.body.innerText.slice(0, 2000))) || !(await cur()).paused, "hands-free waits while music plays (no mic fighting the speaker)");
await say("stop the music");
ok(!(await vis("#musicBar")), "“stop the music” stops it");
// 8) still there after closing Max
await p.reload(); await p.waitForTimeout(1500);
await say("play my music");
a = await cur();
ok(a && /^blob:/.test(a.src) && /^Playing 3 of your songs/.test(await spoken()), "after reopening Max, his songs are still there and play", await spoken());
ok(!errs.length, "no page errors", errs.join(" | "));
await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
