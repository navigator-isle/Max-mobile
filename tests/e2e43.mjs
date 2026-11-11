// Phone: offline — Max finds the exact part of a note without internet, and his offline brain (on-phone AI) explains it. (was: home panels — live paper trading and the investment guide, folded on the home screen. — “how much was LTC on November 5 2025” gets the exact number from the source, on screen and spoken.
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
const ORIGIN = "http://127.0.0.1:8076", WK = "http://127.0.0.1:8875";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8875);
const dir = path.dirname(pagePath);
const FAKE_WEBLLM = `export const calls = []; self.__webllm = calls;
export async function CreateMLCEngine(model, o) { calls.push({ load: model }); for (const p of [0.25, 0.5, 1]) o?.initProgressCallback?.({ progress: p, text: "[x] Fetching param cache " + p * 100 + "%" });
  return { unload: async () => {}, chat: { completions: { create: async ({ messages }) => { const u = messages.at(-1).content; calls.push({ sys: messages[0].content, user: u });
    const t = (u.match(/### ([^\\n—]+)/) || [])[1]; return { choices: [{ message: { content: t ? "OFFLINE-AI from " + t.trim() : "OFFLINE-AI general" } }] }; } } } }; }
export async function deleteModelAllInfoInCache(m) { calls.push({ del: m }); }`;
const sP = http.createServer((q, r) => { if (q.url.split("?")[0].endsWith("/web-llm.js")) { r.writeHead(200, { "Content-Type": "text/javascript" }); r.end(FAKE_WEBLLM); return; } const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8076);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { try { Object.defineProperty(navigator, "gpu", { configurable: true, value: { requestAdapter: async () => ({ features: new Set(["shader-f16"]) }) } }); } catch {} window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", max_notes_v3: JSON.stringify([
 { id: "n-colreg", title: "COLREG", category: "Maritime › IMO › Conventions", tags: ["colreg"], createdAt: 1, updatedAt: 2, deleted: false,
   body: "<p><b>COLREG 1972</b></p><p>International Regulations for Preventing Collisions at Sea.</p><p><b>Rule 5 — Look-out</b></p><p>Every vessel shall at all times maintain a proper look-out by sight and hearing.</p><p><b>Rule 19 — Conduct of vessels in restricted visibility</b></p><p>Every vessel shall proceed at a safe speed adapted to the prevailing circumstances and conditions of restricted visibility. A power-driven vessel shall have her engines ready for immediate manoeuvre. RULE19MARK</p>" },
 { id: "n-drills", title: "SOLAS drills", category: "Maritime › Safety", tags: [], createdAt: 1, updatedAt: 2, deleted: false,
   body: "<p><b>Abandon ship drills</b></p><p>Every crew member shall participate in at least one abandon ship drill and one fire drill every month. DRILLMARK</p>" }]) }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();



const spoken = () => p.evaluate(() => window.__spoken.at(-1) || "");
const calls = () => p.evaluate(() => self.__webllm || []);
// 1. no offline brain yet → offline answers come straight from the right section of a note
await ctx.setOffline(true);
await say("what does rule 19 say about restricted visibility");
let s = await spoken();
ok(/Rule 19/.test(s) && /safe speed/.test(s) && !/look-out/.test(s), "offline, no AI: Max reads the exact section (Rule 19), not the whole note", s);
await say("how often is the abandon ship drill");
s = await spoken();
ok(/SOLAS drills/.test(s) && /every month/.test(s), "offline: another note’s section found", s);
await say("what is the capital of peru");
s = await spoken();
ok(/saved that and I’ll do it as soon as we’re back online/.test(s), "offline, nothing in notes → saved for when internet is back", s);
// 2. download the offline brain (needs internet)
await say("download offline brain");
s = await spoken();
ok(/need internet once/.test(s), "can’t download while offline — says so", s);
await ctx.setOffline(false);
await say("download offline brain");
await p.waitForTimeout(500);
s = await spoken();
let c = await calls();
ok(/your offline brain is on this phone/.test(s) && c.some(x => x.load === "gemma-4-E2B-it-q4f16_1-MLC") && await p.evaluate(() => JSON.parse(localStorage.getItem("max_offline_brain")).ready), "“download offline brain” → Gemma 4 downloaded and tested", s + " " + JSON.stringify(c));
ok(/Ready ✓/.test(await p.locator("#dispSub").textContent()), "download screen shows progress, then Ready");
// 3. offline again → the offline brain answers from the right note part
await ctx.setOffline(true);
await say("what does rule 19 say about restricted visibility");
s = await spoken(); c = await calls();
const q19 = c.filter(x => x.user && /rule 19/i.test(x.user)).at(-1);
ok(s === "OFFLINE-AI from COLREG — Rule 19 — Conduct of vessels in restricted visibility" || /^OFFLINE-AI from COLREG/.test(s), "offline brain answers, using the note", s);
ok(q19 && /RULE19MARK/.test(q19.user) && !/DRILLMARK/.test(q19.user) && /Never invent regulation numbers/.test(q19.sys), "it was given only the matching note part, and told not to invent numbers", q19 && q19.user.slice(0, 300));
await say("what is the capital of peru");
s = await spoken();
ok(/^OFFLINE-AI general/.test(s) && /check it with my main brain/.test(s) && /saved that/.test(s), "general question offline: answered but marked unchecked, and saved for Gemini later", s);
await say("offline brain status");
ok(/\(gemma-4-E2B-it\) is on this phone/.test(await spoken()), "status says which brain is on the phone", await spoken());
await say("remove offline brain");
ok(/Removed the offline brain/.test(await spoken()) && (await calls()).some(x => x.del) && !(await p.evaluate(() => localStorage.getItem("max_offline_brain") && JSON.parse(localStorage.getItem("max_offline_brain")))), "“remove offline brain” frees the space");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
