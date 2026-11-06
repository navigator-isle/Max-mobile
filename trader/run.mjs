// Max paper trader — runner. Usage: node trader/run.mjs <bootstrap|pse|crypto|fx|research> [DATA_DIR]
// PAPER MONEY ONLY: no broker or exchange account is connected, no order ever leaves this script.
import fs from 'node:fs'; import path from 'node:path';
import * as L from './lib.mjs';

const MODE = process.argv[2] || 'pse';
const DIR = process.argv[3] || process.env.TRADER_DATA || 'trader-data';
const OFFLINE = !!process.env.TRADER_OFFLINE;          // tests: use bars already on disk, no network
const TODAY = process.env.TRADER_TODAY || new Date().toISOString().slice(0, 10);
const UA = 'MaxPersonalAssistant/1.0 (paper trading research; +https://navigator-isle.github.io/Max-mobile/)';
const rd = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')); } catch { return d; } };
const wr = (f, v) => { fs.mkdirSync(path.dirname(path.join(DIR, f)), { recursive: true }); fs.writeFileSync(path.join(DIR, f), JSON.stringify(v)); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(...a);

export const PSE_TIERS = {
  blue: 'AC ACEN AEV AGI ALI AREIT BDO BLOOM BPI CBC CNPF CNVRG DMC EMI GLO GTCAP ICT JFC JGS LTG MBT MER MONDE PGOLD SCC SM SMC SMPH TEL URC'.split(' '),
  middle: 'CEB FGEN MWC PCOR SECB RRHI WLCON DNL FB NIKL PX AP FLI MEG RLC CLI VREIT DDMPR SPNEC AXLM CREIT FILRT PNB EW RCB PSB COSCO SSI MAXS PIZZA ALLHC'.split(' '),
  spec: 'DITO LPZ APX TECH MAC ATN IMI NOW DWC ABA BEL ROCK PHN SGI SLI MRSGI GSMI VLL CEI PLUS MEDIC CA ANS ECVC PAL MA BCOR SHLPH STI LODE OPM'.split(' '),
};
export const COINS = 'BTC ETH BNB SOL XRP ADA DOGE TRX LINK AVAX DOT LTC'.split(' ');
// Forex: the 7 majors, plus each one "the other way round" (e.g. USDEUR) so a long-only strategy can also bet against a currency.
export const FX = [...L.FX_MAJORS, ...L.FX_MAJORS.map(p => p.slice(3) + p.slice(0, 3))];
const tierOf = {}; for (const [t, l] of Object.entries(PSE_TIERS)) for (const s of l) tierOf[s] ??= t;
for (const c of COINS) tierOf[c] = 'crypto';
for (const f of FX) tierOf[f] = 'fx';
const MARKET_LIST = ['pse', 'crypto', 'fx'];

// Starting strategies — settings from Claude's 2015–2026 PSE backtest (see "PSE Strategy v1") and standard crypto equivalents.
const DEFAULTS = {
  pse: [
    { id: 'pse-momentum', template: 'rotation', params: { K: 3, look: 252, skip: 21, trendSma: 200 }, universe: PSE_TIERS.blue },
    { id: 'pse-breakout', template: 'breakout', params: { N: 20, volx: 1.5, stopATR: 3, maxDays: 60, trailATR: 0, risk: 1, maxPos: 6 }, universe: [...PSE_TIERS.middle, ...PSE_TIERS.spec] },
    { id: 'pse-breakout-blue', template: 'breakout', params: { N: 20, volx: 1.5, stopATR: 3, maxDays: 60, trailATR: 5, risk: 1, maxPos: 5 }, universe: PSE_TIERS.blue },
    { id: 'pse-rsi2', template: 'rsi2', params: { th: 10, stopATR: 3, maxDays: 10, risk: 1, maxPos: 5 }, universe: PSE_TIERS.blue },
    { id: 'pse-trend', template: 'trend', params: { fast: 50, slow: 200, maxPos: 6 }, universe: [...PSE_TIERS.blue, ...PSE_TIERS.middle] },
    { id: 'pse-candle', template: 'candle', params: { stopATR: 2, maxDays: 60, trailATR: 0, risk: 0.5, maxPos: 6 }, universe: [...PSE_TIERS.middle, ...PSE_TIERS.spec] },
  ],
  crypto: [
    { id: 'cx-rotation', template: 'rotation', params: { K: 3, look: 90, skip: 0, trendSma: 100 }, universe: COINS },
    { id: 'cx-breakout', template: 'breakout', params: { N: 20, volx: 1.25, stopATR: 3, maxDays: 60, trailATR: 4, risk: 1, maxPos: 5 }, universe: COINS },
    { id: 'cx-trend', template: 'trend', params: { fast: 50, slow: 200, maxPos: 5 }, universe: COINS },
    { id: 'cx-rsi2', template: 'rsi2', params: { th: 10, stopATR: 3, maxDays: 10, risk: 1, maxPos: 4 }, universe: COINS },
    { id: 'cx-candle', template: 'candle', params: { stopATR: 2, maxDays: 30, trailATR: 3, risk: 0.5, maxPos: 5 }, universe: COINS },
  ],
  // Forex has one price a day from the free data (no true high/low/open, no volume), so: no candle patterns, breakout without volume.
  fx: [
    { id: 'fx-trend', template: 'trend', params: { fast: 50, slow: 200, maxPos: 4 }, universe: FX },
    { id: 'fx-momentum', template: 'rotation', params: { K: 2, look: 120, skip: 0, trendSma: 100 }, universe: FX },
    { id: 'fx-breakout', template: 'breakout', params: { N: 55, volx: 0, stopATR: 3, maxDays: 90, trailATR: 4, risk: 1, maxPos: 4 }, universe: FX },
    { id: 'fx-rsi2', template: 'rsi2', params: { th: 8, stopATR: 3, maxDays: 8, risk: 1, maxPos: 3 }, universe: FX },
  ],
};
const LABEL = { rotation: 'Momentum rotation', breakout: 'Volume breakout', rsi2: 'RSI(2) dip-buy', trend: 'Trend following', candle: 'Candle reversal' };

// ---------- data ----------
const mdy = d => `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}-${d.getUTCFullYear()}`;
async function pseIds(universe) {
  const ids = rd('universe.json', {});
  for (const sym of Object.keys(tierOf).filter(s => !['crypto', 'fx'].includes(tierOf[s]))) {
    if (ids[sym]?.securityId) continue;
    try {
      const list = await (await fetch('https://edge.pse.com.ph/autoComplete/searchCompanyNameSymbol.ax?term=' + sym, { headers: { 'User-Agent': UA, Accept: 'application/json' } })).json();
      const c = list.find(x => String(x.symbol).toUpperCase() === sym); if (!c) { log('no PSE company', sym); continue; }
      const html = await (await fetch('https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=' + c.cmpyId, { headers: { 'User-Agent': UA } })).text();
      const sel = html.match(/<select[^>]*name=["']?security_id["']?[^>]*>([\s\S]*?)<\/select>/i)?.[1] || '';
      const opt = sel.match(/<option[^>]*value=["']?(\d+)["']?[^>]*selected/i) || sel.match(/<option[^>]*value=["']?(\d+)/i);
      if (opt) ids[sym] = { cmpyId: String(c.cmpyId), securityId: opt[1], name: c.cmpyNm };
      await sleep(300);
    } catch (e) { log('id error', sym, e.message); }
  }
  wr('universe.json', ids); return ids;
}
async function updatePse() {
  const ids = OFFLINE ? rd('universe.json', {}) : await pseIds();
  let fresh = 0;
  for (const [sym, id] of Object.entries(ids)) {
    const f = `bars/pse/${sym}.json`, bars = rd(f, []);
    if (OFFLINE) continue;
    const from = bars.length ? new Date(Date.parse(bars.at(-1)[0]) - 14 * 864e5) : new Date(Date.parse(TODAY) - 3 * 365 * 864e5);
    try {
      const r = await fetch('https://edge.pse.com.ph/common/DisclosureCht.ax', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': UA }, body: JSON.stringify({ cmpy_id: id.cmpyId, security_id: id.securityId, startDate: mdy(from), endDate: mdy(new Date(TODAY + 'T12:00:00Z')) }) });
      const rows = (await r.json()).chartData || [];
      const add = rows.map(x => [new Date(Date.parse(String(x.CHART_DATE).replace(/ 00:00:00$/, '') + ' UTC')).toISOString().slice(0, 10), +x.OPEN, +x.HIGH, +x.LOW, +x.CLOSE, +x.VALUE || 0]).filter(b => b.slice(1, 5).every(v => v > 0));
      const m = new Map(bars.map(b => [b[0], b])); for (const b of add) m.set(b[0], b);
      const out = [...m.values()].sort((a, b) => a[0] < b[0] ? -1 : 1).slice(-900);
      // stock split / stock dividend: back-adjust earlier prices so indicators don't see a fake crash
      for (let i = out.length - 1; i > 0; i--) { const k = out[i][1] / out[i - 1][4]; if (k < 0.62 || k > 1.6) { for (let j = 0; j < i; j++) for (const c of [1, 2, 3, 4]) out[j][c] = L.round4(out[j][c] * k); log('adjusted split', sym, out[i][0], k.toFixed(3)); } }
      wr(f, out); fresh++;
    } catch (e) { log('price error', sym, e.message); }
    await sleep(250);
  }
  log('PSE symbols updated:', fresh);
}
async function updateCrypto() {
  if (OFFLINE) return;
  for (const c of COINS) {
    let rows = null;
    for (const host of ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com']) {
      try { const r = await fetch(`${host}/api/v3/klines?symbol=${c}USDT&interval=1d&limit=1000`, { headers: { 'User-Agent': UA } }); if (r.ok) { rows = await r.json(); break; } } catch { }
    }
    if (!rows) { log('crypto price error', c); continue; }
    const now = Date.now();
    const bars = rows.filter(k => k[6] < now).map(k => [new Date(k[0]).toISOString().slice(0, 10), +k[1], +k[2], +k[3], +k[4], +k[7]]);
    wr(`bars/crypto/${c}.json`, bars);
  }
}
// Forex: daily reference rates (European Central Bank, via Frankfurter). One price a day per pair.
async function updateFx() {
  if (OFFLINE) return;
  const from = new Date(Date.parse(TODAY) - 3 * 365 * 864e5).toISOString().slice(0, 10), cur = 'EUR,GBP,JPY,AUD,CAD,CHF,NZD';
  let j = null;
  for (const u of [`https://api.frankfurter.app/${from}..${TODAY}?from=USD&to=${cur}`, `https://api.frankfurter.dev/v1/${from}..${TODAY}?base=USD&symbols=${cur}`]) {
    try { const r = await fetch(u, { headers: { 'User-Agent': UA } }); if (r.ok) { j = await r.json(); if (j.rates) break; } } catch { }
  }
  if (!j?.rates) { log('forex price error'); return; }
  const days = Object.keys(j.rates).sort();
  // USD per 1 unit: EURUSD = 1 / (EUR per USD); USDJPY = JPY per USD. The reversed pair is 1 / that.
  const closeOf = (pair, r) => { const a = pair.slice(0, 3), b = pair.slice(3); if (a === 'USD') return r[b]; if (b === 'USD') return r[a] ? 1 / r[a] : null; return null; };
  for (const pair of FX) {
    const bars = []; let prev = null;
    for (const d of days) { const c = closeOf(pair, j.rates[d]); if (!c) continue; const o = prev ?? c; bars.push([d, L.round4(o * 1e4) / 1e4 || o, Math.max(o, c), Math.min(o, c), c, 0]); prev = c; }
    wr(`bars/fx/${pair}.json`, bars.map(b => [b[0], +b[1].toPrecision(7), +b[2].toPrecision(7), +b[3].toPrecision(7), +b[4].toPrecision(7), 0]));
  }
  log('forex pairs updated:', FX.length, 'through', days.at(-1));
}
async function usdPhp(state) {
  if (OFFLINE) return state.fx?.usdphp || 58;
  for (const u of ['https://api.frankfurter.app/latest?from=USD&to=PHP', 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=PHP']) {
    try { const j = await (await fetch(u)).json(); if (j.rates?.PHP) { state.fx = { usdphp: j.rates.PHP, at: TODAY }; return j.rates.PHP; } } catch { }
  }
  return state.fx?.usdphp || 58;
}
function loadData(market) {
  const dir = path.join(DIR, 'bars', market); const by = {};
  if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) by[f.replace('.json', '')] = rd(`bars/${market}/${f}`, []);
  const data = L.prepare(by, tierOf);
  // drop symbols that stopped trading (suspended / delisted): no bar in the last 15 days of the market calendar
  const cal = L.calendar(data), last = cal.at(-1);
  for (const [s, d] of Object.entries(data)) if (Date.parse(last) - Date.parse(d.bars.at(-1)[0]) > 15 * 864e5) delete data[s];
  return data;
}

// ---------- events / notifications ----------
const events = rd('events.json', []);
let evSeq = events.at(-1)?.id || 0;
const say = (market, type, text, extra = {}) => { events.push({ id: ++evSeq, at: new Date().toISOString(), day: TODAY, market, type, text, ...extra }); log(`[${market}] ${text}`); };
const money = (market, x, fx) => market === 'crypto' ? `${x.toFixed(2)} USDT (≈₱${Math.round(x * fx).toLocaleString('en-US')})` : market === 'fx' ? `$${x.toFixed(2)} (≈₱${Math.round(x * fx).toLocaleString('en-US')})` : `₱${Math.round(x).toLocaleString('en-US')}`;
const qtyTxt = (market, q) => market === 'crypto' ? String(+q.toFixed(6)) : market === 'fx' ? (+q.toFixed(2)).toLocaleString('en-US') + ' units' : q.toLocaleString('en-US');

// ---------- the daily run for one market ----------
function freshMarket(market, fx, start) {
  return { books: {}, weights: {}, scores: {}, regimes: {}, lastDate: null, master: { market, cash: start, start, positions: {}, trades: [], equity: [], halt: false } };
}
function startBooks(S, market, data, asOf) {
  const cal = L.calendar(data); const end = cal.filter(d => d <= asOf).at(-1); const start = cal.find(d => d >= addDays(end, -3 * 365)) || cal[0];
  for (const cfg of DEFAULTS[market]) {
    if (S.books[cfg.id]) continue;
    const prior = L.backtest(market, data, cfg, start, end);
    S.books[cfg.id] = L.newBook({ ...cfg, market, startCash: S.master.start, created: asOf, origin: 'Claude (backtest Nov 2026)', prior });
    log('prior', cfg.id, JSON.stringify(prior));
  }
}
const addDays = (d, n) => new Date(Date.parse(d) + n * 864e5).toISOString().slice(0, 10);

function runDays(S, market, data, fx, until, quiet = false) {
  const cal = L.calendar(data).filter(d => d > (S.lastDate || '0000') && d <= until);
  for (const d of cal) {
    const prev = S.lastDate; const first = !prev || !!S.fresh; delete S.fresh;
    const reg = L.regime(market, data, d); S.regimes[d] = reg;
    const ctx = L.makeCtx(market, data, d, prev, { halt: S.master.halt }); if (first) { ctx.newMonth = true; ctx.newWeek = true; }
    for (const b of Object.values(S.books)) if (b.status === 'active') {
      const ev = L.stepBook(b, ctx);
      if (!quiet) for (const e of ev) if (e.type === 'sell' && Math.abs(e.ret) > 0.15) say(market, 'book', `${b.id}: closed ${e.sym} ${e.ret > 0 ? '+' : ''}${(e.ret * 100).toFixed(1)}% (${e.why}).`, { book: b.id });
    }
    // re-score and re-weight: monthly for PSE, weekly for crypto (and on the first day)
    const due = market === 'pse' ? ctx.newMonth : ctx.newWeek;
    if (due || first) {
      const sc = {}; for (const [id, b] of Object.entries(S.books)) if (b.status === 'active') { const r = L.score(b, S.regimes, reg); S.scores[id] = r; sc[id] = r.score; }
      const w = L.allocate(sc);
      const changed = JSON.stringify(w) !== JSON.stringify(S.weights);
      S.weights = w;
      if (changed && !quiet) say(market, 'weights', `Market looks ${reg}. Money now follows: ${Object.entries(w).sort((a, b) => b[1] - a[1]).map(([id, x]) => `${id} ${Math.round(x * 100)}%`).join(', ') || 'nobody — every strategy is losing, so the account stays in cash'}.`);
    }
    const ev = []; const eq = L.rebalanceMaster(S.master, S.books, S.weights, ctx, ev);
    if (!quiet) for (const e of ev) {
      const dp = market === 'pse' ? 2 : market === 'fx' ? 5 : 4;
      if (e.type === 'order') say(market, 'order', `Next ${market === 'pse' ? 'trading day' : 'day'} at the open: ${e.side.toUpperCase()} ${qtyTxt(market, e.qty)} ${e.sym} (last ${e.ref.toFixed(dp)}, about ${money(market, e.qty * e.ref, fx)}) — ${e.why}.`, { sym: e.sym, side: e.side, qty: e.qty });
      else if (e.type === 'master-buy') say(market, 'fill', `Bought ${qtyTxt(market, e.qty)} ${e.sym} at ${e.price.toFixed(dp)}.`, { sym: e.sym });
      else if (e.type === 'master-sell') say(market, 'fill', `Sold ${qtyTxt(market, e.qty)} ${e.sym} at ${e.price.toFixed(dp)} — ${e.pnl >= 0 ? 'profit' : 'loss'} ${money(market, Math.abs(e.pnl), fx)}.`, { sym: e.sym });
      else if (e.type === 'risk') say(market, 'risk', e.text);
    }
    S.lastDate = d;
  }
  // keep the regime log short
  const keys = Object.keys(S.regimes).sort(); for (const k of keys.slice(0, Math.max(0, keys.length - 800))) delete S.regimes[k];
  return cal.length;
}

// ---------- the researcher (weekly) ----------
function research(S, market, data, fx) {
  const cal = L.calendar(data), end = cal.at(-1), start = cal.find(d => d >= addDays(end, -2 * 365)) || cal[0];
  const split = cal.filter(d => d >= start)[Math.floor(cal.filter(d => d >= start).length * 0.7)];
  const r = L.rng(Date.parse(TODAY) / 864e5 + (market === 'crypto' ? 7 : market === 'fx' ? 13 : 0));
  const active = Object.values(S.books).filter(b => b.status === 'active');
  let tested = 0, adopted = [];
  for (const tpl of Object.keys(L.TEMPLATES)) {
    const parents = active.filter(b => b.template === tpl).sort((a, b) => (S.scores[b.id]?.score ?? 0) - (S.scores[a.id]?.score ?? 0));
    const parent = parents[0]; if (!parent) continue;
    const pOos = L.backtest(market, data, parent, split, end);
    let best = null;
    for (let k = 0; k < 6; k++) {
      const params = L.mutate(tpl, parent.params, r); if (JSON.stringify(params) === JSON.stringify(parent.params)) continue;
      const cfg = { template: tpl, params, universe: parent.universe };
      const ins = L.backtest(market, data, cfg, start, split), oos = L.backtest(market, data, cfg, split, end); tested++;
      if (!ins || !oos || ins.sharpe <= 0 || oos.sharpe <= 0 || oos.trades < 5) continue;
      if (oos.sharpe > (pOos?.sharpe ?? 0) + 0.2 && (!best || oos.sharpe > best.oos.sharpe)) best = { params, ins, oos };
    }
    if (best) {
      const id = `${parent.id.replace(/-v\d+$/, '')}-v${1 + Object.keys(S.books).filter(x => x.startsWith(parent.id.replace(/-v\d+$/, ''))).length}`;
      const full = L.backtest(market, data, { template: tpl, params: best.params, universe: parent.universe }, start, end);
      S.books[id] = L.newBook({ id, market, template: tpl, params: best.params, universe: parent.universe, origin: `researcher (from ${parent.id})`, startCash: S.master.start, created: S.lastDate, prior: full });
      // a new strategy starts with its backtest as its "prior" and earns real weight only by trading well live
      adopted.push(id);
      say(market, 'research', `New strategy on trial: ${id} (${LABEL[tpl]}, ${describe(tpl, best.params)}). On data it hadn't seen it scored ${best.oos.sharpe} vs ${pOos?.sharpe ?? 'n/a'} for ${parent.id}. It starts with pretend money and only gets real weight if it keeps winning.`, { book: id });
    }
  }
  // strategies Max's web researcher found this week (written to ideas.json by Max's server): test each once
  const ideas = (rd('ideas.json', {})[market] || []).filter(x => x && L.TEMPLATES[x.template]);
  S.ideasSeen ||= {};
  let ideasTested = 0;
  for (const idea of ideas.slice(0, 8)) {
    const key = idea.template + ':' + JSON.stringify(idea.params);
    if (S.ideasSeen[key]) continue;
    const universe = ideaUniverse(market, idea.universe);
    const cfg = { template: idea.template, params: { ...idea.params }, universe };
    const ins = L.backtest(market, data, cfg, start, split), oos = L.backtest(market, data, cfg, split, end); tested++; ideasTested++;
    const best = Math.max(0, ...active.filter(b => b.template === idea.template).map(b => L.backtest(market, data, b, split, end)?.sharpe ?? 0));
    const ok = ins && oos && ins.sharpe > 0 && oos.sharpe > 0.3 && oos.trades >= 5 && oos.sharpe > best;
    S.ideasSeen[key] = { at: TODAY, name: idea.name, source: idea.source, ins: ins?.sharpe ?? null, oos: oos?.sharpe ?? null, adopted: !!ok };
    if (ok) {
      const id = `${market === 'crypto' ? 'cx' : market}-web-${1 + Object.keys(S.books).filter(x => x.includes('-web-')).length}`;
      S.books[id] = L.newBook({ id, market, template: idea.template, params: cfg.params, universe, origin: `web research: ${String(idea.name || '').slice(0, 60)}${idea.source ? ' (' + String(idea.source).slice(0, 80) + ')' : ''}`, startCash: S.master.start, created: S.lastDate, prior: L.backtest(market, data, cfg, start, end) });
      adopted.push(id);
      say(market, 'research', `From the web: “${idea.name}” passed the test (score ${oos.sharpe} on data it hadn't seen, best existing ${best}). It's now on trial as ${id} with pretend money.`, { book: id });
    } else say(market, 'research', `From the web: “${idea.name}” tested ${oos ? 'at ' + oos.sharpe : 'with too few trades'} on unseen data — not good enough, not used.`);
  }
  // retire: keep at most 9 active per market; the weakest with ≥ 60 live days goes
  const act = Object.values(S.books).filter(b => b.status === 'active');
  if (act.length > 9) {
    const old = act.filter(b => (S.scores[b.id]?.liveDays ?? 0) >= 60).sort((a, b) => (S.scores[a.id]?.score ?? 0) - (S.scores[b.id]?.score ?? 0));
    for (const b of old.slice(0, act.length - 9)) { b.status = 'retired'; say(market, 'research', `Retired ${b.id}: weakest results over ${S.scores[b.id]?.liveDays} days.`, { book: b.id }); }
  }
  log(`[${market}] research: tested ${tested} variants (${ideasTested} from the web), adopted ${adopted.length}`);
  return { tested, ideasTested, adopted };
}
function ideaUniverse(market, u) {
  if (market === 'crypto') return COINS;
  if (market === 'fx') return FX;
  const t = String(u || 'blue').toLowerCase();
  return t === 'all' ? [...PSE_TIERS.blue, ...PSE_TIERS.middle, ...PSE_TIERS.spec] : t === 'middle' ? PSE_TIERS.middle : t === 'spec' ? PSE_TIERS.spec : t === 'blue+middle' ? [...PSE_TIERS.blue, ...PSE_TIERS.middle] : PSE_TIERS.blue;
}
const describe = (tpl, p) => tpl === 'rotation' ? `top ${p.K}, ${p.look}-day momentum` : tpl === 'breakout' ? `${p.N}-day high, ${p.volx}× volume, stop ${p.stopATR} ATR, ${p.maxDays} days` : tpl === 'rsi2' ? `RSI(2) < ${p.th}, stop ${p.stopATR} ATR` : tpl === 'trend' ? `${p.fast}/${p.slow}-day averages` : `stop ${p.stopATR} ATR, ${p.maxDays} days`;

// ---------- summary for Max (small file the app reads) ----------
function summary(state, fx) {
  const out = { updated: new Date().toISOString(), fx, paperOnly: true, markets: {} };
  for (const market of MARKET_LIST) {
    const S = state.markets[market]; if (!S) continue;
    const data = loadData(market), m = S.master;
    const px = s => data[s]?.bars.at(-1)?.[4];
    const eq = m.equity.at(-1)?.[1] ?? m.start;
    out.markets[market] = {
      name: L.MARKETS[market].name, ccy: L.MARKETS[market].ccy, start: m.start, equity: eq, cash: L.round2(m.cash), lastDate: S.lastDate, regime: S.regimes[S.lastDate] || 'unknown', halted: !!m.halt,
      returnPct: L.round4(eq / m.start - 1), curve: m.equity.slice(-260),
      positions: Object.entries(m.positions).map(([sym, p]) => ({ sym, qty: p.qty, entry: L.round4(p.entry), last: px(sym) ?? p.last, value: L.round2(p.qty * (px(sym) ?? p.last)), pnlPct: L.round4((px(sym) ?? p.last) / p.entry - 1), since: p.date })),
      trades: m.trades.slice(-30).reverse(), orders: (m.pending || []).map(o => ({ side: o.side, sym: o.sym, qty: o.qty, why: o.why })),
      strategies: Object.values(S.books).map(b => ({ id: b.id, kind: LABEL[b.template], template: b.template, params: b.params, status: b.status, origin: b.origin, weight: S.weights[b.id] || 0, score: S.scores[b.id]?.score ?? null, liveDays: S.scores[b.id]?.liveDays ?? 0, returnPct: L.round4((b.equity.at(-1)?.[1] ?? b.start) / b.start - 1), trades: b.trades.length, wins: b.trades.filter(t => t.pnl > 0).length, prior: b.prior })).sort((a, b) => b.weight - a.weight || (b.score ?? -9) - (a.score ?? -9)),
    };
  }
  out.research = Object.fromEntries(MARKET_LIST.map(k => [k, { ...(state.research?.[k] || {}), ideas: Object.entries(state.markets[k]?.ideasSeen || {}).slice(-20).map(([, v]) => v) }]));
  out.events = events.slice(-60).reverse();
  out.replay = rd('replay.json', null)?.summary || null;
  return out;
}

// ---------- main ----------
const state = rd('state.json', { version: 1, created: TODAY, markets: {}, research: {} });
const fx = await usdPhp(state);
const markets = MODE === 'bootstrap' || MODE === 'research' ? MARKET_LIST : [MODE];
if (MODE === 'bootstrap' || MODE === 'pse' || MODE === 'research') if (markets.includes('pse')) await updatePse();
if (markets.includes('crypto')) await updateCrypto();
if (markets.includes('fx')) await updateFx();

for (const market of markets) {
  const data = loadData(market);
  if (!Object.keys(data).length) { log('no data for', market); continue; }
  const start = market === 'pse' ? L.MARKETS.pse.start : L.round2(L.MARKETS[market].startPhp / fx);
  const lastDay = L.calendar(data).at(-1);
  if (!state.markets[market]) {
    // Replay test: the same engine, fresh pretend money, run day by day through 2026 so far.
    const R = freshMarket(market, fx, start); startBooks(R, market, data, '2025-12-31');
    R.lastDate = L.calendar(data).filter(d => d <= '2025-12-31').at(-1);
    for (const b of Object.values(R.books)) b.created = R.lastDate;
    R.fresh = true;
    const replayEvents = events.length; runDays(R, market, data, fx, lastDay, true);
    const rep = rd('replay.json', { markets: {} });
    rep.markets[market] = { from: '2026-01-01', to: lastDay, start, end: R.master.equity.at(-1)?.[1], curve: R.master.equity, trades: R.master.trades.length, weights: R.weights, books: Object.fromEntries(Object.values(R.books).map(b => [b.id, { ret: L.round4((b.equity.at(-1)?.[1] ?? b.start) / b.start - 1), trades: b.trades.length }])) };
    const bh = market === 'fx' ? 0 : (() => { const syms = market === 'pse' ? PSE_TIERS.blue : COINS; const r = syms.map(s => { const d = data[s]; if (!d) return null; const a = d.bars.find(b => b[0] >= '2026-01-01'), z = d.bars.at(-1); return a ? z[4] / a[4] - 1 : null; }).filter(x => x !== null); return r.reduce((s, x) => s + x, 0) / r.length; })();
    rep.markets[market].buyHoldPct = L.round4(bh);
    rep.summary = Object.fromEntries(Object.entries(rep.markets).map(([k, v]) => [k, { from: v.from, to: v.to, returnPct: L.round4(v.end / v.start - 1), buyHoldPct: v.buyHoldPct, trades: v.trades }]));
    wr('replay.json', rep);
    events.length = replayEvents;
    say(market, 'start', `Paper trading started: ${money(market, start, fx)} of pretend money, ${DEFAULTS[market].length} strategies. Test run Jan–${lastDay}: ${((rep.summary[market].returnPct) * 100).toFixed(1)}% vs ${(bh * 100).toFixed(1)}% for ${market === 'fx' ? 'just holding cash' : 'buying and holding ' + (market === 'pse' ? 'the blue chips' : 'the 12 coins')}.`);
    // Live account starts fresh today.
    const S = freshMarket(market, fx, start); startBooks(S, market, data, lastDay); S.lastDate = L.calendar(data).filter(d => d < lastDay).at(-1); S.fresh = true;
    state.markets[market] = S;
  }
  const S = state.markets[market];
  if (MODE !== 'research') { const n = runDays(S, market, data, fx, lastDay); log(`[${market}] processed ${n} new day(s) up to ${S.lastDate}`); }
  if (MODE === 'research') { const r = research(S, market, data, fx); state.research[market] = { at: TODAY, ...r }; }
}
if (MODE === 'research') {
  for (const market of MARKET_LIST) { const S = state.markets[market]; if (!S) continue; const m = S.master, eq = m.equity.at(-1)?.[1] ?? m.start, wk = m.equity.at(market === 'crypto' ? -8 : -6)?.[1] ?? m.start;
    say(market, 'weekly', `Week in review: account ${money(market, eq, fx)} (${((eq / m.start - 1) * 100).toFixed(1)}% since start, ${((eq / wk - 1) * 100).toFixed(1)}% this week). ${Object.keys(m.positions).length} open position(s). Market: ${S.regimes[S.lastDate] || 'unknown'}.`); }
}
state.updated = new Date().toISOString();
wr('state.json', state);
wr('events.json', events.slice(-400));
wr('summary.json', summary(state, fx));
log('done', MODE);
