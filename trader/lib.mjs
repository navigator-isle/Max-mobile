// Max paper trader — the core: indicators, fees, strategies, paper books, allocation, research.
// PAPER MONEY ONLY. Nothing here can place a real order: there is no broker or exchange key anywhere.
// Signals are read at a day's close and filled at the NEXT day's open (no look-ahead).

export const MARKETS = {
  pse: { name: 'PSE (COL Financial fees)', ccy: 'PHP', start: 100_000 },
  crypto: { name: 'Crypto (Binance spot fees)', ccy: 'USDT', startPhp: 100_000 },
};

// ---------- fees ----------
// COL Financial: 0.25% commission (min ₱20) + 12% VAT; PSE fee 0.005%; SCCP 0.01%; sells add 0.1% stock transaction tax (RA 12214, from 1 Jul 2025).
// Binance spot (regular user, no BNB discount): 0.1% per side.
const SLIP = { blue: 0.0015, middle: 0.003, spec: 0.006, crypto: 0.0005 };
export function fee(market, gross, side) {
  if (market === 'crypto') return gross * 0.001;
  const comm = Math.max(20, gross * 0.0025) * 1.12;
  return comm + gross * 0.00015 + (side === 'sell' ? gross * 0.001 : 0);
}
export const slip = (market, tier) => SLIP[market === 'crypto' ? 'crypto' : tier] ?? 0.003;
export function boardLot(p) {
  for (const [lim, lot] of [[0.01, 1e6], [0.05, 1e5], [0.5, 1e4], [5, 1e3], [50, 100], [1000, 10]]) if (p < lim) return lot;
  return 5;
}
export function roundQty(market, qty, price) {
  if (market === 'crypto') return Math.floor(qty * 1e6) / 1e6;
  const lot = boardLot(price); return Math.floor(qty / lot) * lot;
}

// ---------- indicators (per symbol, arrays aligned to bars) ----------
const sma = (a, n) => { const o = new Array(a.length).fill(NaN); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) o[i] = s / n; } return o; };
const ema = (a, n) => { const o = []; const k = 2 / (n + 1); let e = a[0]; for (let i = 0; i < a.length; i++) { e = i ? a[i] * k + e * (1 - k) : a[i]; o.push(e); } return o; };
function rollMax(a, n) { const o = new Array(a.length).fill(NaN); for (let i = n; i < a.length; i++) { let m = -Infinity; for (let k = i - n; k < i; k++) if (a[k] > m) m = a[k]; o[i] = m; } return o; }   // previous n bars, excluding today
export function indicators(bars) {
  const o = bars.map(b => b[1]), h = bars.map(b => b[2]), l = bars.map(b => b[3]), c = bars.map(b => b[4]), v = bars.map(b => b[5] || 0);
  const tr = c.map((x, i) => i ? Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])) : h[i] - l[i]);
  const rsi2 = []; let g = 0, d = 0;
  for (let i = 0; i < c.length; i++) { const ch = i ? c[i] - c[i - 1] : 0; g = (g + Math.max(ch, 0)) / 2; d = (d + Math.max(-ch, 0)) / 2; rsi2.push(d === 0 ? 100 : 100 - 100 / (1 + g / d)); }
  const I = { o, h, l, c, v, atr: sma(tr, 14), sma5: sma(c, 5), sma20: sma(c, 20), sma50: sma(c, 50), sma100: sma(c, 100), sma200: sma(c, 200), ema20: ema(c, 20), val20: sma(v, 20), rsi2 };
  const hh = {}; I.hh = n => (hh[n] ||= rollMax(h, n));
  return I;
}
const bodyUp = (I, i) => I.c[i] > I.o[i];
export function bullishCandle(I, i) {
  if (i < 3) return false;
  const { o, h, l, c, atr } = I, body = Math.abs(c[i] - o[i]), lower = Math.min(o[i], c[i]) - l[i], upper = h[i] - Math.max(o[i], c[i]);
  const engulf = c[i - 1] < o[i - 1] && c[i] > o[i] && c[i] >= o[i - 1] && o[i] <= c[i - 1];
  const hammer = body > 0 && lower >= 2 * body && upper <= body && c[i - 1] < c[Math.max(0, i - 5)];
  const mstar = c[i - 2] < o[i - 2] && Math.abs(c[i - 2] - o[i - 2]) > 0.6 * atr[i] && Math.abs(c[i - 1] - o[i - 1]) < 0.3 * atr[i] && bodyUp(I, i) && c[i] > (o[i - 2] + c[i - 2]) / 2;
  return engulf || hammer || mstar;
}
const uptrend = (I, i) => I.c[i] > I.sma50[i] && I.sma50[i] > I.sma200[i] && I.sma50[i] > I.sma50[i - 10];

