import bt, pandas as pd, sys
TR=(pd.Timestamp('2015-01-01'),pd.Timestamp('2022-12-31')); TE=(pd.Timestamp('2023-01-01'),pd.Timestamp('2026-10-30'))
base={'stop':'candle','stop_atr':1.5,'max_risk':0.10,'target_r':2,'trail_atr':0,'breakeven':False,'max_days':30,'minval':3e6}
mkt=bt.market_regime(); mok={k:v>=0.5 for k,v in mkt.items()}
rows=[]
for tier in ['blue','middle','spec']:
    syms=[s for s,t in bt.TIER.items() if t==tier]
    for e in bt.ENTRIES:
        for regime in [False,True]:
            for per,(a,b) in [('train',TR),('test',TE)]:
                tr=[]
                for s in syms: tr+=bt.trades_for(bt.data(s),s,e,base,a,b,mok if regime else None)
                st=bt.stats(tr); rows.append({'tier':tier,'entry':e,'mkt':regime,'per':per,**st})
df=pd.DataFrame(rows); pd.set_option('display.width',250); pd.set_option('display.max_rows',200)
print(df.to_string(index=False))
