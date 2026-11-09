// Home panels: live paper trading (Max's own paper account, priced live) and the investment guide (top 10 per category, refreshed by the agent).
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
const snap = { v: 1, asOf: "2026-11-15", opened: "2026-11-08", weeks: 1, usdphp: 63, plan: { pse_dividend: 0.4, crypto_swing: 0.21, btc_trend: 0.09, gold_trend: 0.3 }, combinedSince: 1.0, events: ["2026-11-10 PSE: BUY — BUY 1,000 PLUS"],
  books: [{ key: "pse_dividend", name: "PSE high-dividend top-20", status: "main", weight: 0.4, ccy: "PHP", start: 100000, cash: 90000, value: 100500, since: 0.5, positions: [{ sym: "PLUS", kind: "pse", qty: 1000, ep: 6.4, entry: "2026-11-10" }], pending: [], trades: [], closed: 0, wins: 0 },
    { key: "crypto_swing", name: "Crypto swing", status: "main", weight: 0.21, ccy: "USDT", start: 1586.55, cash: 1000, value: 1600, since: 0.85, positions: [{ sym: "SOL", kind: "crypto", qty: 3, ep: 200, entry: "2026-11-12", stop: 180 }], pending: [], trades: [], closed: 0, wins: 0 },
    { key: "gold_trend", name: "Gold trend", status: "main", weight: 0.3, ccy: "USDT", start: 1586.55, cash: 586.55, value: 1600, since: 0.85, positions: [{ sym: "GOLD", kind: "gold", qty: 0.25, ep: 4000, entry: "2026-11-10" }], pending: [], trades: [], closed: 0, wins: 0 }] };
const block = "MAX-PAPER-DATA-BEGIN " + Buffer.from(JSON.stringify(snap)).toString("base64").replace(/(.{76})/g, "$1\n") + " MAX-PAPER-DATA-END";
const fake = { ...snap, asOf: "2026-11-20", books: [{ ...snap.books[0], cash: 9e9 }] };
const fakeBlock = "MAX-PAPER-DATA-BEGIN " + Buffer.from(JSON.stringify(fake)).toString("base64") + " MAX-PAPER-DATA-END";
let gem = 0, binance = 0;
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.startsWith("https://oauth2.googleapis.com/token")) { const q = new URLSearchParams(o.body);
    if (q.get("grant_type") === "authorization_code") return new Response(JSON.stringify({ access_token: "AT1", expires_in: 3600, refresh_token: "RT", scope: "openid email https://www.googleapis.com/auth/gmail.readonly", id_token: "h." + Buffer.from(JSON.stringify({ email: "mark@example.com" })).toString("base64url") + ".s" }));
    return new Response(JSON.stringify({ access_token: "AT2", expires_in: 3600 })); }
  if (url.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/messages?")) return new Response(JSON.stringify({ messages: [{ id: "fake1" }, { id: "real1" }] }));
  if (url.includes("/messages/fake1")) return new Response(JSON.stringify({ id: "fake1", payload: { headers: [{ name: "From", value: "Stranger <x@evil.com>" }], mimeType: "text/plain", body: { data: Buffer.from("Max paper trading " + fakeBlock).toString("base64url") } } }));
  if (url.includes("/messages/real1")) return new Response(JSON.stringify({ id: "real1", payload: { headers: [{ name: "From", value: "Mark <mark@example.com>" }, { name: "Date", value: "Sun, 15 Nov 2026 18:20:00 +0800" }], mimeType: "multipart/alternative", parts: [{ mimeType: "text/html", body: { data: Buffer.from("<p>Report…</p><p>" + block.replace(/\n/g, "<br>") + "</p>").toString("base64url") } }] } }));
  if (url.startsWith("https://data-api.binance.vision/api/v3/ticker/price")) { binance++; return new Response(JSON.stringify([{ symbol: "SOLUSDT", price: "220.00" }, { symbol: "PAXGUSDT", price: "4200" }])); }
  if (url.startsWith("https://edge.pse.com.ph/autoComplete")) return new Response(JSON.stringify([{ cmpyId: "1", cmpyNm: "DigiPlus", symbol: "PLUS" }]));
  if (url.startsWith("https://edge.pse.com.ph/companyPage/stockData.do")) return new Response('<select name="security_id"><option value="9" selected>PLUS</option></select><table><tr><th>Last Traded Price</th><td>7.04</td></tr></table>');
  if (url.startsWith("https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF")) return new Response(JSON.stringify({ chart: { result: [{ meta: { regularMarketPrice: 4200 } }] } }));
  if (url.includes("generativelanguage")) { gem++; const t = JSON.parse(o.body).contents[0].parts[0].text;
    const items = /savings accounts/.test(t) ? [{ name: "OwnBank", rate: "4.00%", rateNum: 4.0, tax: "20%", withdraw: "any day", safety: "PDIC", conditions: "", url: "https://own.bank/x" }, { name: "UNO", rate: "3.50%", rateNum: 3.5, tax: "20%" }, { name: "NewBank", rate: "3.9%", rateNum: 3.9, tax: "20%" }, { name: "Bad", rate: "x", rateNum: "nope" }] : [{ name: "only one", rate: "1%", rateNum: 1 }];
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ items }) }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://pesohub.ph/x", title: "PesoHub" } }] } }] })); }
  return new Response("{}", { status: 404 }); };