// ---------- strategy templates (each from a well-known public source) ----------
// rotation  — cross-sectional momentum (Jegadeesh & Titman 1993; "12-1" momentum)
// breakout  — channel breakout with volume, ATR stop (Donchian / Turtle traders)
// rsi2      — short-term pullbacks in long-term uptrends (Larry Connors' RSI(2))
// trend     — moving-average trend following (golden-cross family)
// candle    — Japanese candlestick reversals inside an uptrend (Nison)
export const TEMPLATES = {
  rotation: { bounds: { K: [2, 6, 1], look: [60, 300, 10], skip: [0, 30, 5], trendSma: [100, 200, 100] } },
  breakout: { bounds: { N: [10, 55, 5], volx: [1, 2.5, 0.25], stopATR: [1.5, 4, 0.5], maxDays: [10, 120, 10], trailATR: [0, 6, 1], risk: [0.5, 1.5, 0.25] } },
  rsi2: { bounds: { th: [3, 20, 1], stopATR: [2, 4, 0.5], maxDays: [3, 15, 1], risk: [0.5, 1.5, 0.25] } },
  trend: { bounds: { fast: [20, 100, 10], slow: [100, 250, 25], maxPos: [3, 8, 1] } },
  candle: { bounds: { stopATR: [1.5, 4, 0.5], maxDays: [10, 90, 10], trailATR: [0, 6, 1], risk: [0.25, 1, 0.25] } },
};

// ---------- a paper book: one strategy, its own ₱100k (or USDT) ----------
export function newBook({ id, market, template, params, universe, origin, startCash, created, prior }) {
  return { id, market, template, params, universe, origin, created, status: 'active', cash: startCash, start: startCash, positions: {}, pending: [], equity: [], trades: [], prior: prior || null };
}
const equityOf = (book, px) => book.cash + Object.entries(book.positions).reduce((s, [sym, p]) => s + p.qty * (px(sym) ?? p.last ?? p.entry), 0);

