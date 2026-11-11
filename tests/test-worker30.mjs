// Backup price sources (11 Nov 2026): crypto main + 5 backups, dollar rate main + 2 backups,
// PSE: PSE Edge → Max's saved bars → TradingView (finished days only) → Phisix (last price, values holdings only).
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const DAY = 864e5, d0 = Math.floor(Date.now() / DAY) * DAY, iso = t => new Date(t).toISOString().slice(0, 10);
const btc = Array.from({length: 170}, (_, i) => ({t: d0 - (169 - i) * DAY, c: 60000 + i * 100}));   // last one = today (still open)
const M = {down: /^$/, calls: [], edge: null, tv: null, phisix: null, fx: {}};
globalThis.fetch = async (u, init = {}) => {
  const url = String(u); M.calls.push(url);
  if (M.down.test(url)) return new Response("blocked", {status: 403});
  if (url.includes("ticker/price?symbol=")) return Response.json({price: "70001"});
  if (url.includes("okx.com/api/v5/market/ticker")) return Response.json({data: [{last: "70002"}]});
  if (url.includes("coinbase.com/products/") && url.endsWith("/ticker")) return Response.json({price: "70003"});
  if (url.includes("kraken.com/0/public/Ticker")) return Response.json({result: {XXBTZUSD: {c: ["70004", "1"]}}});
  if (url.includes("kucoin.com/api/v1/market/orderbook")) return Response.json({data: {price: "70005"}});
  if (url.includes("gateio.ws/api/v4/spot/tickers")) return Response.json([{last: "70006"}]);
  if (url.includes("frankfurter.dev/v1/latest?base=EUR")) return Response.json({date: "2026-11-10", rates: {PHP: 68}});
  if (/frankfurter\.dev\/v1\/\d{4}-/.test(url)) return Response.json({date: "2026-11-05", rates: {PHP: 57.5}});
  if (url.includes("er-api.com/v6/latest/EUR")) return Response.json({time_last_update_unix: 1794355352, rates: {PHP: 68.5}});
  if (url.includes("currency-api@latest/v1/currencies/eur.json")) return Response.json({date: "2026-11-10", eur: {php: 69, btc: 0.00001}});
  if (url.includes("currency-api@2026-11-05/v1/currencies/usd.json")) return Response.json({date: "2026-11-05", usd: {php: 57.7}});
  if (url.includes("binance.vision")) return Response.json(btc.map(b => [b.t, "1", "1", "1", String(b.c), "0", b.t + DAY - 1, "1000"]));
  if (url.includes("okx.com")) return Response.json({code: "0", data: btc.map(b => [String(b.t), "1", "1", "1", String(b.c), "0", "0", "1000", "1"]).reverse()});
  if (url.includes("coinbase.com")) return Response.json(btc.map(b => [b.t / 1000, 1, 1, 1, b.c, 10]).reverse());
  if (url.includes("kraken.com")) { const p = url.match(/pair=(\w+)USD/)[1]; if (p !== "XBT" && p !== "ETH") return Response.json({error: ["EQuery:Unknown asset pair"]});
    return Response.json({error: [], result: {["X" + p + "ZUSD"]: btc.map(b => [b.t / 1000, "1", "1", "1", String(b.c), String(b.c), "2", 5]), last: 1}}); }
  if (url.includes("kucoin.com")) return Response.json({code: "200000", data: btc.map(b => [String(b.t / 1000), "1", String(b.c), "1", "1", "2", "3000"]).reverse()});
  if (url.includes("gateio.ws")) return Response.json(btc.map(b => [String(b.t / 1000), "4000", String(b.c), "1", "1", "1", "2", "true"]));
  if (url.includes("frankfurter")) return Response.json(M.fx.frank || {rates: {PHP: 58, CAD: 1.4}});
  if (url.includes("er-api.com")) return Response.json(M.fx.er || {rates: {PHP: 59, CAD: 1.4}});
  if (url.includes("currency-api")) return Response.json({usd: {php: 60, cad: 1.4}});
  if (url.includes("DisclosureCht")) { if (!M.edge) return new Response("down", {status: 500});
    return Response.json({chartData: M.edge.map(r => ({CHART_DATE: new Date(r.d + "T00:00:00Z").toLocaleDateString("en-US", {month: "short", day: "2-digit", year: "numeric", timeZone: "UTC"}) + " 00:00:00", OPEN: r.o, CLOSE: r.c, VALUE: r.v}))}); }
  if (url.includes("scanner.tradingview.com")) { if (!M.tv) return new Response("down", {status: 500}); const b = JSON.parse(init.body); return Response.json({data: b.symbols.tickers.filter(t => M.tv[t.slice(4)]).map(t => ({s: t, d: M.tv[t.slice(4)]}))}); }
  if (url.includes("phisix")) { if (!M.phisix) return new Response("down", {status: 503}); return Response.json({stocks: [{price: {amount: M.phisix}}]}); }
  return new Response("{}", {status: 404});
};
const mod = await import(process.argv[2]), T = mod.__test;
const today = iso(Date.now());
// ---------- crypto ----------
ok(T.CRYPTO_SOURCES.length === 6 && T.CRYPTO_SOURCES[0] === "binance", "crypto: main source + 5 backups", T.CRYPTO_SOURCES.join());
for (const src of T.CRYPTO_SOURCES) {
  const k = await T.cryptoCandles({n: 0, max: 99}, src, "BTC", 160);
  const last = k.closed[k.closed.length - 1];
  ok(k.closed.length >= 150 && last[0] < today && last[1] === btc[168].c && k.live === btc[169].c && last[2] > 0, `${src}: daily closes read right (today's open candle is the live price, not a closed day)`, JSON.stringify([k.closed.length, last, k.live]));
}
let S = {step: {}, books: {crypto_swing: {trades: [], positions: [], startPhp: 1}, btc_trend: {trades: [], positions: [], startPhp: 1}, gold_trend: {trades: [], positions: [], startPhp: 1}}, usdphp: 58, bench: {}};
M.down = /binance|okx|coinbase|kraken/;
let err = null; try { await T.paperCryptoStep(S, {n: 0, max: 200}, Date.now()); } catch (e) { err = e; }
ok(S.cryptoSrc === "kucoin" && /binance: .*okx: .*coinbase: .*kraken: /.test(S.cryptoTried.join("; ")), "Binance, OKX, Coinbase and Kraken down → Max uses KuCoin", S.cryptoSrc + " " + (S.cryptoTried || []).join("; ") + " " + (err && err.message));
M.calls = []; M.down = /binance|okx|coinbase/;
try { await T.paperCryptoStep(S, {n: 0, max: 200}, Date.now()); } catch {}
ok(/kucoin/.test(M.calls[0]) && S.cryptoSrc === "kucoin", "next time the source that worked is tried first (no time wasted on blocked ones)", M.calls[0]);
M.down = /binance|okx|coinbase|kraken|kucoin|gateio/; S.cryptoSrc = null;
err = null; try { await T.paperCryptoStep(S, {n: 0, max: 200}, Date.now()); } catch (e) { err = e; }
ok(err && /no crypto price source answered/.test(err.message) && (err.message.match(/answered 403/g) || []).length === 6, "only if all 6 fail does the crypto step fail (and says why for each)", err && err.message);
M.down = /binance/; S.cryptoSrc = null;
try { await T.paperCryptoStep(S, {n: 0, max: 200}, Date.now()); } catch {}
ok(S.cryptoSrc === "okx", "normal day (only Binance blocked) → OKX, as before", S.cryptoSrc);
// ---------- dollar rate ----------
M.down = /^$/; let f = await T.usdPhp({n: 0, max: 9});
ok(f.src === "frankfurter" && f.php === 58, "dollar rate from Frankfurter (ECB) normally");
M.down = /frankfurter/; f = await T.usdPhp({n: 0, max: 9});
ok(f.src === "er-api" && f.php === 59, "Frankfurter down → ExchangeRate-API");
M.down = /frankfurter|er-api/; f = await T.usdPhp({n: 0, max: 9});
ok(f.src === "currency-api" && f.php === 60, "both down → the free currency API");
M.down = /^$/; M.fx.frank = {rates: {PHP: 0.017, CAD: 1.4}}; f = await T.usdPhp({n: 0, max: 9});
ok(f.src === "er-api", "a source with odd numbers is skipped, not used", JSON.stringify(f)); M.fx = {};
// ---------- TradingView: finished days only ----------
const realNow = Date.now, manila = (dateIso, h) => Date.parse(dateIso + "T00:00:00Z") + (h - 8) * 3600e3;
const yday = iso(Date.now() - DAY);
M.tv = {AAA: [10.2, 10.4, 2e7, manila(yday, 19) / 1000], ABA: [2, 2.1, 1e7, manila(today, 11) / 1000]};
Date.now = () => manila(today, 12);
let tv = await T.tvPse({n: 0, max: 9}, ["AAA", "ABA"]);
ok(tv.AAA && tv.AAA.d === yday && tv.AAA.o === 10.2 && !tv.ABA, "TradingView: yesterday's finished day is used; today's bar is ignored while the market is open", JSON.stringify(tv));
Date.now = () => manila(today, 17);
tv = await T.tvPse({n: 0, max: 9}, ["AAA", "ABA"]);
ok(tv.ABA && tv.ABA.d === today, "…and today's bar counts after 4 pm Manila (market closed)", JSON.stringify(tv));
Date.now = realNow;
// ---------- PSE step with PSE Edge down / late ----------
const env = {MAX_MEMORY: new D1(new DatabaseSync(":memory:"))};
const P = await T.paperLoad(env), B = P.books.pse_dividend, d3 = iso(Date.now() - 3 * DAY), d2 = iso(Date.now() - 2 * DAY);
B.last_day = d3; B.pending = [{sym: "AAA", side: "buy", php: 20000, after: d3, why: "test pick", yield: 0.06}];
M.edge = [{d: iso(Date.now() - 4 * DAY), o: 10, c: 10, v: 2e7}, {d: d3, o: 10, c: 10.1, v: 2e7}];     // PSE Edge is late: nothing after d3
M.tv = {AAA: [10.2, 10.4, 2e7, manila(d2, 19) / 1000]};
let r = await T.pseStep(env, P, {n: 0, max: 40}, today);
let buy = P.journal.find(e => e.kind === "BUY" && e.sym === "AAA");
ok(buy && buy.d === d2 && buy.px === 10.2 && B.last_day === d2, "PSE Edge late → the buy fills at TradingView's opening price for the finished day", JSON.stringify([buy, B.last_day, r]));
ok(/edge \d/.test(P.pseSrc) && /tradingview/.test(P.pseSrc) && P.pseHist.AAA.some(x => x.d === d2), "Max notes which sources gave PSE prices and saves the bars", P.pseSrc);
// PSE Edge completely down next day: saved bars + TradingView keep going, stop-loss still checked
const d1 = iso(Date.now() - DAY); M.edge = null; M.tv = {AAA: [7, 7.0, 2e7, manila(d1, 19) / 1000], AETF: [30, 30, 1e6, manila(d1, 19) / 1000]};
r = await T.pseStep(env, P, {n: 0, max: 40}, today);
ok(B.last_day === d1 && B.pending.some(o => o.sym === "AAA" && o.side === "sell" && o.stop), "PSE Edge down → saved bars + TradingView: the day is processed and the 25% safety stop still works", JSON.stringify([B.last_day, B.pending, P.pseSrc]));
ok(/saved/.test(P.pseSrc) && /PSE Edge failed for/.test(P.pseSrc), "the status says PSE Edge failed and backups were used", P.pseSrc);
// Everything down except Phisix: holdings are valued at Phisix's price, but no order is filled
M.tv = null; M.phisix = 6.5; const lastBefore = B.last_day, jBefore = P.journal.length;
const P2 = JSON.parse(JSON.stringify(P)); P2.pseHist = {};
r = await T.pseStep(env, P2, {n: 0, max: 40}, today);
const B2 = P2.books.pse_dividend;
ok(B2.last_day === lastBefore && P2.journal.length === jBefore && B2.lastPx.AAA === 6.5 && /phisix 1/.test(P2.pseSrc), "only Phisix answers → holdings valued at its last price, no order filled without a real opening price", JSON.stringify([B2.last_day, B2.lastPx, P2.pseSrc]));
// ---------- live data for chats and the dashboard (11 Nov 2026 rule: every source has backups) ----------
M.down = /^$/;
let q = await T.cryptoSpotUsd("BTC"); ok(q === 70001, "crypto price now: Binance first", q);
M.down = /binance|okx|coinbase|kraken/; q = await T.cryptoSpotUsd("ETH"); ok(q === 70005, "Binance, OKX, Coinbase, Kraken down → KuCoin", q);
M.down = /binance|okx|coinbase|kraken|kucoin|gateio/; err = null; try { await T.cryptoSpotUsd("SOL"); } catch (e) { err = e; }
ok(err && /No crypto price source answered/.test(err.message) && (err.message.match(/answered 403/g) || []).length === 6, "all 6 down → a clear message listing each source", err && err.message);
M.down = /^$/; let fr = await T.fxRates("EUR"); ok(fr.source === "ECB (Frankfurter)" && fr.rates.PHP === 68 && fr.rates.EUR === 1, "currency rates: ECB first", JSON.stringify(fr));
M.down = /frankfurter/; fr = await T.fxRates("eur"); ok(fr.source === "ExchangeRate-API" || fr.source === "ECB (Frankfurter)", "ECB down → ExchangeRate-API (a cached answer is fine too)", fr.source);
M.down = /^$/; let fd = await T.fxOnDate("USD", "PHP", "2026-11-05"); ok(fd.rate === 57.5 && /Frankfurter/.test(fd.source), "a past day's rate: ECB first", JSON.stringify(fd));
M.down = /frankfurter/; fd = await T.fxOnDate("USD", "PHP", "2026-11-05"); ok(fd.rate === 57.7 && /currency-api/.test(fd.source), "ECB down → the saved daily copy of that day", JSON.stringify(fd));
M.down = /^$/; M.tv = {BDO: [121.8, -0.16, -0.2, "BDO Unibank, Inc.", 1794364893]};
let pq = await T.pseQuoteBackup("BDO"); ok(pq.price === 121.8 && /TradingView/.test(pq.source) && pq.name === "BDO Unibank, Inc.", "PSE price now when PSE Edge fails: TradingView", JSON.stringify(pq));
M.tv = null; M.phisix = 122; pq = await T.pseQuoteBackup("BDO"); ok(pq.price === 122 && pq.source === "Phisix", "…then Phisix", JSON.stringify(pq));
const fo = await T.firstOk("test", [["a", async () => { throw new Error("down"); }], ["b", async () => null], ["c", async () => 5]]);
ok(fo.value === 5 && fo.source === "c" && fo.tried.length === 2, "firstOk: the helper for every future data source returns the first good answer and which source gave it", JSON.stringify(fo));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
