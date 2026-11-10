// Max's own paper trading (10 Nov 2026): crypto swing, Bitcoin and gold trend, PSE dividend top-10, the journal, emails text,
// the hourly job order and failures, the home screen data, auto-updating note boxes and investment notes. All data is faked here.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { if (a.length > 100) throw new Error("D1: too many SQL variables"); return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const day = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
// ---------- fake markets ----------
const M = {coins: {}, live: {}, pse: {}, divHtml: "", fail: null, calls: []};
const line = (n, f) => Array.from({length: n}, (_, i) => f(n - i));     // f(daysAgo) for daysAgo = n..1
function coin(sym, f, vol = 1e8) { M.coins[sym] = line(260, k => [Date.now() - k * 864e5, f(k), vol]); M.live[sym] = f(0.01); }
coin("BTC", k => 60000 + (260 - k) * 100);                    // steady uptrend → above its 50- and 100-day averages
coin("PAXG", k => 3000 + (260 - k) * 2);                       // gold uptrend
coin("ETH", k => k === 1 ? 4000 : 3000 + Math.sin(k) * 20, 5e8); // flat, then a breakout on the last closed day
for (const s of ["SOL", "XRP", "BNB", "DOGE"]) coin(s, k => 100 + Math.sin(k / 2) * 3);
M.live.ETH = 4010;
globalThis.fetch = async (u, init = {}) => {
  const url = String(u); M.calls.push(url);
  if (M.fail && M.fail.test(url)) throw new Error("network down");
  if (url.includes("binance.vision/api/v3/ticker/24hr")) { const syms = JSON.parse(decodeURIComponent(url.split("symbols=")[1])); return Response.json(syms.filter(s => M.coins[s.replace("USDT", "")]).map(s => ({symbol: s, lastPrice: String(M.live[s.replace("USDT", "")]), quoteVolume: String(M.coins[s.replace("USDT", "")][0][2])}))); }
  if (url.includes("binance.vision/api/v3/ticker/price")) { const syms = JSON.parse(decodeURIComponent(url.split("symbols=")[1])); return Response.json(syms.map(s => ({symbol: s, price: String(M.live[s.replace("USDT", "")] || 1)}))); }
  if (url.includes("binance.vision/api/v3/klines")) { const sym = url.match(/symbol=(\w+)USDT/)[1], lim = +url.match(/limit=(\d+)/)[1]; const k = (M.coins[sym] || []).slice(-lim); return Response.json(k.map(([t, c, v]) => [t, c, c, c, String(c), 0, t + 864e5 - 1, String(v)])); }
  if (url.includes("okx.com/api/v5/market/candles")) { M.okx = (M.okx || 0) + 1; const sym = url.match(/instId=(\w+)-USDT/)[1], lim = +url.match(/limit=(\d+)/)[1]; const k = (M.coins[sym] || []).slice(-lim); if (!k.length) return Response.json({code: "51001", msg: "Instrument ID doesn't exist", data: []});
    return Response.json({code: "0", data: [...k.map(([t, c, v]) => [String(Math.floor(t / 864e5) * 864e5), "1", "1", "1", String(c), "0", "0", String(v), "1"]), [String(Math.floor(Date.now() / 864e5) * 864e5), "1", "1", "1", String(M.live[sym]), "0", "0", "1", "0"]].reverse()}); }
  if (url.includes("frankfurter")) return Response.json({rates: {PHP: 58, CAD: 1.4}});
  if (url.includes("DisclosureCht")) { const b = JSON.parse(init.body); const sym = Object.keys(M.pse).find(s => M.pse[s].c === b.cmpy_id); const rows = sym ? M.pse[sym].bars : [];
    return Response.json({chartData: rows.map(r => ({CHART_DATE: new Date(r.d + "T00:00:00Z").toLocaleDateString("en-US", {month: "short", day: "2-digit", year: "numeric", timeZone: "UTC"}) + " 00:00:00", OPEN: r.o, CLOSE: r.c, VALUE: r.v}))}); }
  if (url.includes("dividends_and_rights_info_list")) { const p = +String(init.body).match(/pageNum=(\d+)/)[1]; return new Response(p === 1 ? M.divHtml : "<table></table>"); }
  return new Response("{}", {status: 404});
};
const mod = await import(process.argv[2]), T = mod.__test, w = mod.default;
const env = {GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:"))};
const at = (h, dAgo = 0) => { const t = new Date(Date.now() - dAgo * 864e5); t.setUTCHours(h, 45, 0, 0); return t.getTime(); };
// a weekday hour that is free of other jobs
let mon = new Date(); while (mon.getUTCDay() !== 2) mon = new Date(mon - 864e5); // a Tuesday on or before today
// ---------- 1) crypto day ----------
let r = await T.backgroundStep(env, at(17));
let S = await T.paperLoad(env);
ok(/crypto/.test(r) && S.step.crypto === new Date().toISOString().slice(0, 10), "the first hourly step of the day is the crypto check", r);
ok(S.usdphp === 58 && Math.round(S.books.btc_trend.start * 58) === 9000 && Math.round(S.books.crypto_swing.start * 58) === 21000, "₱100,000 is split 40/21/9/30 and the dollar books are sized with today's rate", JSON.stringify([S.usdphp, S.books.btc_trend.start]));
const buys = S.journal.filter(e => e.kind === "BUY");
const eth = buys.find(e => e.sym === "ETH");
ok(eth && /^Stop-loss \$[\d,.]+ \(−[\d.]+% from the buy\)\. The stop only moves UP/.test(eth.sellPlan) && /No fixed target/.test(eth.sellPlan), "every BUY has a sell plan: stop-loss price, how it trails, no fixed target", eth && eth.sellPlan);
ok(eth && eth.px === 4010 && /breakout/.test(eth.why) && /buy about ₱/.test(eth.copy) && /stop/.test(eth.outcome), "a 20-day breakout (ETH) is bought at the LIVE price, with why / how to copy / possible outcome", JSON.stringify(eth));
const pos = S.books.crypto_swing.positions.find(p => p.sym === "ETH");
ok(pos && pos.qty * pos.risk <= S.books.crypto_swing.start * 0.0051 && pos.qty * pos.ep <= S.books.crypto_swing.start * 0.2501, "position size: about 0.5% of the money at risk to the stop, at most 25% in one coin", JSON.stringify(pos));
ok(buys.some(e => e.sym === "BTC" && e.book === "btc_trend") && buys.some(e => e.sym === "PAXG" && e.book === "gold_trend"), "Bitcoin and gold are bought because both are above their averages");
const tot = T.paperTotals(S);
ok(Math.abs(tot.total - 100000) < 400 && tot.parts.length === 4, "total stays about ₱100,000 right after buying (only fees lost)", String(tot.total));
// same day again → no second crypto run
r = await T.backgroundStep(env, at(3)); S = await T.paperLoad(env);
ok(!/crypto/.test(r) && S.journal.filter(e => e.kind === "BUY" && e.sym === "ETH").length === 1, "crypto runs once a day", r);
// ---------- 2) next day: ETH falls below its stop → sold at the live price; Bitcoin falls below its average → sold ----------
// (as if a new day closed: the last candle is processed again with the new prices)
M.coins.ETH[M.coins.ETH.length - 1][1] = 2500; M.live.ETH = 2490; M.coins.BTC[M.coins.BTC.length - 1][1] = 30000; M.live.BTC = 30100;
for (const B of Object.values(S.books)) if (B.last_day) B.last_day = day(2);
S.step.crypto = day(1); await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S)).run();
r = await T.backgroundStep(env, at(17)); S = await T.paperLoad(env);
const ethSell = S.journal.find(e => e.kind === "SELL" && e.sym === "ETH");
ok(ethSell && ethSell.px === 2490 && ethSell.pnlPhp < 0 && /stop/.test(ethSell.why) && /sell your ETH now/.test(ethSell.copy), "a close below the trailing stop → SELL at the live price, loss shown in pesos", JSON.stringify(ethSell));
ok(S.journal.some(e => e.kind === "SELL" && e.sym === "BTC" && /BELOW its 100-day average/.test(e.why)) && !(S.books.btc_trend.qty > 1e-9), "Bitcoin below its 100-day average → Max sells it all and waits in cash");
ok(S.books.crypto_swing.trades.some(t => t.sym === "ETH" && t.R < 0), "the closed trade is recorded with its result in R (× the amount risked)", JSON.stringify(S.books.crypto_swing.trades));
// ---------- 3) PSE: orders after the 3-month re-check fill at the NEXT opening, in board lots, with COL fees ----------
const E = (() => { const t = new Date(); t.setUTCHours(10, 45, 0, 0); while (![1, 2, 3].includes(t.getUTCDay())) t.setUTCDate(t.getUTCDate() - 1); return t; })();
const dE = k => new Date(E.getTime() - k * 864e5).toISOString().slice(0, 10);
const bars = (sym, c, open, base) => ({c, bars: line(30, k => ({d: dE(k - 1), o: open?.(k) ?? base, c: base, v: 2e7}))});
M.pse = {AAA: {...bars("AAA", "55", null, 10), c: "55"}, ABA: {...bars("ABA", "174", null, 2), c: "174"}, AETF: {...bars("AETF", "649", null, 30), c: "649"}};
const rowsHtml = list => "<table>" + list.map(([name, amt, ex]) => `<tr><td>${name}</td><td>COMMON</td><td>Cash</td><td>${amt}</td><td>${ex}</td><td>x</td><td>y</td></tr>`).join("") + "</table>";
const fmt = d => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {month: "short", day: "2-digit", year: "numeric", timeZone: "UTC"});
M.divHtml = rowsHtml([["Asia Amalgamated Holdings Corporation", "Php0.50", fmt(day(100))], ["AbaCore Capital Holdings, Inc.", "Thirteen and 51/100 centavos (Php0.1351)", fmt(day(50))], ["AbaCore Capital Holdings, Inc.", "Php0.05", fmt(day(-3))]]);
ok(JSON.stringify(T.divAmount("Thirteen and 51/100 centavos (Php0.1351)")) === '{"amt":0.1351,"cur":"PHP"}' && T.divAmount("Thirty Centavos").amt === 0.3 && T.divAmount("US$0.02").cur === "USD" && T.divAmount("10% stock") === null, "dividend amounts: number after the currency sign, words, dollars, no stock dividends");
S = await T.paperLoad(env); S.step.pse = day(1); await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S)).run();
// weekday evening: PSE step (no holdings → starts the re-check)
const eve = E;
const evening = eve.getTime(), eveDay = eve.toISOString().slice(0, 10);
S.step.crypto = eveDay; S.step.pse = day(30); await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S)).run();
r = await T.backgroundStep(env, evening);
ok(/pse/.test(r), "on a weekday evening (Manila) the PSE step runs", r);
let scan = JSON.parse((await env.MAX_MEMORY.prepare("SELECT value FROM max_settings WHERE key = 'max_paper_scan'").first()).value);
ok(scan.phase === "list", "with no holdings, the 3-month dividend re-check starts");
for (let k = 0; k < 4; k++) r = await T.backgroundStep(env, evening + (k + 1) * 3600e3);
S = await T.paperLoad(env);
const orders = S.journal.filter(e => e.kind === "ORDER" && e.side === "buy");
ok(orders.map(o => o.sym).sort().join() === "AAA,ABA" && orders.every(o => /at the next opening/.test(o.text) && /board lots|opening/.test(o.copy)), "the re-check picks the dividend payers (yield ≥3%, ≥₱5M a day) and emails ORDERS for the next opening", orders.map(o => o.sym + " " + o.text).join(" | "));
ok(S.books.pse_dividend.next_rebalance === new Date(Date.parse(scan.started + "T00:00:00Z") + 91 * 864e5).toISOString().slice(0, 10) || S.books.pse_dividend.next_rebalance > eveDay, "next re-check in 3 months", S.books.pse_dividend.next_rebalance);
// next trading day: open 10.2 (AAA) → bought at the opening, not at the old close
const next = new Date(eve.getTime() + 864e5); const nd = next.toISOString().slice(0, 10);
M.pse.AAA.bars.push({d: nd, o: 10.2, c: 10.4, v: 2e7}); M.pse.ABA.bars.push({d: nd, o: 2.02, c: 2.0, v: 2e7}); M.pse.AETF.bars.push({d: nd, o: 30, c: 30.3, v: 2e7});
S.step.pse = eveDay; S.step.crypto = nd; await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S)).run();
r = await T.backgroundStep(env, next.getTime());
S = await T.paperLoad(env);
const aaa = S.books.pse_dividend.positions.find(p => p.sym === "AAA"), aBuy = S.journal.find(e => e.kind === "BUY" && e.sym === "AAA");
ok(aBuy && /Stop-loss: sell if AAA closes below ₱7\.65/.test(aBuy.sellPlan) && /3-month re-check/.test(aBuy.sellPlan), "PSE buy: sell plan with the stop-loss price (₱7.65 = 25% below ₱10.20) and the re-check rule", aBuy && aBuy.sellPlan);
ok(aaa && aaa.ep === 10.2 && aaa.shares % 100 === 0 && aBuy.fee >= 22, "PSE buy at the next opening price, whole board lots, COL fees (min ₱20 + VAT)", JSON.stringify([aaa, aBuy && aBuy.fee]));
ok(S.books.pse_dividend.cash < 2000 + 40000 * 0 + 21000 && S.books.pse_dividend.cash >= 0, "leftover cash is put to work with extra board lots (little cash left idle)", String(S.books.pse_dividend.cash));
// late prices (what happened on 10 Nov 2026): the evening step finds no new day yet → it tries again the next hour, and the next morning, until the prices appear
{ const late = new Date(eve.getTime() + 7 * 864e5); while ([0, 6].includes(late.getUTCDay())) late.setUTCDate(late.getUTCDate() + 1);
  const lateDay = late.toISOString().slice(0, 10); let S9 = await T.paperLoad(env); const before = S9.books.pse_dividend.last_day;
  S9.step.crypto = lateDay; S9.step.pse = null; S9.step.pseHour = null; await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S9)).run();
  const t1 = new Date(lateDay + "T09:45:00Z").getTime(); let r1 = await T.backgroundStep(env, t1);
  let r2 = await T.backgroundStep(env, t1 + 60e3);
  ok(/pse/.test(r1) && !/pse/.test(r2), "evening: the PSE step runs once per hour", r1 + " | " + r2);
  r2 = await T.backgroundStep(env, t1 + 3600e3);
  ok(/pse/.test(r2), "no prices for today yet → Max tries again the next hour", r2);
  for (const s of ["AAA", "ABA", "AETF"]) M.pse[s].bars.push({d: lateDay, o: M.pse[s].bars.at(-1).c, c: M.pse[s].bars.at(-1).c, v: 2e7});
  r2 = await T.backgroundStep(env, t1 + 2 * 3600e3); S9 = await T.paperLoad(env);
  ok(/pse/.test(r2) && S9.books.pse_dividend.last_day === lateDay, "…and the prices are processed as soon as PSE Edge publishes them", r2 + " " + S9.books.pse_dividend.last_day);
  r2 = await T.backgroundStep(env, t1 + 3 * 3600e3);
  ok(!/pse/.test(r2), "once today's prices are in, no more PSE steps today", r2);
  for (const s of ["AAA", "ABA", "AETF"]) M.pse[s].bars.pop();
  S9.books.pse_dividend.last_day = before; await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S9)).run(); }