// Process ONE trading day for a book. ctx = { date, syms: {sym: {I, idx (index of today or -1), tier}}, regime, month change, week change }
export function stepBook(book, ctx) {
  const M = book.market, P = book.params, events = [];
  const at = (sym) => { const s = ctx.syms[sym]; return s && s.idx >= 0 ? s : null; };
  const pxClose = sym => { const s = at(sym); return s ? s.I.c[s.idx] : null; };
  // 1) fill yesterday's orders at today's open
  const still = [];
  for (const od of book.pending) {
    const s = at(od.sym); if (!s) { if (++od.wait <= 3) still.push(od); continue; }
    const open = s.I.o[s.idx], sl = slip(M, s.tier);
    if (od.side === 'buy') {
      if (book.positions[od.sym]) continue;
      const price = open * (1 + sl);
      let qty = roundQty(M, Math.min(od.qty ?? Infinity, (od.amount ?? Infinity) / price), price);
      const cost = q => q * price + fee(M, q * price, 'buy');
      while (qty > 0 && cost(qty) > book.cash) qty = roundQty(M, qty - (M === 'crypto' ? qty * 0.02 : boardLot(price)), price);
      if (qty <= 0 || (M === 'crypto' && qty * price < 5)) continue;
      book.cash -= cost(qty);
      const stop = od.stopDist ? price - od.stopDist : 0;
      book.positions[od.sym] = { qty, entry: price, date: ctx.date, stop, hi: price, last: open, bars: 0, why: od.why };
      events.push({ type: 'buy', sym: od.sym, qty, price, why: od.why });
    } else {
      const p = book.positions[od.sym]; if (!p) continue;
      closePos(book, od.sym, open * (1 - sl), ctx.date, od.why, events);
    }
  }
  book.pending = still;
  // 2) stops during the day (gap-aware), then mark to close
  for (const [sym, p] of Object.entries(book.positions)) {
    const s = at(sym); if (!s) continue;
    const i = s.idx, sl = slip(M, s.tier);
    p.bars++;
    if (p.stop && p.bars > 1 && s.I.l[i] <= p.stop) { closePos(book, sym, Math.min(s.I.o[i], p.stop) * (1 - sl), ctx.date, 'stop', events); continue; }
    p.last = s.I.c[i]; p.hi = Math.max(p.hi, s.I.c[i]);
    if (P.trailATR && Number.isFinite(s.I.atr[i])) p.stop = Math.max(p.stop || 0, p.hi - P.trailATR * s.I.atr[i]);
  }
  // 3) exits and entries decided at today's close (filled next open)
  const eq = equityOf(book, pxClose);
  const exit = (sym, why) => { if (!book.pending.some(o => o.sym === sym)) book.pending.push({ side: 'sell', sym, why, wait: 0 }); };
  const buy = (sym, why, stopDist, amount) => { if (!book.positions[sym] && !book.pending.some(o => o.sym === sym)) book.pending.push({ side: 'buy', sym, why, stopDist, amount, wait: 0 }); };
  const live = Object.entries(ctx.syms).filter(([sym, s]) => s.idx >= 200 && book.universe.includes(sym) && (s.minVal == null || s.I.val20[s.idx] >= s.minVal));
  const openCount = () => Object.keys(book.positions).length + book.pending.filter(o => o.side === 'buy').length;
  const sized = (s, stopDist) => Math.min(eq * (P.risk ?? 1) / 100 * s.I.c[s.idx] / stopDist, eq * 0.25);   // risk % of equity, max 25% in one name
  const halted = ctx.halt;  // master risk breaker: no new entries
  if (book.template === 'rotation') {
    const due = M === 'crypto' ? ctx.newWeek : ctx.newMonth;
    if (due) {
      const ranked = live.map(([sym, s]) => { const i = s.idx, look = P.look, skip = P.skip || 0; const m = i > look ? s.I.c[i - skip] / s.I.c[i - look] - 1 : NaN; const ok = s.I.c[i] > (P.trendSma === 100 ? s.I.sma100[i] : s.I.sma200[i]) && m > 0; return { sym, m, ok }; })
        .filter(x => x.ok && Number.isFinite(x.m)).sort((a, b) => b.m - a.m).slice(0, P.K).map(x => x.sym);
      for (const sym of Object.keys(book.positions)) if (!ranked.includes(sym)) exit(sym, 'rotated out');
      if (!halted) for (const sym of ranked) buy(sym, 'top momentum', 0, eq / P.K * 0.98);
    }
  } else {
    for (const [sym, p] of Object.entries(book.positions)) {
      const s = at(sym); if (!s) continue; const i = s.idx;
      if (P.maxDays && p.bars >= P.maxDays) exit(sym, 'time limit');
      else if (book.template === 'rsi2' && s.I.c[i] > s.I.sma5[i]) exit(sym, 'bounced (close > 5-day avg)');
      else if (book.template === 'trend' && s.I.c[i] < (P.fast === 50 ? s.I.sma50[i] : smaAt(s.I.c, i, P.fast))) exit(sym, 'trend broke');
    }
    if (!halted) {
      const maxPos = P.maxPos ?? 6;
      const cands = [];
      for (const [sym, s] of live) {
        if (book.positions[sym]) continue;
        const i = s.idx, I = s.I, atr = I.atr[i]; if (!Number.isFinite(atr) || atr <= 0) continue;
        let ok = false, why = '', stopDist = (P.stopATR ?? 3) * atr;
        if (book.template === 'breakout') { ok = uptrend(I, i) && I.c[i] > I.hh(P.N)[i] && I.v[i] >= P.volx * I.val20[i]; why = `${P.N}-day high on ${(I.v[i] / I.val20[i]).toFixed(1)}× volume`; }
        else if (book.template === 'rsi2') { ok = I.c[i] > I.sma200[i] && I.rsi2[i] < P.th; why = `RSI(2) ${I.rsi2[i].toFixed(0)} in an uptrend`; }
        else if (book.template === 'trend') { const f = smaAt(I.c, i, P.fast), sl = smaAt(I.c, i, P.slow), f1 = smaAt(I.c, i - 1, P.fast); ok = I.c[i] > f && f > sl && !(I.c[i - 1] > f1); why = `crossed above its ${P.fast}-day average`; stopDist = Math.min(I.c[i] * 0.2, 4 * atr); }
        else if (book.template === 'candle') { ok = uptrend(I, i) && bullishCandle(I, i) && I.l[i] <= I.ema20[i] + 0.5 * atr; why = 'bullish candle at the 20-day average'; }
        stopDist = Math.min(stopDist, I.c[i] * 0.15);
        if (ok) cands.push({ sym, why, stopDist, rank: I.v[i] / (I.val20[i] || 1), s });
      }
      cands.sort((a, b) => b.rank - a.rank);
      for (const c of cands) { if (openCount() >= maxPos) break; const amt = book.template === 'trend' ? eq / maxPos * 0.98 : sized(c.s, c.stopDist); buy(c.sym, c.why, c.stopDist, amt); }
    }
  }
  book.equity.push([ctx.date, round2(equityOf(book, pxClose))]);
  if (book.equity.length > 1500) book.equity.splice(0, book.equity.length - 1500);
  return events;
}
const smaAt = (c, i, n) => { if (i < n - 1) return NaN; let s = 0; for (let k = i - n + 1; k <= i; k++) s += c[k]; return s / n; };
function closePos(book, sym, price, date, why, events) {
  const p = book.positions[sym]; const gross = p.qty * price, f = fee(book.market, gross, 'sell');
  book.cash += gross - f;
  const buyFee = fee(book.market, p.qty * p.entry, 'buy');
  const pnl = gross - f - p.qty * p.entry - buyFee;
  const t = { sym, entryDate: p.date, exitDate: date, qty: p.qty, entry: round4(p.entry), exit: round4(price), pnl: round2(pnl), ret: round4(pnl / (p.qty * p.entry)), why, entryWhy: p.why };
  book.trades.push(t); if (book.trades.length > 400) book.trades.splice(0, book.trades.length - 400);
  delete book.positions[sym]; events.push({ type: 'sell', ...t });
}
export const round2 = x => Math.round(x * 100) / 100;
export const round4 = x => Math.round(x * 1e4) / 1e4;

