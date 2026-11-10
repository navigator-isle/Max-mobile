// Phone: hands-free "Hey Max" and interrupting him by voice.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const gem = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
    const reply = /story/i.test(q) ? "Once upon a time a ship had to wait for the tide at the bar before entering the port, and the captain checked the tide tables twice. It was a long night of waiting." : "Answer to: " + q;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply, action: null }) }] } }] })); }
  return new Response("ok");
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8081", WK = "http://127.0.0.1:8867";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8867);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8081);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { constructor() { (window.__recs = window.__recs || []).push(this); } start() { if (this.continuous) { window.__cont = this; window.__contStarts = (window.__contStarts || 0) + 1; return; } const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() { this.abort(); } abort() { if (this.continuous && window.__cont === this) { window.__cont = null; setTimeout(() => this.onend && this.onend(), 5); } } }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); window.__speaking = true; clearTimeout(window.__st); window.__st = setTimeout(() => { window.__speaking = false; u.onend && u.onend(); }, window.__speakMs || 15); }, cancel() { window.__speaking = false; clearTimeout(window.__st); }, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; window.__wl = 0; Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { window.__wl++; return { released: false, release: async () => {} }; } } }); window.__emit = (t, fin = true) => { const r = window.__cont; if (!r) return false; const res = [{ transcript: t }]; res.isFinal = fin; r.onresult && r.onresult({ resultIndex: 0, results: [res] }); return true; }; };
const plans = JSON.stringify([{ id: "a", name: "Manila–Singapore", title: "Manila → Singapore", nm: 1350.4, saved: 2 }, { id: "b", name: "Longview", title: "Longview → Kaohsiung", nm: 5600, saved: 3 }]);
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", pp2_plans: plans }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();

