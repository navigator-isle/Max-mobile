// Phone: markets — crypto and PSE prices, watchlist with charts, currency equivalents, conversion, price alerts, briefing.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const seen = [], days = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); seen.push(url);
  if (url.startsWith("https://api.coingecko.com/api/v3/simple/price")) { const v = new URL(url).searchParams.get("vs_currencies").split(","); const P = { php: 5800000, usd: 99000, eur: 91000 }, E = { php: 210000, usd: 3600, eur: 3300 };
    const pick = (o2, ch) => Object.fromEntries([...v.map(c => [c, o2[c]]), [v[0] + "_24h_change", ch], ["last_updated_at", 1793400000]]); return new Response(JSON.stringify({ bitcoin: pick(P, -2.5), ethereum: pick(E, 1.2) })); }
  if (url.includes("/market_chart")) { days.push(new URL(url).searchParams.get("days")); return new Response(JSON.stringify({ prices: Array.from({ length: 30 }, (_, i) => [1790000000000 + i * 864e5, 5000000 + i * 27000]) })); }
  if (url.startsWith("https://edge.pse.com.ph/autoComplete")) return new Response(JSON.stringify([{ cmpyId: "599", cmpyNm: "SM Investments Corporation", symbol: "SM" }, { cmpyId: "112", cmpyNm: "SM Prime Holdings, Inc.", symbol: "SMPH" }]));
  if (url.startsWith("https://edge.pse.com.ph/companyPage/stockData.do")) return new Response('<select name="security_id"><option value="520" selected>SM</option></select><table><tr><th>Status</th><td>Open</td></tr><tr><th>Last Traded Price</th><td>847.00</td></tr><tr><th>Change(% Change)</th><td>up 1.50 (0.18%)</td></tr><tr><th>Previous Close and Date</th><td>845.50 (Oct 29, 2026)</td></tr><tr><th>52-Week High</th><td>901.00</td><th>52-Week Low</th><td>720.00</td></tr></table>');
  if (url === "https://edge.pse.com.ph/common/DisclosureCht.ax") return new Response(JSON.stringify({ chartData: Array.from({ length: 20 }, (_, i) => ({ CLOSE: 820 + i, CHART_DATE: new Date(Date.UTC(2026, 9, 1 + i)).toDateString().slice(4) + " 00:00:00" })) }));
  if (url.startsWith("https://api.frankfurter.dev/v1/latest")) { const base = new URL(url).searchParams.get("base"); return new Response(JSON.stringify({ base, date: "2026-10-30", rates: base === "PHP" ? { USD: 0.017, EUR: 0.0157 } : base === "USD" ? { PHP: 58.5, EUR: 0.92 } : { PHP: 63.5, USD: 1.087 } })); }
  if (url.includes("generativelanguage")) { const q = JSON.parse(o.body).contents.at(-1).parts[0].text;
    const action = /how much is sm\b/i.test(q) ? { type: "market_quote", details: { symbols: ["SM"], kind: "pse" } } : /goes below/i.test(q) ? { type: "price_alert", details: { symbol: "BTC", kind: "crypto", direction: "below", price: 6000000, currency: "PHP" } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Okay." : "Answer to: " + q, action }) }] } }] })); }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8059", WK = "http://127.0.0.1:8845";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8845);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8059);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
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


await say("how much is bitcoin");
let a = await answer();
ok(/^Bitcoin \(BTC\) is 5\.8 million pesos, down 2\.5% in 24 hours — about 99,000 dollars\.$/.test(a), "“how much is bitcoin” → price in pesos, change, dollar equivalent", a);
await p.waitForTimeout(600);
ok(await vis("#displayScreen") && await p.locator("canvas.mkt-chart").count() === 1 && (await p.locator("#dispBody").textContent()).includes("≈ $99,000"), "price card with a 30-day chart and the equivalent", await p.locator("#dispBody").textContent());
await p.click("#miniHome");
await say("how much is SM");
a = await answer();
ok(/SM Investments Corporation \(SM\) is 847\.00 pesos, up 0\.2% today — about 14\.40 dollars/.test(a), "“how much is SM” → PSE price with dollar equivalent", a);
await p.click("#miniHome");
await say("add SM to my watchlist as blue chip");
ok(/Added SM \(PSE\) to your watchlist as blue chip/.test(await answer()), "add a PSE stock to the watchlist with its tier", await answer());
await say("show my watchlist");
await p.waitForTimeout(1500);
a = await answer();
const cards = await p.locator(".disp-card").allTextContents();
ok(/^Your watchlist: SM 847\.00 pesos \(up 0\.2%\); BTC 5\.8 million pesos \(down 2\.5%\); ETH 210,000 pesos \(up 1\.2%\)\. 2 up, 1 down\.$/.test(a), "watchlist read out, blue chips first", a);
ok(cards.length === 3 && /blue chip/.test(cards[0]) && await p.locator("canvas.mkt-chart").count() === 3, "watchlist on screen: a chart for every item", String(await p.locator("canvas.mkt-chart").count()));
await p.screenshot({ path: process.env.SHOT_DIR + "/watchlist.png", fullPage: true });
await p.click("#miniHome");
await say("chart bitcoin for 3 months");
await p.waitForTimeout(800);
a = await answer();
ok(days.includes("90") && await p.locator("canvas.mkt-chart.big").count() === 1 && /^Bitcoin over the last 90 days: up /.test(a), "“chart bitcoin for 3 months” → big chart + what changed", a);
await p.screenshot({ path: process.env.SHOT_DIR + "/chart.png" });
await p.click("#miniHome");
await say("show prices in pesos and dollars and euros");
ok(/prices in PHP, USD, EUR/.test(await answer()), "choose the currencies to show", await answer());
await say("how much is ethereum");
ok(/about 3,600 dollars or 3,300 euros/.test(await answer()), "equivalents now include euros", await answer());
await p.click("#miniHome");
await say("how much is 100 dollars in pesos");
ok(/^100 USD is about 5,850 pesos\.$/.test(await answer()), "convert 100 dollars to pesos", await answer());
await p.click("#miniHome");
await say("tell me if bitcoin goes below 6 million pesos");
ok(/Alert set: I’ll tell you when BTC goes below ₱6,000,000/.test(await answer()), "set a price alert", await answer());
await say("show my watchlist");
await p.waitForTimeout(1200);
ok(/Alert: BTC is below ₱6,000,000 \(now ₱5,800,000\)/.test(await answer()), "alert fires when the price crosses", await answer());
await p.click("#miniHome");
await say("brief me");
ok((await p.locator("#dispBody").textContent()).includes("Watchlist") && /SM ₱847\.00/.test(await p.locator("#dispBody").textContent()), "briefing includes the watchlist");
ok(!seen.some(u => /trade|order|buy|sell/i.test(u)), "no trading calls of any kind");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