// ---------- calendar helper: run books across a date range ----------
export function makeCtx(market, data, date, prevDate, extra = {}) {
  const syms = {};
  for (const [sym, d] of Object.entries(data)) {
    const idx = d.index.get(date);
    syms[sym] = { I: d.I, idx: idx ?? -1, tier: d.tier, minVal: market === 'pse' ? 5e6 : null };
  }
  const nm = prevDate && prevDate.slice(0, 7) !== date.slice(0, 7);
  const nw = prevDate && weekOf(prevDate) !== weekOf(date);
  return { date, syms, newMonth: !!nm, newWeek: !!nw, ...extra };
}
const weekOf = d => { const t = new Date(d + 'T00:00:00Z'); const day = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - day); return t.toISOString().slice(0, 10); };
export function prepare(barsBySym, tiers) {
  const out = {};
  for (const [sym, bars] of Object.entries(barsBySym)) {
    if (bars.length < 60) continue;
    out[sym] = { bars, I: indicators(bars), index: new Map(bars.map((b, i) => [b[0], i])), tier: tiers[sym] };
  }
  return out;
}
export const calendar = data => [...new Set(Object.values(data).flatMap(d => d.bars.map(b => b[0])))].sort();

// ---------- regime: the market's current "scenario" ----------
export function regime(market, data, date) {
  if (market === 'pse') {
    const blue = Object.values(data).filter(d => d.tier === 'blue').map(d => { const i = d.index.get(date); return i != null && Number.isFinite(d.I.sma200[i]) ? d.I.c[i] > d.I.sma200[i] : null; }).filter(x => x !== null);
    if (!blue.length) return 'unknown';
    const share = blue.filter(Boolean).length / blue.length;
    return share >= 0.6 ? 'bull' : share <= 0.4 ? 'bear' : 'sideways';
  }
  const b = data.BTC; const i = b && b.index.get(date); if (i == null || !Number.isFinite(b.I.sma200[i])) return 'unknown';
  const r20 = b.I.c[i] / b.I.c[Math.max(0, i - 20)] - 1;
  return b.I.c[i] > b.I.sma200[i] ? (r20 < -0.1 ? 'sideways' : 'bull') : (r20 > 0.1 ? 'sideways' : 'bear');
}

