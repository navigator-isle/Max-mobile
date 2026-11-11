// 11 Nov 2026: 5 categories × ₱50,000 — migration keeps every PSE stock, adds cash; new books: forex currencies, copy trading, US ETFs.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const DAY = 864e5, iso = t => new Date(t).toISOString().slice(0, 10), today = iso(Date.now());
// ---- fake markets ----
const fxDays = []; for (let i = 300; i >= 1; i--) { const d = iso(Date.now() - i * DAY); if (![0, 6].includes(new Date(d).getUTCDay())) fxDays.push(d); }
const FXP = Object.fromEntries(fxDays.map((d, i) => [d, {EUR: 0.9 - i * 0.0002, JPY: 150 + i * 0.02, GBP: 0.78, CHF: 0.88, CAD: 1.36, AUD: 1.5 - i * 0.0004, NZD: 1.65, MXN: 18 - i * 0.002, ZAR: 18.5}]));
const RATES = {asOf: "2026-11-11", rates: {USD: {rate: 3.94}, EUR: {rate: 2.03}, JPY: {rate: 1.56}, GBP: {rate: 3.71}, CHF: {rate: -0.04}, CAD: {rate: 2.33}, AUD: {rate: 4.51}, NZD: {rate: 3.13}, MXN: {rate: 6.81}, ZAR: {rate: 6.85}}};
const usDays = fxDays.filter(d => d < today);
const etfPx = (s, i) => ({SPY: 500 + i, QQQ: 400 + 1.5 * i, IWM: 200 - 0.1 * i, EFA: 70 + 0.05 * i, EEM: 40, TLT: 90 - 0.05 * i, GLD: 180 + 0.4 * i, VNQ: 80 + 0.01 * i, SHY: 82 + 0.001 * i})[s];
const COPY = {asOf: "2026-11-08", rule: "steady rule", passed: 170, checked: 400, traders: Array.from({length: 10}, (_, i) => ({addr: "0x" + String(i).repeat(40), accountValue: 300000, r90Pct: 10, greenMonths: "6/6", sharpe6: 2 - i / 10, monthsPct: [1, 2, 3, 4, 5, 6]}))};
const PNL = {}; let calls = [];
const M = {down: /^$/};
globalThis.fetch = async (u, init = {}) => {
  const url = String(u); calls.push(url);
  if (M.down.test(url)) return new Response("down", {status: 503});
  if (url.includes("frankfurter.dev/v1/") && url.includes("..")) return Response.json({base: "USD", rates: FXP});
  if (url.includes("live/fx-rates.json")) return Response.json(RATES);
  if (url.includes("er-api.com/v6/latest/USD")) { const last = FXP[fxDays[fxDays.length - 1]]; return Response.json({time_last_update_unix: Date.now() / 1000, rates: {...last, ZAR: 18.5 * 0.98}}); }
  if (url.includes("live/copy-steady.json")) return Response.json(COPY);
  if (url.includes("api.hyperliquid.xyz/info")) { const a = JSON.parse(init.body).user; const p = PNL[a] ?? 0; return Response.json([["allTime", {pnlHistory: [[1, "0"], [2, String(p)]], accountValueHistory: [[1, "300000"], [2, String(300000 + p)]]}]]); }
  if (url.includes("scanner.tradingview.com/america")) { const b = JSON.parse(init.body), n = usDays.length - 1, at = Date.parse(usDays[n] + "T21:10:00Z") / 1000;
    return Response.json({data: b.symbols.tickers.map(t => ({s: t, d: [etfPx(t.split(":")[1], n), at]}))}); }
  if (url.includes("finance.yahoo.com/v8/finance/chart/")) { const s = url.split("/chart/")[1].split("?")[0], n = usDays.length - 1;
    return Response.json({chart: {result: [{timestamp: usDays.slice(0, n).map(d => Date.parse(d + "T14:30:00Z") / 1000), indicators: {adjclose: [{adjclose: usDays.slice(0, n).map((d, i) => etfPx(s, i))}]}}]}}); }
  if (url.includes("api.nasdaq.com")) return Response.json({data: null});
  if (url.includes("DisclosureCht")) { const d = iso(Date.now() - DAY); return Response.json({chartData: [{CHART_DATE: new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {month: "short", day: "2-digit", year: "numeric", timeZone: "UTC"}) + " 00:00:00", OPEN: 6.4, CLOSE: 6.5, VALUE: 2e7}]}); }
  return new Response("{}", {status: 404});
};
const mod = await import(process.argv[2]), T = mod.__test;
const env = {MAX_MEMORY: new D1(new DatabaseSync(":memory:"))};
// ---------- 1) migration of a live-like ₱100,000 account ----------
const old = {v: 2, opened: "2026-11-09", usdphp: 58, fxSet: true, journal: [], jid: 0, emailed: 0, step: {}, errors: [], bench: {}, books: {
  pse_dividend: {key: "pse_dividend", cash: 1200, start: 40000, startPhp: 40000, positions: [{sym: "PLUS", shares: 600, ep: 6.3, hi: 6.3, cost: 3811, entry: "2026-11-10", divs: 0, yieldAtBuy: 0.13}], pending: [], trades: [], hist: [], qty: 0},
  crypto_swing: {key: "crypto_swing", cash: 21000 / 58, start: 21000 / 58, startPhp: 21000, positions: [], pending: [], trades: [], hist: [], qty: 0},
  btc_trend: {key: "btc_trend", cash: 9000 / 58, start: 9000 / 58, startPhp: 9000, positions: [], pending: [], trades: [], hist: [], qty: 0},
  gold_trend: {key: "gold_trend", cash: 30000 / 58, start: 30000 / 58, startPhp: 30000, positions: [], pending: [], trades: [], hist: [], qty: 0}}};
