# PSE daily-candle backtester: candlestick + price-action entries, ATR stops, realistic PSE costs.
# Signals are computed on day t's close; entries fill at day t+1's OPEN (no look-ahead).
import pandas as pd, numpy as np, json, itertools

D = __import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'data')
INDEX = [x for x in json.load(open(D + '/index.json')) if 'error' not in x]
TIER = {}
for x in INDEX: TIER.setdefault(x['sym'], x['tier'])  # CNPF listed twice: first tier wins (blue)

def load(sym):
    d = pd.read_csv(f'{D}/{sym}.csv')
    d['date'] = pd.to_datetime(d.CHART_DATE.str.replace(' 00:00:00', ''), format='%b %d %Y')
    d = d.sort_values('date').drop_duplicates('date').reset_index(drop=True)
    d = d.rename(columns={'OPEN': 'o', 'HIGH': 'h', 'LOW': 'l', 'CLOSE': 'c', 'VALUE': 'v'})[['date', 'o', 'h', 'l', 'c', 'v']]
    # stock splits / stock dividends: price jumps the market can't make overnight -> back-adjust earlier prices
    r = d.o / d.c.shift()
    for i in d.index[(r < 0.62) | (r > 1.6)]:
        f = r[i]; d.loc[:i - 1, ['o', 'h', 'l', 'c']] *= f
    return d

def indicators(d):
    c, h, l, o = d.c, d.h, d.l, d.o
    tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
    d['atr'] = tr.rolling(14).mean()
    d['sma20'] = c.rolling(20).mean(); d['sma50'] = c.rolling(50).mean(); d['sma200'] = c.rolling(200).mean()
    d['ema20'] = c.ewm(span=20, adjust=False).mean()
    d['hh20'] = h.rolling(20).max().shift(); d['hh55'] = h.rolling(55).max().shift()
    d['val20'] = d.v.rolling(20).mean()
    body = (c - o).abs(); rng = (h - l).replace(0, np.nan)
    up = c > o; dn = c < o
    lower = np.minimum(o, c) - l; upper = h - np.maximum(o, c)
    po, pc = o.shift(), c.shift()
    # --- candlestick patterns ---
    d['engulf'] = dn.shift(1) & up & (c >= po) & (o <= pc) & (body > (po - pc).abs())
    d['hammer'] = (lower >= 2 * body) & (upper <= 0.5 * body.clip(lower=1e-9) + 0.1 * rng.fillna(0)) & (body > 0) & (c.shift(1) < c.shift(5))
    mid1 = (o.shift(2) + c.shift(2)) / 2
    d['mstar'] = dn.shift(2) & ((c.shift(2) - o.shift(2)).abs() > 0.6 * d.atr) & ((c.shift(1) - o.shift(1)).abs() < 0.3 * d.atr) & up & (c > mid1)
    d['pierce'] = dn.shift(1) & up & (o < pc) & (c > (po + pc) / 2) & (c < po)
    mh, ml = h.shift(2), l.shift(2)
    d['insidebo'] = (h.shift(1) < mh) & (l.shift(1) > ml) & (c > mh)
    d['bullcandle'] = d.engulf | d.hammer | d.mstar | d.pierce
    # --- price action ---
    d['uptrend'] = (c > d.sma50) & (d.sma50 > d.sma200) & (d.sma50 > d.sma50.shift(10))
    d['pullback'] = (l.rolling(3).min() <= d.ema20 + 0.25 * d.atr) & (c > d.ema20)  # tagged the 20-EMA in the last 3 days, closed back above
    d['near_sma50'] = (l.rolling(3).min() <= d.sma50 + 0.5 * d.atr) & (c > d.sma50)
    d['bo20'] = c > d.hh20; d['bo55'] = c > d.hh55
    d['volspike'] = d.v > 1.5 * d.val20
    d['swinglow'] = l.rolling(10).min()
    d['sma5'] = c.rolling(5).mean()
    ch = c.diff(); g = ch.clip(lower=0).ewm(alpha=1/2, adjust=False).mean(); ls_ = (-ch.clip(upper=0)).ewm(alpha=1/2, adjust=False).mean()
    d['rsi2'] = 100 - 100 / (1 + g / ls_.replace(0, np.nan))
    d['ret126'] = c / c.shift(126) - 1
    d['golden'] = (d.sma50 > d.sma200) & (d.sma50.shift(1) <= d.sma200.shift(1))
    return d

# PSE costs per side (2026 rates): commission 0.25% (min PHP 20) + 12% VAT, PSE fee 0.005%, SCCP 0.01%; sell adds stock transaction tax
# (0.6% until 30 Jun 2025, 0.1% from 1 Jul 2025 under CMEPA). Plus slippage by tier (spread/tick size).
SLIP = {'blue': 0.0015, 'middle': 0.003, 'spec': 0.006}
def side_cost(gross, sell, date):
    comm = max(20.0, gross * 0.0025) * 1.12
    stt = (0.006 if date < pd.Timestamp('2025-07-01') else 0.001) * gross if sell else 0
    return comm + gross * 0.00015 + stt

def board_lot(p):
    for lim, lot in [(0.01, 1_000_000), (0.05, 100_000), (0.5, 10_000), (5, 1_000), (50, 100), (1000, 10)]:
        if p < lim: return lot
    return 5