// ---------- scoring and allocation (how Max "adapts") ----------
// score = risk-adjusted return (annualised mean / volatility) of the book's daily equity, blended with its
// backtest prior while live history is short, and weighted toward days in the current regime when there are enough.
export function score(book, regimes, current) {
  const e = book.equity; const r = [];
  for (let i = 1; i < e.length; i++) r.push({ d: e[i][0], x: e[i][1] / e[i - 1][1] - 1 });
  const stat = arr => { if (arr.length < 10) return null; const m = arr.reduce((s, x) => s + x, 0) / arr.length, sd = Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length) || 1e-9; return m / sd * Math.sqrt(252); };
  const recent = r.slice(-120).map(z => z.x), inReg = r.filter(z => regimes[z.d] === current).slice(-120).map(z => z.x);
  const live = stat(recent), reg = inReg.length >= 30 ? stat(inReg) : null;
  const prior = book.prior?.sharpe ?? 0, w = Math.min(1, recent.length / 120);
  let s = (1 - w) * prior + w * (live ?? prior);
  if (reg !== null) s = 0.5 * s + 0.5 * reg;
  return { score: round2(s), liveDays: recent.length, regimeScore: reg === null ? null : round2(reg) };
}
export function allocate(scores, maxW = 0.4) {
  const pos = Object.entries(scores).filter(([, s]) => s > 0.1);
  if (!pos.length) return {};
  const tot = pos.reduce((a, [, s]) => a + s, 0);
  let w = Object.fromEntries(pos.map(([id, s]) => [id, s / tot]));
  for (let k = 0; k < 5; k++) {   // cap any one strategy at 40%, spread the excess
    const over = Object.entries(w).filter(([, x]) => x > maxW); if (!over.length) break;
    let extra = 0; for (const [id, x] of over) { extra += x - maxW; w[id] = maxW; }
    const rest = Object.entries(w).filter(([, x]) => x < maxW), rt = rest.reduce((a, [, x]) => a + x, 0);
    if (!rt) break; for (const [id, x] of rest) w[id] = x + extra * x / rt;
  }
  const total = Object.values(w).reduce((a, x) => a + x, 0);
  if (total > 1) for (const id in w) w[id] /= total;
  return Object.fromEntries(Object.entries(w).map(([id, x]) => [id, round4(x)]).filter(([, x]) => x >= 0.05));
}

