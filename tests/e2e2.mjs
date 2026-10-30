// New: hands-free conversation loop, end words, interrupt, typing, memory badge, settings scroll.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import { DatabaseSync } from "node:sqlite"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const gem = [];
globalThis.fetch = async (u, o) => { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
  const remember = /my wife/i.test(q) ? ["Mark's wife is called Liza"] : [];
  const reply = /wife/i.test(q) && /Liza/.test(b.systemInstruction.parts[0].text) ? "Your wife is Liza." : "Answer to: " + q;
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply, remember }) }] } }] })); };
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8011";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite) };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request("http://127.0.0.1:8797" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8797);
const sP = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": q.url.includes("sw.js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(q.url.includes("sw.js") ? pagePath.replace(/index\.html$/, "sw.js") : pagePath)); }).listen(8011);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__starts = 0; window.__listening = false;
  class R { start() { window.__starts++; window.__listening = true; const t = window.__q.shift();
      if (window.__speaking) window.__heardWhileSpeaking = true;
      setTimeout(() => { window.__listening = false; if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 120); }
    stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); window.__speaking = true; u.onstart && u.onstart(); setTimeout(() => { window.__speaking = false; u.onend && u.onend(); }, window.__speakMs || 150); }, cancel() { window.__speaking = false; }, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
async function phone(seed) { const ctx = await b.newContext({ ...devices["Pixel 7"] });
  await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); }, [seed, mock.toString()]);
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message)); await p.goto(ORIGIN + "/"); await p.waitForTimeout(800); return { ctx, p, errs }; }
const seed = { jarvis_api_base_v2: "http://127.0.0.1:8797", max_pass: "pw" };
const st = p => p.locator("#homeStatus").textContent();

let { ctx, p, errs } = await phone(seed);
ok((await p.locator("#globalStatus").textContent()) === "Connected · memory on", "connected with memory");
// One tap, three turns, no more taps
await p.evaluate(() => window.__q.push("Good morning Max", "My wife is Liza by the way", "What is my wife's name?"));
await p.click("#maxOrb");
ok((await p.locator("#homeTalk").textContent()).includes("Conversation on"), "one tap turns conversation on");
await p.waitForFunction(() => window.__spoken.includes("Your wife is Liza."), null, { timeout: 15000 }).catch(() => {});
const spoken = await p.evaluate(() => window.__spoken);
ok(spoken.includes("Answer to: Good morning Max") && spoken.includes("Your wife is Liza."), "3 turns answered hands-free with a single tap", JSON.stringify(spoken));
ok(!(await p.evaluate(() => window.__heardWhileSpeaking)), "Max never listens while he is speaking");
ok(sqlite.prepare("SELECT count(*) c FROM max_memories WHERE text LIKE '%Liza%'").get().c === 1, "fact from normal talk saved automatically");
ok(gem.every(g => g.systemInstruction.parts[0].text.includes("spoken conversation")), "voice turns use short spoken replies");
// Silence → stands by
await p.waitForFunction(() => /Standing by/.test(document.getElementById("homeStatus").textContent), null, { timeout: 8000 }).catch(() => {});
ok(/Standing by/.test(await st(p)) && !(await p.locator("#homeTalk").textContent()).includes("on"), "silence ends conversation politely", await st(p));
// End word
await p.evaluate(() => window.__q.push("Hello again", "that's all"));
await p.click("#maxOrb"); await p.waitForTimeout(2000);
ok((await p.evaluate(() => window.__spoken.at(-1))).includes("I’ll be here") && !(await p.locator("#homeTalk").textContent()).includes("on"), "saying \"that's all\" ends the conversation");
const startsAfterEnd = await p.evaluate(() => window.__starts); await p.waitForTimeout(1200);
ok(startsAfterEnd === await p.evaluate(() => window.__starts), "no more listening after the conversation ends");
ok(gem.at(-1).contents.at(-1).parts[0].text === "Hello again", "end words are not sent to the AI");
// Tagalog end word
await p.evaluate(() => window.__q.push("tama na")); await p.click("#maxOrb"); await p.waitForTimeout(800);
ok(!(await p.locator("#homeTalk").textContent()).includes("on"), "\"tama na\" also ends it");
// Interrupt by tapping the circle while he speaks
await p.evaluate(() => { window.__speakMs = 4000; window.__q.push("Tell me a long story", "Never mind, what time is it"); });
await p.click("#maxOrb"); await p.waitForFunction(() => window.__speaking, null, { timeout: 5000 });
await p.click("#maxOrb"); await p.waitForTimeout(700);
ok(gem.at(-1).contents.at(-1).parts[0].text.startsWith("Never mind"), "tap the circle to interrupt Max and speak");
await p.evaluate(() => document.getElementById("homeStop").click()); await p.evaluate(() => window.__speakMs = 150);
// Typing
await p.click("#maxOrb",{button:"right"}); await p.click('[data-go=keyboard]'); await p.fill("#typeInput", "Typed question here"); await p.press("#typeInput", "Enter"); await p.waitForTimeout(900);
ok((await p.locator("#homeAnswer").textContent()) === "Answer to: Typed question here" && gem.at(-1).systemInstruction.parts[0].text.indexOf("spoken conversation") === -1, "typing works (full-length replies)");
// Settings fit the phone, Close reachable
await p.click("#openConnection"); await p.waitForTimeout(500);
await p.locator("#talkForget").scrollIntoViewIfNeeded();
ok(await p.locator("#talkForget").isVisible(), "settings window scrolls to the bottom");
await p.locator("#closeConnection").scrollIntoViewIfNeeded(); await p.click("#closeConnection");
ok(await p.locator("#connectionModal").isHidden(), "Close button reachable");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await p.screenshot({ path: process.env.SHOT_DIR + "/home-convo.png" });
await ctx.close();

// Restart: continues the conversation
({ ctx, p, errs } = await phone(seed));
await p.click("#maxOrb",{button:"right"}); await p.click('[data-go=keyboard]'); await p.fill("#typeInput", "What did we talk about?"); await p.press("#typeInput", "Enter"); await p.waitForTimeout(900);
ok(gem.at(-1).contents.some(c => c.parts[0].text.includes("Typed question here")), "after closing the app, Max still has the earlier conversation");
await p.click("#openConnection"); await p.locator("#talkForget").scrollIntoViewIfNeeded();
p.on("dialog", d => d.accept().catch(() => {})); await p.click("#talkForget"); await p.waitForTimeout(600);
ok(sqlite.prepare("SELECT count(*) c FROM max_talk").get().c === 0 && sqlite.prepare("SELECT count(*) c FROM max_memories").get().c === 1, "Forget conversations clears talk, keeps memory");
await p.screenshot({ path: process.env.SHOT_DIR + "/settings-new.png" });
await ctx.close();

// Microphone blocked → clear message, no loop
({ ctx, p, errs } = await phone(seed));
await p.evaluate(() => { window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { window.__starts++; setTimeout(() => { this.onerror({ error: "not-allowed" }); this.onend(); }, 50); } abort() {} }; });
await p.click("#maxOrb"); await p.waitForTimeout(800);
ok(/Microphone is blocked/.test(await st(p)) && (await p.evaluate(() => window.__starts)) === 1, "blocked microphone: clear message, no retry loop", await st(p));
await ctx.close();
await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