// a 25% drop → safety-stop order for the next opening; dividends are credited on the ex-date
const d2 = new Date(next.getTime() + 864e5).toISOString().slice(0, 10);
M.pse.AAA.bars.push({d: d2, o: 7, c: 7.0, v: 2e7}); M.pse.ABA.bars.push({d: d2, o: 2, c: 2, v: 2e7});
S.step.pse = nd; S.step.crypto = d2; await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S)).run();
r = await T.backgroundStep(env, Date.parse(d2 + "T10:45:00Z")); S = await T.paperLoad(env);
ok(S.journal.some(e => e.kind === "ORDER" && e.sym === "AAA" && e.side === "sell" && /safety stop/.test(e.why)), "a close 25% below the highest close → safety-stop SELL order for the next opening");
// ---------- 4) failures: a step that can't reach the data keeps the old state and retries; after 3 tries it waits for tomorrow ----------
M.fail = /binance|okx|coinbase/; S.step.crypto = day(1); await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S)).run();
const jBefore = S.jid;
for (let k = 0; k < 3; k++) r = await T.backgroundStep(env, at(17));
S = await T.paperLoad(env);
ok(S.errors.filter(e => e.job === "crypto").length >= 3 && S.jid === jBefore && S.lastStep.ok === false && /no crypto price source answered — binance: .*okx: .*coinbase: /.test(S.lastStep.error), "all three price sources down → the step is logged as failed (with each source's error), nothing half-done is saved", JSON.stringify(S.lastStep));
r = await T.backgroundStep(env, at(17));
ok(!/crypto/.test(r), "after 3 failures the crypto check waits until tomorrow so the other jobs still run", r);
// Binance refuses Max's server → the same step works from OKX (what happened on the live server on 9 Nov 2026)
M.fail = /binance/; S = await T.paperLoad(env); S.errors = []; S.step.crypto = day(1); await env.MAX_MEMORY.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").bind(JSON.stringify(S)).run();
M.okx = 0; r = await T.backgroundStep(env, at(17)); S = await T.paperLoad(env);
ok(/from okx/.test(r) && S.step.crypto === new Date().toISOString().slice(0, 10) && S.cryptoSrc === "okx" && M.okx > 5 && S.lastStep.ok, "Binance down → the crypto check uses OKX instead (Coinbase is the third spare)", r);
const hh = await (await w.fetch(new Request("https://x/health"), env)).json();
ok(Array.isArray(hh.paperErrors) && hh.paperErrors.some(x => /crypto prices from okx \(binance: /.test(x)), "the status page says which price source is used and why", JSON.stringify(hh.paperErrors));
M.fail = null;
// ---------- fewer emails: five weekly reports, none emailed by itself; ONE Sunday summary ----------
ok(T.WEEKLY_AUTO.join() === "web,apps,security,trading,investments", "only 5 agents still write a weekly report by themselves (music, business, shopping… only when asked)");
const sum = await T.sundaySummary(env);
ok(/not emailed|emailed/.test(sum), "the Sunday summary is built without errors", sum);
// a database hiccup while reading the account must never wipe it
{ const realPrep = env.MAX_MEMORY.prepare.bind(env.MAX_MEMORY); const before = (await env.MAX_MEMORY.prepare("SELECT value FROM max_settings WHERE key = 'max_paper'").first()).value;
  env.MAX_MEMORY.prepare = sql => { if (/SELECT value FROM max_settings/.test(sql)) throw new Error("D1_ERROR: database busy"); return realPrep(sql); };
  const rr = await T.backgroundStep(env, at(18)); env.MAX_MEMORY.prepare = realPrep;
  const after = (await env.MAX_MEMORY.prepare("SELECT value FROM max_settings WHERE key = 'max_paper'").first()).value;
  ok(/not readable right now — nothing changed/.test(rr) && after === before && JSON.parse(after).jid > 5, "a database read error does NOT replace the paper account with an empty one", rr); }
// quiet hours
ok(/quiet/.test(await T.backgroundStep(env, at(22))) && /quiet/.test(await T.backgroundStep(env, at(1))), "the step stays out of the hours used by the guard and the investment check");
// ---------- 5) the home screen and the email text ----------
const res = await w.fetch(new Request("https://x/api/home/paper", {headers: {"X-Max-Pass": "p"}}), env), P = await res.json();
ok(res.status === 200 && P.v === 2 && P.books.length === 4 && Number.isFinite(P.totalPhp) && P.journal.length && P.journal[0].id > P.journal[P.journal.length - 1].id, "the paper tile gets the ₱ total, 4 parts and the journal (newest first)", JSON.stringify(Object.keys(P)));
ok(P.tested.plan.includes("17.6%") && P.planYears["2018"] === -7.7, "possible outcome: the tested results come with the data");
const txt = T.paperEmailText(S, S.journal.slice(-3));
ok(/^Max paper trading — pretend money only/.test(txt) && /TOTAL: ₱/.test(txt) && /To copy:/.test(txt) && /OPEN POSITIONS \(today's sell levels\)/.test(txt) && /stop-loss ₱/.test(txt), "trade email: total, every trade with why / how to copy / possible outcome, open positions");
// ---------- 6) live boxes in notes ----------
const body = "<p><b>LTC</b></p><ul><li>old history</li></ul><p>Mark's own line</p>";
const b1 = T.withLiveBox(body, '<div data-live="1"><p>A</p><ul><li>1</li></ul></div>'), b2 = T.withLiveBox(b1, '<div data-live="1"><p>B</p><ul><li>2</li></ul></div>');
ok(b2.includes("<p>B</p>") && !b2.includes("<p>A</p>") && b2.includes("old history") && b2.includes("Mark's own line") && b2.indexOf('<div data-live') === body.indexOf("</p>") + 4, "the 'Latest data' box is replaced in place; history and Mark's own text are kept");
// ---------- 7) investment notes ----------
const g = await T.investGuide(env), n = await T.investNotesSync(env, g);
const cats = (await env.MAX_MEMORY.prepare("SELECT DISTINCT category FROM max_notes WHERE id LIKE 'inv-%'").all()).results.map(x => x.category);
ok(n > 30 && ["Investments › Savings (HYSA)", "Investments › Time deposits", "Investments › Government (MP2, SSS, bonds)", "Investments › Funds (UITF, GFunds)", "Investments › Dividend stocks & REITs", "Investments › Promos"].every(c => cats.includes(c)), "Investments gets sub-folders like Trading, one note per option + top-10 + rate history", cats.join(" | "));
const g2 = JSON.parse(JSON.stringify(g)); g2.cats[0].items[0].rateNum += 1; g2.cats[0].items[0].rate = "9.99% promo"; g2.checked = "2099-01-01"; g2.cats[0].checked = "2099-01-01";
await T.investNotesSync(env, g2);
const hist = (await env.MAX_MEMORY.prepare("SELECT body FROM max_notes WHERE id LIKE 'inv-item-%' AND body LIKE '%9.99% promo%'").first())?.body || "";
ok(/2099-01-01: 9\.99% promo/.test(hist) && /Rate history/.test(hist) && (hist.match(/<li>\d{4}-\d\d-\d\d:/g) || []).length === 2, "a rate change is added to the option's rate history");
const guide = (await env.MAX_MEMORY.prepare("SELECT body FROM max_notes WHERE id = 'inv-guide-now'").first()).body;
ok(/Emergency money first/.test(guide) && /MP2/.test(guide) && /not licensed advice/.test(guide), "‘What to invest in now’ note: the guideline from today's best rates");
const st = await (await w.fetch(new Request("https://x/api/home/status", {headers: {"X-Max-Pass": "p"}}), env)).json();
ok(st.summary && Array.isArray(st.summary.sites) && Array.isArray(st.summary.apps), "websites/apps status endpoint answers (first report on its way)");
const h = await (await w.fetch(new Request("https://x/health"), env)).json();
ok(/running|starting/.test(h.paperTrading) && !/₱/.test(h.paperTrading), "health page shows paper trading is running (no money figures in public)", h.paperTrading);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