const S = JSON.parse(JSON.stringify(old)); T.paperMigrate(S);
const P = S.books.pse_dividend;
ok(P.positions.length === 1 && P.positions[0].shares === 600 && P.cash === 11200 && P.startPhp === 50000 && P.addCash, "PSE: PLUS kept (nothing sold), +₱10,000 cash, extra lots bought at the next openings", JSON.stringify(P));
ok(Math.round(S.books.crypto_swing.cash * 58) === 35000 && Math.round(S.books.btc_trend.cash * 58) === 15000 && Math.round(S.books.gold_trend.cash * 58) === 30000, "crypto 35k + 15k, gold stays 30k (now under Forex)");
ok(["fx_carry", "copy_steady", "us_etf"].every(k => S.books[k] && Math.round(S.books[k].value * 58) === T.PBOOK[k].php), "new books: currencies ₱20k, copy ₱50k, US ETF ₱50k");
ok(S.journal.some(e => e.kind === "PLAN" && /Nothing already bought was sold/.test(e.text)) && S.plan === 3 && !T.paperMigrate(S), "one PLAN entry (emailed once); running again changes nothing");
const tot = T.paperTotals(S);
ok(tot.cats.length === 5 && tot.cats.every(c => c.startPhp === 50000) && tot.cats.find(c => c.key === "pse").php === 11200 + 3780 && Math.abs(tot.total - (200000 + 14980)) < 5, "5 categories of ₱50,000 each; PSE = its cash + PLUS shares; others ₱50,000 cash", JSON.stringify(tot.cats.map(c => [c.key, c.startPhp, c.php])));
// ---------- 1b) PSE spends the new ₱10,000 on extra board lots at the next opening (nothing sold) ----------
P.last_day = iso(Date.now() - 2 * DAY);
await T.pseStep(env, S, {n: 0, max: 30}, today);
ok(P.positions[0].shares > 600 && P.positions[0].shares <= 600 + 1700 && P.cash < 11200 - 8000 && !P.addCash && S.journal.some(e => e.kind === "BUY" && /new ₱10,000/.test(e.why)), "PSE: extra PLUS lots bought with the new money at the opening; nothing sold", JSON.stringify([P.positions[0].shares, P.cash]));
// ---------- 2) forex: carry + trend, monthly ----------
let r = await T.fxStep(env, S, {n: 0, max: 30}, today);
const F = S.books.fx_carry, w = F.w;
ok(w.ZAR > 0 && w.MXN > 0 && w.CHF < 0 && w.JPY < 0 && Object.values(w).reduce((s, x) => s + Math.abs(x), 0) <= 1.0001, "forex: long the high-interest currencies (ZAR, MXN), short the low ones (CHF, JPY); never more than 100% of the money (no leverage)", JSON.stringify(w));
ok(S.journal.some(e => e.book === "fx_carry" && /Opened the currency mix/.test(e.text) && /forex broker/.test(e.copy)), "forex: journal with why + how to copy", JSON.stringify(S.journal.slice(-1)));
const v0 = F.value; S.fxHist[today] = {...FXP[fxDays[fxDays.length - 1]], ZAR: 18.5 * 0.98}; F.last_day = fxDays[fxDays.length - 1];
M.down = /frankfurter/; r = await T.fxStep(env, S, {n: 0, max: 30}, today); M.down = /^$/;
ok(F.value > v0 && /backup/.test(S.fxSrc), "forex: ECB down → backup rate source; rand up 2% → long-rand book gains", `${v0} → ${F.value} ${S.fxSrc}`);
// ---------- 3) copy trading ----------
r = await T.copyStep(env, S, {n: 0, max: 30}, today);
const C = S.books.copy_steady;
ok(Object.keys(C.w).length === 10 && Object.values(C.w).every(x => Math.abs(x - 0.1) < 1e-9) && S.journal.filter(e => e.book === "copy_steady" && e.kind === "BUY").length === 10, "copy: 10 steady traders, equal shares, 10 journal entries", JSON.stringify(C.w));
ok(S.journal.some(e => e.book === "copy_steady" && /copy wallet 0x0000/.test(e.copy) && /stops copying if/.test(e.sellPlan)), "copy: each entry says which wallet to copy and when Max stops");
const c0 = C.value; PNL["0x" + "0".repeat(40)] = 30000; for (const a of Object.keys(C.w)) if (!(a in PNL)) PNL[a] = 0;
r = await T.copyStep(env, S, {n: 0, max: 30}, today);      // first look sets the baseline
PNL["0x" + "0".repeat(40)] = 60000; C.lastAt = Date.now() - DAY;
r = await T.copyStep(env, S, {n: 0, max: 30}, today);
ok(C.value > c0 * 1.0085 && C.value < c0 * 1.0095, "copy: trader 1 made +30k on 330k (+9.1%) → 10% slice → book +0.9% (minus the small copy cost)", `${c0} → ${C.value}`);
PNL["0x" + "1".repeat(40)] = -90000; C.lastAt = Date.now();
r = await T.copyStep(env, S, {n: 0, max: 30}, today);
ok(!C.w["0x" + "1".repeat(40)] && C.w.CASH > 0.05 && S.journal.some(e => /STOP copying 0x11111111/.test(e.text)), "copy: a trader's slice down 30% → safety stop, money to cash", JSON.stringify(C.w));
// ---------- 4) US ETFs ----------
r = await T.etfStep(env, S, {n: 0, max: 30}, today);
const E = S.books.us_etf;
ok(Math.abs(E.w.SPY - 0.5 - (E.market.top.includes("SPY") ? 0.125 : 0)) < 1e-6 && E.market.spyAbove200 && E.market.top.length === 4 && !E.market.top.includes("IWM"), "US: SPY above its 200-day → 50% SPY; plus the top 4 by 6-month gain (IWM falling is left out)", JSON.stringify([E.w, E.market]));
ok(S.journal.some(e => e.book === "us_etf" && e.kind === "BUY" && /US-stock app/.test(e.copy) && /\+7\.3% a year/.test(e.outcome)), "US: BUY entries with how to copy and the tested result");
ok(/Yahoo/.test(S.etfSrc) && /TradingView/.test(S.etfSrc), "US prices: Yahoo history + TradingView's last close", S.etfSrc);
// ---------- 5) dashboard + email ----------
const tot2 = T.paperTotals(S), txt = T.paperEmailText(S, S.journal.slice(-3));
ok(/5 × ₱50,000/.test(txt) && /Copy trading/.test(txt) && /US stocks/.test(txt) && /currencies|Currencies/.test(txt), "email shows the 5 categories and the new mixes", txt.slice(0, 600));
ok(T.shortSym("0x3e781befd071c59d820725f70ce109298f750706") === "trader 0x3e781bef…" && T.shortSym("SPY") === "SPY", "emails show copy traders as a short id, not a 42-character wallet");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
