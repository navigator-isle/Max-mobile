// Phone: 📈 Max improves card — register, audit, examiner rules, stop/start/continue, decision journal score, two-AI check.
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
const ORIGIN = "http://127.0.0.1:8076", WK = "http://127.0.0.1:8875";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8875);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8076);
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
const ovTap = async s => { await p.evaluate(() => document.querySelector("#ovRail [data-ov]").click()); await p.waitForTimeout(450); await p.click(s); };
const reqs = [];
const data = { nc: { open: [{ text: "Paper trading hasn't checked crypto since #", status: "corrective", first: "2026-11-20", days: 3, repeats: 1, action: "Max rotates sources" }], closed: [{ text: "Old error", closedAt: "2026-11-22" }], repeats: 1 },
  audit: { day: "2026-11-23", days: 7, done: 40, failed: 3, newNc: ["X"], closed: ["Y"], repeats: ["Z"], open: [], verdict: "Not satisfactory: 1 error(s) came back after being closed." },
  deck: [{ day: "2026-11-23", done: 9, failed: 1, failures: ["trading: crypto failed"], jobErrors: [] }], exam: { at: Date.now(), sampled: 20, ok: 18, wrong: 1, unsupported: 1, rulesAdded: 1, grader: "Claude" },
  rules: [{ rule: "Say the report is due within 5 days.", note: "CFR Guide" }], ssc: { at: Date.now(), stop: [{ what: "Overlap: Websites and Apps", why: "Both check security." }], start: [], keep: [{ what: "Trading", why: "ok" }] }, claudeGrader: false,
  calls: [{ area: "crypto", name: "Crypto", n: 12, right: 5, pct: 42, pnl: -3, open: 2, label: "poor, treat as noise" }, { area: "pse", name: "Philippine stocks", n: 3, right: 2, pct: 67, pnl: 4, open: 1, label: "too early (3 of 10 results)" }],
  twoAi: { checks: 4, agree: 3, disagree: 1, recent: [{ q: "deadline for the report?", differences: ["5 days versus 24 hours"] }] } };
await p.route("**/api/improve**", async r => { const u = r.request().url(), m = r.request().method(); reqs.push(m + " " + u.split("/api/")[1] + " " + (r.request().postData() || ""));
  return r.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(data) }); });
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1500);
await p.evaluate(() => window.maxOpenDrawer("L")); await p.waitForTimeout(800);
const tile = await p.locator("#tileImprove").textContent();
ok(/1/.test(tile) && /open finding/.test(tile) && /1 rule learned/.test(tile) && /came back after closing/.test(tile), "the card tile shows open findings, rules and repeats", tile);
await p.evaluate(() => window.maxShowFull("improve")); await p.waitForTimeout(800);
let body = await p.locator("#dashFullBody").textContent();
ok(/Not satisfactory/.test(body) && /REPEAT/.test(body) && /Paper trading hasn't checked crypto/.test(body) && /Say the report is due within 5 days/.test(body), "audit verdict, REPEAT flag and learned rule are shown", body.slice(0, 300));
ok(/Crypto/.test(body) && /42% right of 12/.test(body) && /poor, treat as noise/.test(body) && /too early \(3 of 10 results\)/.test(body), "decision journal shows the score per area and says too early when under 10", body);
ok(/4 checked/.test(body) && /1 disagreed/.test(body) && /5 days versus 24 hours/.test(body), "two-AI check totals and the last disagreement are shown");
ok(/Overlap: Websites and Apps/.test(body) && /Stop/.test(body) && /Continue/.test(body), "stop / start / continue list is shown");
await p.click('[data-imp="exam"]'); await p.waitForTimeout(900);
ok(reqs.some(x => /POST improve\/run .*"what":"exam"/.test(x)), "“Grade now” asks the server to run the examiner", reqs.join(" | "));
ok(errs.length === 0, "no script errors", errs.join("|"));
await b.close(); sW.close(); sP.close(); console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
