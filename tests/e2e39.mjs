// Phone: price on a past date — “how much was LTC on November 5 2025” gets the exact number from the source, on screen and spoken.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const seen = [], days = [];
let brainAsked = [];
const T = s => Date.UTC(...s.split("-").map((x, i) => i === 1 ? x - 1 : +x));
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); seen.push(url);
  if (url.startsWith("https://data-api.binance.vision/api/v3/klines")) return new Response(JSON.stringify([[T("2025-11-05"), "85.20000000", "89.97000000", "82.01000000", "89.39000000", "1"]]));
  if (url.startsWith("https://edge.pse.com.ph/autoComplete")) return new Response(JSON.stringify([{ cmpyId: "599", cmpyNm: "SM Investments Corporation", symbol: "SM" }]));
  if (url.startsWith("https://edge.pse.com.ph/companyPage/stockData.do")) return new Response('<select name="security_id"><option value="520" selected>SM</option></select><table><tr><th>Last Traded Price</th><td>561.00</td></tr></table>');
  if (url === "https://edge.pse.com.ph/common/DisclosureCht.ax") return new Response(JSON.stringify({ chartData: [{ OPEN: 706, HIGH: 712.5, LOW: 698, CLOSE: 700, CHART_DATE: "Dec 23, 2025 00:00:00" }] }));
  if (url.startsWith("https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF")) return new Response(JSON.stringify({ chart: { result: [{ meta: { currency: "USD", gmtoffset: -18000 }, timestamp: [1766552400], indicators: { quote: [{ open: [4480], high: [4520], low: [4470], close: [4502.5] }] } }] } }));
  if (url.startsWith("https://api.frankfurter.dev/v1/20")) return new Response(JSON.stringify({ base: "USD", date: url.split("/v1/")[1].slice(0, 10), rates: { PHP: 58.799 } }));
  if (url.includes("generativelanguage")) { const q = JSON.parse(o.body).contents.at(-1).parts[0].text; brainAsked.push(q);
    const action = /gold/i.test(q) ? { type: "price_on_date", details: { symbol: "gold", kind: "", date: "2025-12-24" } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Let me check." : "Answer to: " + q, action }) }] } }] })); }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8072", WK = "http://127.0.0.1:8871";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8871);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8072);
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

await say("how much was LTC on November 5 2025");
let a = await answer();
ok(/^Litecoin closed at 89\.39 dollars on Wed, November 5, 2025 \(high 89\.97 dollars, low 82\.01 dollars\), about 5,256 pesos\. Source: Binance daily candle, UTC day\.$/.test(a), "LTC on 5 Nov 2025 → exact close from Binance, spoken with high/low and pesos", a);
const card = await p.locator("#dispBody").textContent();
ok(/Close \$89\.39/.test(card) && /Open \$85\.20 · High \$89\.97 · Low \$82\.01/.test(card) && /ECB, 2025-11-05/.test(card), "price card: close, open/high/low, peso rate of that day", card);
ok(seen.some(u => u.startsWith("https://data-api.binance.vision/")) && !seen.some(u => u.includes("coingecko")) && brainAsked.length === 0, "answered straight from Binance (no guess by the AI, not today’s price)", String(brainAsked.length));
await p.screenshot({ path: process.env.SHOT_DIR + "/price-on-date.png" });
await p.click("#miniHome");
await say("magkano ang SM noong 25 December 2025");
a = await answer();
ok(/^No trading on Thu, December 25, 2025, so this is the last trading day before it: Tue, December 23, 2025\. SM Investments Corporation closed at 700\.00 pesos/.test(a), "SM on Christmas → says there was no trading and gives the last trading day", a);
await p.click("#miniHome");
await say("what was the gold price last Christmas eve");
a = await answer();
ok(/Gold \(Futures\) closed at 4,503 dollars on Wed, December 24, 2025/.test(a) && brainAsked.length === 1, "a vague date (“last Christmas eve”) → the brain works out the date, the app fetches the price", a);
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
