// Phone: 🛒 Deal Finder — best real price from legit stores, price history, watch list.
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
let price = 13999; const gem = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents?.at(-1)?.parts?.[0]?.text || "";
    if (/Best value to buy now/.test(q)) {
      const text = `TITLE: Samsung A56 prices\nTOPIC: Shopping\nPOINTS:\n- LazMall Samsung Official Store: ₱${price.toLocaleString()} (regular ₱21,990, 36% off), 4.9 stars, 2,140 reviews.\n- Shopee Mall Samsung Official: ₱${(price + 500).toLocaleString()} (regular ₱21,990), 4.8 stars, 1,900 reviews.\n- A third-party seller lists ₱9,999 "from ₱30,000" — inflated discount, not an official store, skipped.\n- BEST VALUE: LazMall Samsung Official Store at ₱${price.toLocaleString()} — lowest official price, real discount vs usual ₱18,990.\nCONFLICTS:\n- none\nCONFIDENCE: medium — prices change daily`;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://www.lazada.com.ph/products/samsung-a56", title: "lazada.com.ph" } }, { web: { uri: "https://shopee.ph/samsung-a56", title: "shopee.ph" } }] } }] })); }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "ok", action: null }) }] } }] })); }
  return new Response("{}", { status: 404 });
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8067", WK = "http://127.0.0.1:8853";
const sqlite = new DatabaseSync(":memory:");
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite) };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8853);
const sP = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html" }); r.end(fs.readFileSync(pagePath)); }).listen(8067);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; };
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 30); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); setTimeout(() => u.onstart && u.onstart(), 5); setTimeout(() => u.onend && u.onend(), 120); }, cancel() {}, getVoices: () => [], speaking: false } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); mark = n; await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(100); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(350); await p.evaluate(() => document.getElementById("homeStop").click()); };
let mark = 0; const spoken = () => p.evaluate(m => window.__spoken.slice(m).join(" "), mark);
const shown = () => p.evaluate(() => document.getElementById("dispBody")?.textContent || "");
await say("find the best price for Samsung A56 256GB");
const sent = gem.find(g => /Best value to buy now/.test(g.contents?.at(-1)?.parts?.[0]?.text || ""));
const prompt = sent ? sent.contents.at(-1).parts[0].text : "";
ok(/Samsung A56 256GB/.test(prompt) && /LazMall/.test(prompt) && /Shopee Mall/.test(prompt) && /Zalora/.test(prompt) && /official/.test(prompt) && sent.tools?.[0]?.google_search, "searches the web (Google) for legit stores only: LazMall, Shopee Mall, Zalora, official", prompt.slice(0, 300));
ok(/Best value: LazMall Samsung Official Store at ₱13,999/.test(await spoken()) && /confirm before buying/.test(await spoken()), "says the best value and reminds him to confirm", await spoken());
ok(/🛒 Samsung A56 256GB/.test(await shown()) && /inflated discount/.test(await shown()) && /Lowest legit price found: ₱13,999/.test(await shown()), "the screen lists each store, flags the fake discount", (await shown()).slice(0, 400));
await p.locator("#dispBody button", { hasText: "lazada.com.ph" }).click();
ok((await p.evaluate(() => window.__opened)).includes("https://www.lazada.com.ph/products/samsung-a56"), "store links open so he can check and buy himself");
// price goes up next time → Max says so
price = 15499;
await say("best price for Samsung A56 256GB");
ok(/Higher than before|About the same|Lowest price/.test(await spoken()), "remembers the last price and compares (price history)", await spoken());
await say("watch the price of Samsung A56 256GB");
ok(/Watching Samsung A56 256GB/.test(await spoken()), "“watch the price of …” puts it on watch", await spoken());
await say("my deals");
ok(/👀 Samsung A56 256GB/.test(await shown()), "“my deals” lists products, with the watched one marked", (await shown()).slice(0, 200));
ok(JSON.parse(await p.evaluate(() => localStorage.getItem("max_deals"))).items["samsung a56 256gb"].history.length === 2, "keeps the price history (synced to Max's server)");
const dealCalls = () => gem.filter(g => /Best value to buy now/.test(g.contents?.at(-1)?.parts?.[0]?.text || "")).length;
const before = dealCalls(); await say("find the best price for bitcoin");
ok(dealCalls() === before, "crypto/stock prices don't go to the Deal Finder (that's the trading desk)");
ok(/Higher than before: I found ₱13,999 earlier today/.test(await p.evaluate(() => window.__spoken.join(" "))), "the price rise is spotted against the real legit price (₱13,999, not the fake ₱9,999)", await p.evaluate(() => window.__spoken.join(" | ").slice(-600)));
ok(!errs.length, "no page errors", errs.join(" | "));
await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