// ---------- the master account: the one you would copy ----------
// It holds a slice of each winning book: target quantity = Σ book qty × (weight × master equity / book equity).
// Trades only when the difference is worth the fees.
export function rebalanceMaster(master, books, weights, ctx, events) {
  const M = master.market, px = sym => { const s = ctx.syms[sym]; return s && s.idx >= 0 ? s.I.c[s.idx] : null; };
  master.pending ||= [];
  // A) fill yesterday's orders at today's open — exactly what you would get by copying them
  const keep = [];
  for (const od of master.pending.sort((a, b) => (a.side === 'sell' ? 0 : 1) - (b.side === 'sell' ? 0 : 1))) {
    const s = ctx.syms[od.sym]; if (!s || s.idx < 0) { if (++od.wait <= 3) keep.push(od); continue; }
    const open = s.I.o[s.idx];
    if (od.side === 'sell') {
      const p = master.positions[od.sym]; if (!p) continue;
      const q = Math.min(p.qty, od.qty), fill = open * (1 - slip(M, s.tier)), gross = q * fill;
      master.cash += gross - fee(M, gross, 'sell');
      const pnl = q * (fill - p.entry) - fee(M, gross, 'sell') - fee(M, q * p.entry, 'buy');
      master.trades.push({ sym: od.sym, side: 'sell', date: ctx.date, qty: q, price: round4(fill), pnl: round2(pnl), why: od.why });
      events.push({ type: 'master-sell', sym: od.sym, qty: q, price: fill, pnl, why: od.why });
      p.qty = round4(p.qty - q); if (p.qty <= (M === 'crypto' ? 1e-6 : 0)) delete master.positions[od.sym];
    } else {
      const fill = open * (1 + slip(M, s.tier)); let q = roundQty(M, od.qty, fill);
      while (q > 0 && q * fill + fee(M, q * fill, 'buy') > master.cash) q = roundQty(M, q - (M === 'crypto' ? q * 0.02 : boardLot(fill)), fill);
      if (q <= 0) continue;
      master.cash -= q * fill + fee(M, q * fill, 'buy');
      const p = master.positions[od.sym] || { qty: 0, entry: fill, date: ctx.date };
      p.entry = (p.entry * p.qty + fill * q) / (p.qty + q); p.qty = round4(p.qty + q); p.last = open; master.positions[od.sym] = p;
      master.trades.push({ sym: od.sym, side: 'buy', date: ctx.date, qty: q, price: round4(fill), why: od.why });
      events.push({ type: 'master-buy', sym: od.sym, qty: q, price: fill, why: od.why });
    }
  }
  master.pending = keep;
  for (const [sym, p] of Object.entries(master.positions)) { const v = px(sym); if (v) p.last = v; }
  const eq = round2(master.cash + Object.values(master.positions).reduce((s, p) => s + p.qty * p.last, 0));
  // B) decide tomorrow's orders from the books' positions at today's close
  const target = {}, reason = {};
  for (const [id, w] of Object.entries(weights)) {
    const b = books[id]; if (!b || b.status !== 'active') continue;
    const be = b.equity.at(-1)?.[1] || b.start; const scale = w * eq / be;
    for (const [sym, p] of Object.entries(b.positions)) { target[sym] = (target[sym] || 0) + p.qty * scale; reason[sym] ||= `${id}: ${p.why || 'signal'}`; }
  }
  if (master.halt) for (const sym in target) target[sym] = Math.min(target[sym], master.positions[sym]?.qty || 0);
  for (const sym of new Set([...Object.keys(target), ...Object.keys(master.positions)])) {
    const s = ctx.syms[sym]; if (!s || s.idx < 0) continue;
    const price = s.I.c[s.idx], cur = master.positions[sym]?.qty || 0, want = roundQty(M, target[sym] || 0, price), diff = want - cur;
    const minTrade = M === 'crypto' ? Math.max(20, eq * 0.02) : Math.max(1000, boardLot(price) * price);
    // only trade when it matters: opening, closing, or a change of at least a quarter of the position
    if (want > 0 && cur > 0 && Math.abs(diff) < 0.25 * cur) continue;
    if (Math.abs(diff) * price < minTrade && want !== 0) continue;
    if (diff < 0) { const q = want === 0 ? cur : roundQty(M, -diff, price); if (q > 0) { master.pending.push({ side: 'sell', sym, qty: q, wait: 0, why: want === 0 ? 'strategies exited' : 'trim' }); events.push({ type: 'order', side: 'sell', sym, qty: q, ref: price, why: want === 0 ? 'the strategies holding it exited' : 'smaller weight' }); } }
    else if (diff > 0) { master.pending.push({ side: 'buy', sym, qty: diff, wait: 0, why: reason[sym] }); events.push({ type: 'order', side: 'buy', sym, qty: roundQty(M, diff, price), ref: price, why: reason[sym] }); }
  }
  if (master.trades.length > 600) master.trades.splice(0, master.trades.length - 600);
  master.equity.push([ctx.date, eq]); if (master.equity.length > 1500) master.equity.splice(0, master.equity.length - 1500);
  // risk breaker on the master account
  const peak = Math.max(...master.equity.map(x => x[1])), dd = eq / peak - 1;
  const was = master.halt;
  master.halt = dd <= -0.2 ? true : dd > -0.1 ? false : was;
  if (master.halt && !was) events.push({ type: 'risk', text: `Account is ${(dd * 100).toFixed(1)}% below its peak — new buys paused until it recovers to within 10%.` });
  if (!master.halt && was) events.push({ type: 'risk', text: 'Drawdown back under 10% — new buys allowed again.' });
  return eq;
}

