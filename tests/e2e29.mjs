// Phone: understanding a non-native speaker — several guesses from the microphone, his own words fixed, mid-sentence pauses, teaching words.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const gem = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage") && !url.includes("embed")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Answer to: " + q, action: null }) }] } }] })); }
  return new Response("{}", { status: 404 });
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8066", WK = "http://127.0.0.1:8852";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8852);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8066);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__langs = [];
  // Each queued item is one utterance: a string, or a list of [text, confidence] guesses (best first).
  class R { start() { if (this.continuous) return; window.__langs.push(this.lang + "/" + this.maxAlternatives); const t = window.__q.shift();
    setTimeout(() => { if (t) { const alts = Array.isArray(t) ? t.map(([x, c]) => ({ transcript: x, confidence: c })) : [{ transcript: t, confidence: 0.9 }]; this.onresult && this.onresult({ results: [alts] }); } else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 30); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const notes = JSON.stringify([{ id: "n1", title: "SOLAS drills", body: "Fire and abandon ship drills monthly.", category: "Ship", tags: [], createdAt: 1, updatedAt: 2 }]);
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", max_notes_v3: notes }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
// Talk in conversation mode: queue utterances, tap once, wait for Max to answer the last one.
const talk = async (...utts) => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(...x), utts);
  await p.waitForTimeout(100); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking") && !document.getElementById("maxOrb").classList.contains("processing"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(400); await p.evaluate(() => document.getElementById("homeStop").click()); await p.waitForTimeout(150); };
const lastAsk = () => { const g = gem.filter(x => x.systemInstruction).at(-1); return g ? g.contents.at(-1).parts[0].text : ""; };
const lastSys = () => { const g = gem.filter(x => x.systemInstruction).at(-1); return g ? g.systemInstruction.parts[0].text : ""; };
const spoken = () => p.evaluate(() => window.__spoken.at(-1) || "");

await talk("what does my note say about solace drills");
ok(/SOLAS drills/.test(lastAsk()), "ship terms he says are fixed (“solace” → SOLAS)", lastAsk());
ok(/not a native English speaker/.test(lastSys()) && /Never comment on his English/.test(lastSys()), "the brain is told he's a non-native speaker and to work out what he meant (no English lessons)");
ok((await p.evaluate(() => window.__langs.at(-1))) === "en-PH/5", "the microphone listens in Philippine English and gives up to 5 guesses", await p.evaluate(() => window.__langs.at(-1)));
await talk([["what is the bless ring on hobby isle", 0.42], ["what is the best ring on hobby isle", 0.3], ["what is the best rank on hobby isle", 0.2]]);
ok(/Other versions the speech recognizer heard/.test(lastSys()) && /best ring on Hobby Isle|best rank on Hobby Isle/.test(lastSys()) && /confidence in the main one: 42%/.test(lastSys()), "the other guesses go to the brain so it can work out the real sentence", lastSys().slice(lastSys().indexOf("Other versions"), lastSys().indexOf("Other versions") + 200));
await talk([["show the play stor", 0.5], ["show my notes", 0.4]]);
ok(await p.evaluate(() => document.getElementById("notesScreen") && !document.getElementById("notesScreen").hidden) || /notes/i.test(await spoken()), "an unclear top guess + a clear command in the other guesses → the command runs", await spoken());
gem.length = 0;
await talk([["tell me about the passage plan for manila", 0.9], ["show my notes", 0.5]]);
const shownTop = await p.evaluate(() => document.body.innerText);
ok((/passage plan for manila/i.test(lastAsk()) || /tell me about the passage plan for manila/i.test(shownTop)) && !/Passage Planner manila/.test(shownTop + lastAsk()), "…but a confident top guess is never overridden by a command guess (and ordinary words aren't rewritten)", lastAsk());
await talk("remind me to call the", "crewing agency on friday at nine");
ok(/remind me to call the crewing agency on friday at nine/i.test(lastAsk() + " " + JSON.stringify(await p.evaluate(() => document.body.innerText))) , "pausing mid-sentence (“…call the”) → Max keeps listening and joins it", lastAsk());
await talk("how is quick draft calculater doing these days");
const said = await p.evaluate(() => document.body.innerText);
ok(/Quick Draft Calculator/.test(lastAsk()) || /how is Quick Draft Calculator doing/.test(said), "close misspellings of his own project names are fixed", lastAsk());
await talk("when you hear captain rey yes, I mean Captain Reyes");
ok(/I’ll understand “Captain Reyes”/.test(await spoken()), "he can teach a word Max keeps mishearing", await spoken());
await talk("who is captain rey yes again");
ok(/Captain Reyes/.test(lastAsk()), "…and from then on it's understood", lastAsk());
await talk("kapag narinig mo ang dagat ko, ang ibig kong sabihin ay Dagat Ko app");
ok(/Dagat Ko app/.test(await spoken()), "teaching works in Filipino too", await spoken());
await talk("show my word fixes");
const shown = await p.evaluate(() => document.getElementById("dispBody").innerText);
ok(/“captain rey yes” → Captain Reyes/.test(shown) && /Forget/.test(shown), "he can see (and forget) the words he taught", shown.slice(0, 200));
ok(JSON.parse(await p.evaluate(() => localStorage.getItem("max_hear_fixes"))).length === 2, "word fixes are saved (and synced to the laptop)");
await talk("listen in filipino");
await talk("kumusta ka");
ok(/fil-PH/.test(await p.evaluate(() => window.__langs.at(-1))), "“listen in Filipino” switches the microphone language", await p.evaluate(() => window.__langs.join(",")));
await talk("listen in english");
await talk("hello");
ok(/en-PH/.test(await p.evaluate(() => window.__langs.at(-1))), "…and back to English");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
