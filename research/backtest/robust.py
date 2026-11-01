import bt, pandas as pd, numpy as np
A=pd.Timestamp('2015-01-01'); B=pd.Timestamp('2026-10-30'); SPLIT=pd.Timestamp('2023-01-01')
mkt=bt.market_regime(); mok={k:v>=0.5 for k,v in mkt.items()}
C={
 'S1 candle in uptrend, 60d':('candle_in_uptrend',{'stop':'candle','stop_atr':2,'target_r':0,'trail_atr':0,'max_days':60}),
 'S2 candle at 20EMA, trail5':('candle_at_ema20',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':5,'max_days':750}),
 'S3 20d breakout+volume, 60d':('breakout20_volume',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':60}),
 'S4 55d breakout, exit<SMA50':('breakout55_volume',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':750,'exit':'sma50'}),
}
for name,(e,pp) in C.items():
  for tier in ['spec','middle','blue']:
    syms=[s for s,t in bt.TIER.items() if t==tier]
    for regime in [False,True]:
        p={'max_risk':0.2,'breakeven':False,'minval':3e6,**pp}
        tr=[]
        for s in syms: tr+=bt.trades_for(bt.data(s),s,e,p,A,B,mok if regime else None)
        df=pd.DataFrame(tr)
        if df.empty: continue
        yr=df.groupby(df.entry_date.dt.year).ret.agg(['count','mean'])
        pos_years=(yr['mean']>0).sum()
        top=df.sort_values('ret',ascending=False)
        no_top5=top.iloc[5:].ret.mean()
        bysym=df.groupby('sym').ret.sum().sort_values(ascending=False)
        print(f"{name:32s} {tier:6s} mkt={int(regime)} n={len(df):4d} avg={100*df.ret.mean():6.2f}% win={100*(df.ret>0).mean():4.1f}% yrs+={pos_years}/{len(yr)} avg_without_top5={100*no_top5:6.2f}% top_syms={', '.join(f'{k}:{100*v:.0f}' for k,v in bysym.head(3).items())} | " + ' '.join(f"{y%100}:{100*m:+.0f}" for y,m in yr['mean'].items()))