// ---------- backtest a book config over history (used for priors and by the researcher) ----------
export function backtest(market, data, cfg, from, to) {
  const book = newBook({ ...cfg, market, startCash: 100_000, created: from });
  const cal = calendar(data).filter(d => d >= from && d <= to);
  let prev = null;
  for (const d of cal) { stepBook(book, makeCtx(market, data, d, prev)); prev = d; }
  const e = book.equity; if (e.length < 20) return null;
  const r = []; for (let i = 1; i < e.length; i++) r.push(e[i][1] / e[i - 1][1] - 1);
  const m = r.reduce((s, x) => s + x, 0) / r.length, sd = Math.sqrt(r.reduce((s, x) => s + (x - m) ** 2, 0) / r.length) || 1e-9;
  const yrs = Math.max(0.25, e.length / (market === 'crypto' ? 365 : 250));
  let peak = -Infinity, dd = 0; for (const [, v] of e) { peak = Math.max(peak, v); dd = Math.min(dd, v / peak - 1); }
  const per = market === 'crypto' ? 365 : 252;
  return { sharpe: round2(m / sd * Math.sqrt(per)), cagr: round4((e.at(-1)[1] / 100_000) ** (1 / yrs) - 1), maxDD: round4(dd), trades: book.trades.length, from, to };
}

// ---------- the researcher: try variants, keep what wins out-of-sample ----------
export function mutate(template, params, rnd) {
  const b = TEMPLATES[template].bounds, out = { ...params };
  const keys = Object.keys(b); const n = 1 + Math.floor(rnd() * 2);
  for (let k = 0; k < n; k++) {
    const key = keys[Math.floor(rnd() * keys.length)], [lo, hi, st] = b[key];
    const cur = out[key] ?? lo, steps = Math.round((hi - lo) / st);
    const delta = (Math.floor(rnd() * 5) - 2) || 1;
    out[key] = round4(Math.min(hi, Math.max(lo, lo + Math.round((cur - lo) / st + delta) * st)));
    if (steps === 0) out[key] = lo;
  }
  if (template === 'trend' && out.fast >= out.slow) out.slow = Math.min(250, out.fast + 50);
  return out;
}
export const rng = seed => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };
