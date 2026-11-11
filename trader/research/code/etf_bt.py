import json, pandas as pd, numpy as np, glob, os
P = {}; D = {}
for f in [g for g in glob.glob('*.json') if 'results' not in g]:
    s = f[:-5]; r = json.load(open(f))['chart']['result'][0]
    t = pd.to_datetime(r['timestamp'], unit='s').normalize()
    P[s] = pd.Series(r['indicators']['quote'][0]['close'], index=t).ffill()
    dv = (r.get('events') or {}).get('dividends') or {}
    D[s] = pd.Series({pd.to_datetime(int(k), unit='s').normalize(): v['amount'] for k, v in dv.items()}, dtype=float)
px = pd.DataFrame(P).sort_index(); px = px[~px.index.duplicated()]
div = pd.DataFrame({s: D[s].groupby(level=0).sum() for s in D}).reindex(px.index).fillna(0)
TAX = 0.25    # US withholding on dividends for a Philippine resident (treaty 25%)
ret = (px + div * (1 - TAX)) / px.shift(1) - 1          # daily total return after dividend tax
ret = ret.loc['2004-01-01':]
COST = 0.002  # per side: commission + spread (e.g. ~0.1% broker + ~0.1% slippage)
me = px.loc['2004-01-01':].resample('ME').last().index
def bt(wfun, name):
    days = ret.index; w = pd.Series(0.0, index=px.columns); eq = [1.0]; dts = [days[0]]; nxt = {}
    for d in me:
        i = days.searchsorted(d, 'right')
        if i < len(days): nxt[days[i]] = d
    cur = 1.0
    for dt in days[1:]:
        r = (w * ret.loc[dt].fillna(0)).sum(); cur *= 1 + r
        if dt in nxt:
            nw = wfun(nxt[dt]).reindex(px.columns).fillna(0)
            turn = (nw - w).abs().sum(); cur *= 1 - turn * COST; w = nw
        else:
            # drift weights
            g = w * (1 + ret.loc[dt].fillna(0)); s = g.sum(); w = g / s * w.sum() if s else w
        eq.append(cur); dts.append(dt)
    e = pd.Series(eq, index=dts); return e
def stats(e, a, b):
    x = e.loc[a:b]; x = x / x.iloc[0]; yrs = (x.index[-1] - x.index[0]).days / 365.25
    cagr = x.iloc[-1] ** (1 / yrs) - 1; dd = (x / x.cummax() - 1).min()
    dr = x.pct_change().dropna(); sh = dr.mean() / dr.std() * np.sqrt(252)
    return round(cagr * 100, 1), round(dd * 100, 1), round(sh, 2)
sma200 = px.rolling(200).mean(); m6 = px / px.shift(126) - 1; m12 = px / px.shift(252) - 1
def at(df, d): return df.loc[:d].iloc[-1]
S = {}
S['Hold SPY'] = lambda d: pd.Series({'SPY': 1})
S['Hold 60% SPY / 40% IEF'] = lambda d: pd.Series({'SPY': .6, 'IEF': .4})
S['SPY above 200-day average, else SHY'] = lambda d: pd.Series({'SPY': 1} if at(px, d)['SPY'] > at(sma200, d)['SPY'] else {'SHY': 1})
S['QQQ above 200-day average, else SHY'] = lambda d: pd.Series({'QQQ': 1} if at(px, d)['QQQ'] > at(sma200, d)['QQQ'] else {'SHY': 1})
def gem(d):
    m = at(m12, d)
    if m['SPY'] > m['SHY']: return pd.Series({'SPY' if m['SPY'] >= m['EFA'] else 'EFA': 1})
    return pd.Series({'AGG': 1})
S['Dual momentum (SPY/EFA, else AGG)'] = gem
def rot(univ, k, filt=True):
    def f(d):
        m = at(m6, d)[univ].dropna(); p = at(px, d); s = at(sma200, d)
        ok = [x for x in m.sort_values(ascending=False).index if (not filt or p[x] > s[x])][:k]
        w = {x: 1 / k for x in ok}
        if len(ok) < k: w['SHY'] = w.get('SHY', 0) + (k - len(ok)) / k
        return pd.Series(w)
    return f
A8 = ['SPY', 'QQQ', 'IWM', 'EFA', 'EEM', 'TLT', 'GLD', 'VNQ']
SEC = ['XLK', 'XLF', 'XLE', 'XLV', 'XLP', 'XLU', 'XLI', 'XLY', 'XLB']
for k in (2, 3, 4): S[f'Asset rotation top-{k} of 8 (6-month, above 200-day)'] = rot(A8, k)
for k in (3,): S[f'Sector rotation top-{k} of 9 (6-month, above 200-day)'] = rot(SEC, k)
def secspy(d):
    if at(px, d)['SPY'] <= at(sma200, d)['SPY']: return pd.Series({'SHY': 1})
    return rot(SEC, 3, False)(d)
S['Sector top-3, only when SPY above 200-day'] = secspy
out = {}
for n, f in S.items():
    e = bt(f, n); out[n] = {'2004-2014 (choose)': stats(e, '2004-01-01', '2014-12-31'), '2015-Nov 2026 (unseen)': stats(e, '2015-01-01', '2026-12-31'), 'all': stats(e, '2004-01-01', '2026-12-31'),
        'by_year': {str(y): round((e.loc[str(y)].iloc[-1] / e.loc[:str(y - 1)].iloc[-1] - 1) * 100, 1) for y in range(2005, 2027)}}
    print(f'{n:58s} choose {out[n]["2004-2014 (choose)"]}  unseen {out[n]["2015-Nov 2026 (unseen)"]}  all {out[n]["all"]}')
json.dump(out, open('etf-results.json', 'w'), indent=1)
print('--- blends')
def blend(*parts):
    def f(d):
        w = pd.Series(dtype=float)
        for fr, fn in parts: w = w.add(fn(d) * fr, fill_value=0)
        return w
    return f
B = {'50% hold SPY + 50% SPY trend': blend((.5, S['Hold SPY']), (.5, S['SPY above 200-day average, else SHY'])),
     '50% hold SPY + 50% rotation top-4': blend((.5, S['Hold SPY']), (.5, S['Asset rotation top-4 of 8 (6-month, above 200-day)'])),
     '50% SPY trend + 50% rotation top-4': blend((.5, S['SPY above 200-day average, else SHY']), (.5, S['Asset rotation top-4 of 8 (6-month, above 200-day)']))}
for n, f in B.items():
    e = bt(f, n); out[n] = {'2004-2014 (choose)': stats(e, '2004-01-01', '2014-12-31'), '2015-Nov 2026 (unseen)': stats(e, '2015-01-01', '2026-12-31'), 'all': stats(e, '2004-01-01', '2026-12-31'),
        'by_year': {str(y): round((e.loc[str(y)].iloc[-1] / e.loc[:str(y - 1)].iloc[-1] - 1) * 100, 1) for y in range(2005, 2027)}}
    print(f'{n:58s} choose {out[n]["2004-2014 (choose)"]}  unseen {out[n]["2015-Nov 2026 (unseen)"]}  all {out[n]["all"]}')
json.dump(out, open('etf-results.json', 'w'), indent=1)