ENTRIES = {
    'candle_in_uptrend':   lambda d: d.uptrend & d.bullcandle,
    'candle_at_ema20':     lambda d: d.uptrend & d.pullback & d.bullcandle,
    'candle_at_sma50':     lambda d: (d.c > d.sma200) & d.near_sma50 & d.bullcandle,
    'insidebar_breakout':  lambda d: d.uptrend & d.insidebo,
    'breakout20_volume':   lambda d: d.uptrend & d.bo20 & d.volspike,
    'breakout55_volume':   lambda d: (d.c > d.sma200) & d.bo55 & d.volspike,
    'candle_any':          lambda d: d.bullcandle,              # control: candles with no trend filter
    'rsi2_dip':            lambda d: (d.c > d.sma200) & (d.rsi2 < 10),
    'rsi2_dip_candle':     lambda d: (d.c > d.sma200) & (d.rsi2.shift(1) < 15) & d.bullcandle,
    'golden_cross':        lambda d: d.golden,
    'trend_start':         lambda d: (d.c > d.sma200) & (d.c.shift(1) <= d.sma200.shift(1)) & (d.sma50 > d.sma50.shift(10)),
}

def trades_for(d, sym, entry, p, start, end, market_ok=None):
    """One position at a time per stock. Returns list of trades with % returns after costs (per PHP 100k notional)."""
    sig = ENTRIES[entry](d).fillna(False).values
    liq = (d.val20 >= p['minval']).values
    o, h, l, c, atr, date = d.o.values, d.h.values, d.l.values, d.c.values, d.atr.values, d.date.values
    swl = d.swinglow.values
    out = []; i = 0; n = len(d)
    slip = SLIP[TIER[sym]]
    while i < n - 1:
        dt = pd.Timestamp(date[i])
        if not (start <= dt <= end) or not sig[i] or not liq[i] or not np.isfinite(atr[i]) or (market_ok is not None and not market_ok.get(dt, True)):
            i += 1; continue
        e = o[i + 1] * (1 + slip)
        stop = min(l[i], e - p['stop_atr'] * atr[i]) if p['stop'] == 'candle' else e - p['stop_atr'] * atr[i]
        stop = max(stop, e * (1 - p['max_risk']))
        risk = e - stop
        if risk <= 0: i += 1; continue
        target = e + p['target_r'] * risk if p['target_r'] else None
        trail = stop; hi = e; j = i + 1; exitp = None; why = ''
        while j < n:
            if j > i + 1:  # stop / target checked from the day after entry (gap-aware)
                if o[j] <= trail: exitp, why = o[j], 'stop-gap'; break
                if l[j] <= trail: exitp, why = trail, 'stop'; break
                if target and o[j] >= target: exitp, why = o[j], 'target-gap'; break
                if target and h[j] >= target: exitp, why = target, 'target'; break
            else:
                if l[j] <= trail: exitp, why = trail, 'stop'; break
            hi = max(hi, c[j])
            if p['trail_atr']: trail = max(trail, hi - p['trail_atr'] * atr[j])
            if p['breakeven'] and c[j] >= e + risk: trail = max(trail, e)
            if p.get('exit') == 'sma5' and c[j] > d.sma5.values[j]: exitp, why = c[j], 'sma5'; break
            if p.get('exit') == 'sma200' and c[j] < d.sma200.values[j]: exitp, why = c[j], 'below200'; break
            if p.get('exit') == 'sma50' and c[j] < d.sma50.values[j]: exitp, why = c[j], 'below50'; break
            if j - (i + 1) >= p['max_days']: exitp, why = c[j], 'time'; break
            j += 1
        if exitp is None: exitp, why, j = c[-1], 'open', n - 1
        xp = exitp * (1 - slip)
        sh = 100_000 / e
        gross_in, gross_out = sh * e, sh * xp
        pnl = gross_out - gross_in - side_cost(gross_in, False, pd.Timestamp(date[i + 1])) - side_cost(gross_out, True, pd.Timestamp(date[j]))
        out.append({'sym': sym, 'tier': TIER[sym], 'entry_date': pd.Timestamp(date[i + 1]), 'exit_date': pd.Timestamp(date[j]), 'entry': e, 'exit': xp,
                    'ret': pnl / gross_in, 'r': (pnl / gross_in) / (risk / e), 'risk_pct': risk / e, 'days': j - (i + 1), 'why': why})
        i = j + 1
    return out

def stats(tr):
    if not len(tr): return {'n': 0}
    r = np.array([t['ret'] for t in tr]); R = np.array([t['r'] for t in tr])
    wins = r[r > 0]; loss = r[r <= 0]
    return {'n': len(r), 'win%': round(100 * len(wins) / len(r), 1), 'avg%': round(100 * r.mean(), 2), 'med%': round(100 * np.median(r), 2),
            'avgR': round(R.mean(), 2), 'pf': round(wins.sum() / -loss.sum(), 2) if loss.sum() < 0 else 99,
            'avg_days': round(np.mean([t['days'] for t in tr]), 1), 'worst%': round(100 * r.min(), 1)}

_cache = {}
def data(sym):
    if sym not in _cache: _cache[sym] = indicators(load(sym))
    return _cache[sym]

def market_regime():
    """Share of blue chips above their 200-day average: a stand-in for 'PSEi in an uptrend'."""
    frames = []
    for s, t in TIER.items():
        if t != 'blue': continue
        d = data(s); frames.append(pd.Series((d.c > d.sma200).where(d.sma200.notna()).values, index=d.date, name=s))
    m = pd.concat(frames, axis=1).mean(axis=1)
    return m
