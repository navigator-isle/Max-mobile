import bt, pandas as pd, numpy as np
TR=(pd.Timestamp('2015-01-01'),pd.Timestamp('2022-12-31')); TE=(pd.Timestamp('2023-01-01'),pd.Timestamp('2026-10-30'))
mkt=bt.market_regime(); mok={k:v>=0.5 for k,v in mkt.items()}
def bh(tier,a,b):
    r=[]
    for s,t in bt.TIER.items():
        if t!=tier: continue
        d=bt.data(s); x=d[(d.date>=a)&(d.date<=b)]
        if len(x)>200: r.append(x.c.iloc[-1]/x.c.iloc[0]-1)
    return round(100*np.mean(r),1), round(100*np.median(r),1), len(r)
for tier in ['blue','middle','spec']: print('BUY&HOLD',tier,'train',bh(tier,*TR),'test',bh(tier,*TE))
V=[('rsi2_dip',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':10,'exit':'sma5'}),
   ('rsi2_dip_candle',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':10,'exit':'sma5'}),
   ('golden_cross',{'stop':'atr','stop_atr':4,'target_r':0,'trail_atr':0,'max_days':750,'exit':'sma200'}),
   ('trend_start',{'stop':'atr','stop_atr':4,'target_r':0,'trail_atr':0,'max_days':750,'exit':'sma200'}),
   ('breakout55_volume',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':5,'max_days':750}),
   ('breakout55_volume',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':750,'exit':'sma50'}),
   ('candle_at_ema20',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':5,'max_days':750}),
   ('candle_at_sma50',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':750,'exit':'sma200'}),
   ('insidebar_breakout',{'stop':'candle','stop_atr':2,'target_r':0,'trail_atr':0,'max_days':60}),
   ('breakout20_volume',{'stop':'atr','stop_atr':3,'target_r':0,'trail_atr':0,'max_days':60}),
   ('candle_in_uptrend',{'stop':'candle','stop_atr':2,'target_r':0,'trail_atr':0,'max_days':60}),
]
rows=[]
for tier in ['blue','middle','spec']:
    syms=[s for s,t in bt.TIER.items() if t==tier]
    for e,pp in V:
        p={'max_risk':0.2,'breakeven':False,'minval':3e6,**pp}
        for regime in [False,True]:
            for per,(a,b) in [('train',TR),('test',TE)]:
                tr=[]
                for s in syms: tr+=bt.trades_for(bt.data(s),s,e,p,a,b,mok if regime else None)
                rows.append({'tier':tier,'entry':e,'exit':pp.get('exit') or ('trail%d'%pp['trail_atr'] if pp['trail_atr'] else 'stop/time'),'days':pp['max_days'],'mkt':regime,'per':per,**bt.stats(tr)})
df=pd.DataFrame(rows); pd.set_option('display.width',250); pd.set_option('display.max_rows',300)
print(df.to_string(index=False))
