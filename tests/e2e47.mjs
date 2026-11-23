// Phone: Max’s brain card — studied count, exam, “Please check” list with Change/Leave buttons, Study now.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const seen = [], days = [];
let brainAsked = [];
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.includes("generativelanguage")) { const q = JSON.parse(o.body).contents.at(-1).parts[0].text; brainAsked.push(q);
    const action = /where should i put my money/i.test(q) ? { type: "home_dash", details: { name: "guide" } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Here." : "Answer to: " + q, action }) }] } }] })); }
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
const reqs = [];
let status = { total: 3, studied: 2, left: 1, maritime: { total: 3, studied: 2 }, exam: { count: 4, score: 88, gaps: [{ title: "MARPOL", q: "What is Annex I?" }] }, links: 5,
  checks: [{ id: "n1", i: 0, title: "SOLAS", quote: "drills every 6 months", why: "SOLAS requires monthly drills", suggest: "drills every month", source: "https://www.imo.org/solas", state: "check" }],
  fixed: [{ id: "n2", i: 0, title: "COLREG", quote: "Rule 5 look-out", fixed: "Rule 5 lookout", source: "https://www.imo.org/colreg", state: "fixed" }],
  usage: { day: "2026-11-23", calls: { groq: 4, gemini: 2 }, fails: {}, gemini: 2, geminiCap: 40 }, providers: ["groq", "cloudflare", "gemini"], last: Date.now() - 3600e3, mapChars: 2400 };
await p.route("**/api/brain/**", async r => { const u = r.request().url(), m = r.request().method(); reqs.push(m + " " + u.split("/api/")[1] + " " + (r.request().postData() || ""));
  if (u.includes("/status")) return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(status) });
  if (u.includes("/study-now")) { status = { ...status, studied: 3, left: 0 }; return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ units: 1, studied: 1, left: 0, checked: 0, status }) }); }
  status = { ...status, checks: [] }; return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ ok: true }) }); });
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1500);
await p.evaluate(() => window.maxOpenDrawer("L")); await p.waitForTimeout(800);
const tile = await p.locator("#tileBrain").textContent();
ok(/2\/3/.test(tile) && /exam 88%/.test(tile) && /1 for you to check/.test(tile), "the brain card shows 2/3 studied, the exam score and what to check", tile);
await p.click("#tileBrain"); await p.waitForTimeout(800);
let body = await p.locator("#dashFullBody").textContent();
ok(/2 of 3 notes studied/.test(body) && /88% · 4 questions/.test(body) && /Connectionsbetweennotes5/.test(body.replace(/\s+/g, "")) && /Please check \(1\)/.test(body) && /drills every 6 months/.test(body) && /Fixed by Max \(1\)/.test(body) && /Max could not answer/.test(body), "overview: progress, exam, links, Please check, Fixed by Max, gaps", body.slice(0, 500));
await p.click('[data-brain="apply"]'); await p.waitForTimeout(900);
ok(reqs.some(x => /POST brain\/resolve .*"action":"apply".*"id":"n1"|POST brain\/resolve .*"id":"n1".*"action":"apply"/.test(x)), "“Change it” sends the OK to the server", reqs.join(" | "));
body = await p.locator("#dashFullBody").textContent(); ok(!/Please check \(/.test(body), "…and it leaves the list", body.slice(0, 300));
await p.click('[data-brain="study"]'); await p.waitForTimeout(1200);
ok(reqs.some(x => /POST brain\/study-now/.test(x)), "“Study now” runs a study burst", reqs.join(" | "));
body = await p.locator("#dashFullBody").textContent(); ok(/3 of 3 notes studied/.test(body), "…and the card now shows 3 of 3", body.slice(0, 200));
await p.evaluate(() => window.maxCloseDrawer && 0); await p.click("#dashFullClose"); await p.waitForTimeout(300);
ok(errs.length === 0, "no script errors", errs.join("|"));
await b.close(); sW.close(); sP.close(); console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
