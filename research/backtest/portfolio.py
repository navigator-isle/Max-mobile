import bt, pandas as pd, numpy as np
def sim(tiers, entry, pp, start, end, cap=100_000, risk=0.01, maxpos=6, minval=5e6):
    p={'max_risk':0.2,'breakeven':False,'minval':minval,**pp}
    tr=[]
    for s,t in bt.TIER.items():
        if t in tiers: tr+=bt.trades_for(bt.data(s),s,entry,p,pd.Timestamp(start),pd.Timestamp(end))
    tr=sorted(tr,key=lambda x:x['entry_date'])
    eq=cap; open_=[]; curve={}; taken=0; skipped=0
    events=sorted({t['entry_date'] for t in tr}|{t['exit_date'] for t in tr})
    for d in events:
        for t in [x for x in open_ if x['exit_date']<=d]:
            eq+=t['alloc']*t['ret']; open_.remove(t)
        for t in [x for x in tr if x['entry_date']==d]:
            if len(open_)>=maxpos: skipped+=1; continue
            alloc=min(eq*risk/t['risk_pct'], eq/ maxpos*2, eq-sum(x['alloc'] for x in open_))
            lot=bt.board_lot(t['entry'])*t['entry']
            if alloc<lot: skipped+=1; continue
            t=dict(t,alloc=alloc); open_.append(t); taken+=1
        curve[d]=eq
    c=pd.Series(curve).sort_index()/cap
    yrs=(pd.Timestamp(end)-pd.Timestamp(start)).days/365.25
    return c, taken, skipped, yrs
for per,(a,b) in {'2015-2022 tuning':('2015-01-01','2022-12-31'),'2023-2026 unseen':('2023-01-01','2026-10-30')}.items():
    for tiers in [['spec'],['middle','spec'],['blue','middle','spec']]:
        for risk in [0.005,0.01]:
            c,n,sk,yrs=sim(tiers,'breakout20_volume',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':60},a,b,risk=risk)
            dd=(c/c.cummax()-1).min()
            print(f"{per} {'+'.join(tiers):18s} risk {risk*100:.1f}%/trade: total {100*(c.iloc[-1]-1):6.1f}%  /yr {100*(c.iloc[-1]**(1/yrs)-1):5.1f}%  worst drop {100*dd:6.1f}%  trades {n} (skipped {sk})")
