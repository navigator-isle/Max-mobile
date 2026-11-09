# "Let the big winners run" (multi-baggers) on the PSE dividend plan. Same data, fees and rules as pse_long2.py (DJ = chosen plan),
# plus: NT = no trimming winners back to equal weight at the 3-month re-check; KW = keep any stock up ≥X% since buying, whatever its rank
# (only the trailing stop can sell it). Also counts how often the chosen plan sold a stock that later doubled.
exec(open('pse_long.py').read().split("OUT={}; RET={}")[0])
def run2(select, every=3, stop=('trail', 0.25), keep_rank=40, start='2014-01-01', end='2026-11-06', top=20, notrim=False, keep_win=None, big_trail=None):
    dates = idx[(idx >= start) & (idx <= end)]; reb = set(m for i, m in enumerate([m for m in months if start <= str(m)[:10] <= end]) if i % every == 0)
    w = {}; held = {}; out = []; turn = 0.0; ntr = 0; stopped = 0; pending = None; sold = []
    for d in dates:
        r = sum(w[s] * (R.at[d, s] if not np.isnan(R.at[d, s]) else 0) for s in w)
        tot = sum(w.values()); w = {s: x * (1 + (R.at[d, s] if not np.isnan(R.at[d, s]) else 0)) for s, x in w.items()}
        cash = 1 - tot; nav = cash + sum(w.values()); w = {s: x / nav for s, x in w.items()}
        c = 0.0
        if pending is not None:
            tgt = pending; pending = None
            for s in set(w) | set(tgt):
                dlt = abs(tgt.get(s, 0) - w.get(s, 0)); c += dlt * cost; turn += dlt
                if s in tgt and s not in w: held[s] = {'ep': Pf.at[d, s], 'hi': Pf.at[d, s]}; ntr += 1
                if s in w and s not in tgt: sold.append((s, d, Pf.at[d, s], held.get(s, {}).get('ep')))
            w = {s: x for s, x in tgt.items() if x > 0}; held = {s: h for s, h in held.items() if s in w}
        out.append(r - c)
        if w:
            exit_ = []
            for s, h in held.items():
                p = Pf.at[d, s]
                if np.isnan(p): continue
                h['hi'] = max(h['hi'], p); tr = stop[1]
                if big_trail and h['hi'] >= h['ep'] * (1 + big_trail[0]): tr = big_trail[1]     # wider stop once a stock is a big winner
                if p < h['hi'] * (1 - tr): exit_.append(s)
            if exit_: pending = {s: x for s, x in w.items() if s not in exit_}; stopped += len(exit_)
        if d in reb:
            sc = select(d).dropna(); sc = sc[sc > 0].sort_values(ascending=False)
            keep = [s for s in w if s in sc.index[:keep_rank]]
            if keep_win is not None: keep += [s for s in w if s not in keep and not np.isnan(Pf.at[d, s]) and Pf.at[d, s] >= held[s]['ep'] * (1 + keep_win)]
            new = [s for s in sc.index if s not in keep][:max(0, top - len(keep))]
            if notrim:
                kept = {s: w[s] for s in keep}; free = max(0.0, 1 - sum(kept.values()))
                pending = {**kept, **({s: free / len(new) for s in new} if new else {})}
            else:
                pick = keep + new; pending = {s: 1 / len(pick) for s in pick} if pick else {}
    r = pd.Series(out, index=dates)
    return r, {'turnover_yr': round(turn / (len(dates) / A), 2), 'buys': ntr, 'stop_exits': stopped}, sold
OUT = {}; RET = {}; Y = lambda d: yld.loc[d]
base = run2(Y); summary('DJ chosen: top-40 buffer + 25% trailing stop (re-weights to equal)', base[0], base[1])
# how often did the chosen plan sell a stock that later doubled (within 3 years)?
missed = []
for s, d, p, ep in base[2]:
    fut = Pf[s].loc[d:d + pd.Timedelta(days=1095)].dropna()
    if len(fut) and fut.max() >= 2 * p: missed.append((s, str(d.date()), round(p, 3), round(fut.max() / p, 2)))
OUT['_sold_then_doubled'] = {'sells': len(base[2]), 'later_doubled_within_3y': len(missed), 'examples': missed[:25]}
for nm, kw in [('NT  no trimming of winners', dict(notrim=True)),
               ('KW30 keep stocks up 30%+ whatever the rank', dict(keep_win=0.30)),
               ('KW50 keep stocks up 50%+ whatever the rank', dict(keep_win=0.50)),
               ('NT+KW30 no trimming + keep winners up 30%+', dict(notrim=True, keep_win=0.30)),
               ('NT+KW30+BT wider 35% stop once up 100%', dict(notrim=True, keep_win=0.30, big_trail=(1.0, 0.35))),
               ('NT+KW50+BT wider 35% stop once up 100%', dict(notrim=True, keep_win=0.50, big_trail=(1.0, 0.35))),
               ('NT 30% trailing stop', dict(notrim=True, stop=('trail', 0.30)))]:
    r, info, _ = run2(Y, **kw); summary(nm, r, info)
# biggest winners each version actually held (gain from buy to the best close while held) — measured on NT+KW30
json.dump(OUT, open('../2026-11-09-pse-bagger-results.json', 'w'), indent=1, default=str)
print(OUT['_sold_then_doubled']['sells'], OUT['_sold_then_doubled']['later_doubled_within_3y'], OUT['_sold_then_doubled']['examples'][:10])
