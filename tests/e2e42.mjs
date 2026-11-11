// Phone: notes Max researches — 'create a note about X' gives a full researched draft; 'update my X note with …' researches and edits it, with undo. (was: home panels — live paper trading and the investment guide, folded on the home screen. — “how much was LTC on November 5 2025” gets the exact number from the source, on screen and spoken.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const seen = [], days = [];
let brainAsked = [];
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body), q = b.contents.at(-1).parts.map(x => x.text || "").join("\n"); brainAsked.push(q);
    const SRC = { groundingChunks: [{ web: { title: "IMO", uri: "https://www.imo.org/en/polar" } }] };
    let text;
    if (/NEW reference note/.test(q)) text = "FOLDER: Maritime › IMO › Codes\nTITLE: Polar Code\n---NOTE---\n**What is the Polar Code**\nThe International Code for Ships Operating in Polar Waters, mandatory under SOLAS chapter XIV and MARPOL since 1 January 2017.\n**Applies to**\n- Ships certified under SOLAS operating in Arctic and Antarctic waters\n- Needs a Polar Ship Certificate and a Polar Water Operational Manual\n**Key Point**\nRead the PWOM before entering polar waters.";
    else if (/wants to change his note/.test(q)) text = "CHANGES: added fishing vessel guidelines\n---NOTE---\n**What is the Polar Code**\nThe International Code for Ships Operating in Polar Waters, mandatory under SOLAS chapter XIV and MARPOL since 1 January 2017.\n**Applies to**\n- Ships certified under SOLAS operating in Arctic and Antarctic waters\n- Needs a Polar Ship Certificate and a Polar Water Operational Manual\n**Fishing vessels**\n- Non-SOLAS ships: voluntary safety measures adopted in 2021 (FISHING_MARKER)\n**Key Point**\nRead the PWOM before entering polar waters.";
    else text = JSON.stringify({ reply: "Okay.", action: null });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, groundingMetadata: SRC }] })); }
  return new Response("{}", { status: 404 }); };
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8075", WK = "http://127.0.0.1:8874";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8874);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8075);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();


const notes = () => p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3") || "[]").filter(n => !n.deleted));
await say("create a note about the Polar Code");
await p.waitForTimeout(800);
let ns = await notes(), polar = ns.find(n => n.title === "Polar Code");
ok(polar && polar.category === "Maritime › IMO › Codes" && /What is the Polar Code/.test(polar.body) && polar.source === "research" && polar.sources?.length === 1, "“create a note about X” → a full researched draft, filed in the right folder", JSON.stringify(ns.map(n => [n.title, n.category])).slice(0, 300));
ok(brainAsked.some(q => /NEW reference note/.test(q) && /Polar Code/.test(q)), "Max searched first (the research prompt was used)");
ok(/ready under Maritime › IMO › Codes/.test(await p.evaluate(() => window.__spoken.join(" | "))), "Max says the draft is ready and where it is", await p.evaluate(() => window.__spoken.slice(-2).join(" | ")));
await say("update my polar code note with the rules for fishing vessels");
await p.waitForTimeout(800);
polar = (await notes()).find(n => n.title === "Polar Code");
ok(/FISHING_MARKER/.test(polar.body) && polar.history?.length === 1 && /What is the Polar Code/.test(polar.history[0].body) && !/FISHING_MARKER/.test(polar.history[0].body), "“update my X note with …” → researched edit; the old version is kept", JSON.stringify(polar).slice(0, 300));
ok(brainAsked.some(q => /wants to change his note "Polar Code"/.test(q) && /fishing vessels/.test(q)), "the edit asked for exactly what Mark said");
await say("undo note change");
await p.waitForTimeout(400);
polar = (await notes()).find(n => n.title === "Polar Code");
ok(!/FISHING_MARKER/.test(polar.body) && /What is the Polar Code/.test(polar.body), "“undo note change” puts the old version back");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
