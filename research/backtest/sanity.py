import bt, pandas as pd, numpy as np
rng=np.random.default_rng(7)
bt.ENTRIES['random']=lambda d: pd.Series(rng.random(len(d))<0.02,index=d.index)&(d.c>d.sma50)&(d.sma50>d.sma200)&(d.sma50>d.sma50.shift(10))
p={'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':60,'max_risk':0.2,'breakeven':False,'minval':3e6}
for tier in ['blue','middle','spec']:
    for e in ['random','breakout20_volume']:
        res=[]
        for k in range(5 if e=='random' else 1):
            tr=[]
            for s,t in bt.TIER.items():
                if t==tier: tr+=bt.trades_for(bt.data(s),s,e,p,pd.Timestamp('2015-01-01'),pd.Timestamp('2026-10-30'))
            res.append(bt.stats(tr))
        print(tier,e,'avg% over runs:',[r['avg%'] for r in res],'n',[r['n'] for r in res])
# look-ahead check: shifting data must not change past signals
d=bt.data('SM'); cut=bt.indicators(bt.load('SM').iloc[:2000].copy())
cols=['engulf','hammer','mstar','pierce','insidebo','uptrend','bo20','volspike']
print('signals identical when future data removed:', all((d[c].iloc[:2000].fillna(False).values==cut[c].fillna(False).values).all() for c in cols))