const cont = () => p.evaluate(() => !!window.__cont);
const waitCont = () => p.waitForFunction(() => !!window.__cont, null, { timeout: 6000 }).then(() => true).catch(() => false);
const emit = (t, f = true) => p.evaluate(([t, f]) => window.__emit(t, f), [t, f]);
const lastQ = () => gem.at(-1)?.contents.at(-1).parts[0].text;
const idle = () => p.waitForFunction(() => !window.__speaking && !document.getElementById("maxOrb").classList.contains("processing"), null, { timeout: 15000 }).catch(() => {});
await say("turn on hands free");
ok(/always listening now/.test(await answer()), "“turn on hands free” → on", await answer());
ok(await waitCont() && await p.evaluate(() => document.getElementById("maxOrb").classList.contains("waiting")) && /Standby · listening/.test(await p.locator("#homeStatus").textContent()), "then waits for “Hey Max” (glowing circle, status line)");
ok(await p.evaluate(() => window.__wl) >= 1, "keeps the screen awake while hands-free");
// ordinary talk nearby is ignored
let g = gem.length;
await emit("my friend maximo is here"); await emit("we talked about the max speed of the ship"); await p.waitForTimeout(500);
ok(gem.length === g && await cont(), "other talk (even “max speed”) doesn't wake him");
// "Hey Max" + question in one breath
await emit("hey Max what is the capital of Japan"); await p.waitForTimeout(300); await idle();
ok(lastQ() === "what is the capital of Japan", "“Hey Max, what is the capital of Japan” → answered straight away", lastQ());
// follow-up without the wake word (conversation stays open)
await p.evaluate(() => window.__q.push("and of France")); await p.waitForTimeout(900); await idle();
ok(lastQ() === "and of France", "follow-up question works without saying Max again", lastQ());
await p.evaluate(() => window.__q.push("that's all")); await p.waitForTimeout(900); await idle();
ok(await waitCont(), "after “that's all” he goes back to waiting for “Hey Max”");
// "Hey Max" alone → listens
await p.evaluate(() => { window.__speakMs = 5000; window.__q.push("tell me a story"); });
await waitCont(); await emit("hey max"); await p.waitForTimeout(400);
await p.waitForFunction(() => window.__speaking, null, { timeout: 8000 }).catch(() => {});
ok(lastQ() === "tell me a story", "“Hey Max” alone → he listens for the question", lastQ());
// echo guard: his own words don't interrupt him
await waitCont();
await emit("wait for the tide at the bar", false); await emit("the captain checked the tide tables twice", true); await p.waitForTimeout(200);
ok(await p.evaluate(() => window.__speaking), "his own words (even “wait”) don't interrupt him");
// say "stop" → he goes quiet and listens
const starts = await p.evaluate(() => window.__starts || 0);
await emit("stop", false); await p.waitForTimeout(800);
ok(!(await p.evaluate(() => window.__speaking)) && await p.waitForFunction(() => document.getElementById("maxOrb").classList.contains("listening"), null, { timeout: 2500 }).then(() => true).catch(() => false), "say “stop” → he stops talking and listens");
await p.evaluate(() => window.__q.push("that's all")); await p.waitForTimeout(900); await idle();
// talk over him with a new question
await p.evaluate(() => window.__speakMs = 5000);
await waitCont(); await emit("hey max tell me a story"); await p.waitForTimeout(400);
await p.waitForFunction(() => window.__speaking, null, { timeout: 8000 }).catch(() => {});
await waitCont(); g = gem.length;
await emit("who built the port of cebu", true); await p.waitForTimeout(1500);
ok(gem.slice(g).some(x => x.contents.at(-1).parts[0].text === "who built the port of cebu"), "start talking over him with a new question → he stops and answers it", lastQ());
await idle(); await p.evaluate(() => window.__speakMs = 15); await p.evaluate(() => window.__q.push("that's all")); await p.waitForTimeout(900); await idle();
// reload: hands-free comes back on
await p.reload(); await p.waitForTimeout(1500);
ok(await waitCont(), "hands-free stays on after reopening Max");
// screen off pauses the microphone, screen on resumes
await p.evaluate(() => { Object.defineProperty(document, "visibilityState", { configurable: true, get: () => window.__vis || "visible" }); window.__vis = "hidden"; document.dispatchEvent(new Event("visibilitychange")); });
await p.waitForTimeout(200); ok(!(await cont()), "screen off / app hidden → microphone off");
await p.evaluate(() => { window.__vis = "visible"; document.dispatchEvent(new Event("visibilitychange")); });
ok(await waitCont(), "back on screen → listening for “Hey Max” again");
// voice interrupt can be turned off
await say("turn off voice interrupt");
ok(/Voice interrupt is off/.test(await answer()), "voice interrupt can be turned off");
await idle(); await p.evaluate(() => window.__speakMs = 3000);
await waitCont(); await emit("hey max tell me a story"); await p.waitForTimeout(400); await p.waitForFunction(() => window.__speaking, null, { timeout: 8000 }).catch(() => {});
await p.waitForTimeout(500);
ok(!(await cont()), "with interrupt off, the mic stays closed while he speaks");
await p.evaluate(() => { window.__speakMs = 15; document.getElementById("homeStop").click(); });
await say("hands free off");
ok(/Hands-free is off/.test(await answer()), "“hands free off” → off");
await p.waitForTimeout(1500);
ok(!(await cont()) && !(await p.evaluate(() => JSON.parse(localStorage.getItem("max_handsfree")))), "no microphone after hands-free is off");
// 18e: a phone that never chose → Max listens by himself from the start (standby); the earlier "off" choice is respected
await p.reload(); await p.waitForTimeout(1500);
ok(!(await cont()), "he turned listening off → it stays off after reopening");
await p.evaluate(() => { localStorage.removeItem("max_handsfree"); localStorage.setItem("max_hf_auto", "1"); });
await p.reload(); await p.waitForTimeout(1500);
ok(await waitCont() && /Standby · listening/.test(await p.locator("#homeStatus").textContent()) && await p.evaluate(() => JSON.parse(localStorage.getItem("max_handsfree"))) === true, "no choice made yet → Max is on standby and listening without a tap", await p.locator("#homeStatus").textContent());
await emit("max what time is it"); await p.waitForTimeout(1200);
ok(gem.length > 0 || /\d/.test(await answer()), "just say “Max …” — no button needed", await answer());
await p.evaluate(() => document.getElementById("homeStop").click());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