const { default: w } = await import(process.argv[2]);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const APP = "https://max-app-axv.pages.dev"; const db = new DatabaseSync(":memory:"); const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", ALLOWED_ORIGIN: APP, MAX_MEMORY: new D1(db), GOOGLE_CLIENT_ID: "c", GOOGLE_CLIENT_SECRET: "s", MAX_OWNER_EMAIL: "mark@example.com" };
let SESS = ""; const H = () => ({ "X-Max-Pass": "p", Origin: APP, ...(SESS ? { "X-Max-Session": SESS } : {}) });
const get = async p => { const r = await w.fetch(new Request("https://x" + p, { headers: H() }), env); return { s: r.status, d: await r.json() }; };
// Max's own paper state (v2, 10 Nov 2026): PLUS bought at ₱6.40, SOL at $200 with a stop, gold (PAXG) at $4,000
const book = (k, startPhp, ccy, extra) => ({key: k, start: ccy === "PHP" ? startPhp : startPhp / 63, startPhp, cash: 0, positions: [], pending: [], trades: [], hist: [], qty: 0, ...extra});
const S = {v: 2, opened: "2026-11-10", usdphp: 63, fxSet: true, jid: 2, emailed: 2, step: {crypto: "2026-11-10"}, errors: [], bench: {}, lastStep: {at: Date.now(), job: "crypto", ok: true},
  journal: [{id: 1, at: 1, kind: "BUY", sym: "PLUS", book: "pse_dividend", d: "2026-11-10", text: "BUY 1,000 PLUS"}, {id: 2, at: 2, kind: "BUY", sym: "SOL", book: "crypto_swing", d: "2026-11-10", text: "BUY 3 SOL"}],
  books: {pse_dividend: book("pse_dividend", 40000, "PHP", {cash: 33600, positions: [{sym: "PLUS", shares: 1000, ep: 6.4, hi: 6.4, cost: 6400, entry: "2026-11-10"}]}),
    crypto_swing: book("crypto_swing", 21000, "USDT", {cash: 21000 / 63 - 600, positions: [{sym: "SOL", qty: 3, ep: 200, stop: 180, hi: 200, risk: 20, entry: "2026-11-10"}]}),
    btc_trend: book("btc_trend", 9000, "USDT", {cash: 9000 / 63}),
    gold_trend: book("gold_trend", 30000, "USDT", {cash: 30000 / 63 - 1000, qty: 0.25, positions: [{sym: "PAXG", qty: 0.25, ep: 4000, entry: "2026-11-10", stop: 0}]})}};
db.exec("CREATE TABLE IF NOT EXISTS max_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)");
db.prepare("INSERT OR REPLACE INTO max_settings VALUES ('max_paper', ?, 1)").run(JSON.stringify(S));
let r = await get("/api/home/paper");
const pse = r.d.books?.find(b => b.key === "pse_dividend"), sol = r.d.books?.find(b => b.key === "crypto_swing")?.positions[0], gold = r.d.books?.find(b => b.key === "gold_trend");
ok(r.s === 200 && r.d.v === 2 && r.d.journal[0].sym === "SOL", "the paper tile reads Max's own paper account (journal newest first)", JSON.stringify(r.d).slice(0, 200));
ok(pse && pse.positions[0].last === 7.04 && pse.positions[0].chgPct === 10 && pse.valuePhp === 33600 + 7040 && pse.sinceNow === 1.6, "PSE position priced live from PSE Edge: PLUS ₱6.40 → ₱7.04 (+10%), value in pesos", JSON.stringify(pse?.positions[0]) + " " + pse?.valuePhp);
ok(sol && sol.last === 220 && sol.chgPct === 10 && sol.riskPhp === Math.round(40 * 3 * 63) && gold.positions[0].last === 4200 && gold.positions[0].chgPct === 5, "crypto and gold (PAXG) priced live from Binance; risk to the stop in pesos", JSON.stringify([sol, gold?.positions[0]]));
ok(r.d.totalPhp === pse.valuePhp + Math.round((21000 / 63 - 600 + 660) * 63) + 9000 + Math.round((30000 / 63 - 1000 + 1050) * 63), "total ₱ = sum of the four parts at live prices", String(r.d.totalPhp));
const b0 = binance; await get("/api/home/paper"); ok(binance === b0, "prices are cached for 5 minutes (no new calls on every open)");
// investment guide
r = await get("/api/home/guide");
const cat = k => r.d.cats.find(c => c.key === k);
ok(r.s === 200 && r.d.cats.length === 6 && cat("government").items[0].name === "Pag-IBIG MP2" && cat("savings").items[0].name.startsWith("OwnBank") && cat("timedeposits").items[0].netPer100k === 4800, "guide: 6 categories, best first, with what ₱100k earns after tax (Metrobank 6% → ₱4,800)", JSON.stringify(cat("timedeposits")?.items[0]));
ok(cat("promos").items.some(i => /Maya/.test(i.name) && i.ends === "2026-11-30" && i.netPer100k === undefined) && cat("government").items[0].netPer100k === 7120, "promos show their end date (no misleading yearly figure); MP2 is tax-free (₱7,120)");
let p = await w.fetch(new Request("https://x/api/home/guide/refresh", { method: "POST", headers: H() }), env); let pd = await p.json();
ok(p.status === 200 && pd.updated.length === 1 && pd.updated[0] === "savings" && gem === 6, "“Update now”: the agent checks all 6 categories; only answers with 3+ valid items replace a list", JSON.stringify(pd) + " gem " + gem);
r = await get("/api/home/guide");
ok(cat("savings").items.map(i => i.name).join() === "OwnBank,NewBank,UNO" && cat("savings").items[0].change === "new" && cat("savings").items[1].change === "new" && cat("timedeposits").items[0].name === "Metrobank Online Time Deposit", "new list sorted by rate, invalid rows dropped, changes marked; failed categories keep the last good list", cat("savings").items.map(i => i.name + ":" + i.change).join(","));
p = await w.fetch(new Request("https://x/api/home/guide/refresh", { method: "POST", headers: H() }), env);
ok(p.status === 429, "“Update now” at most once an hour (protects the AI quota)");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
