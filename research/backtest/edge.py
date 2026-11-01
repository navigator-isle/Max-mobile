import bt, pandas as pd, numpy as np
rows=[]
for s,t in bt.TIER.items():
    d=bt.data(s).copy(); d=d[(d.date>='2015-01-01')&(d.val20>=3e6)]
    for h in [5,10,20]:
        d[f'f{h}']=bt.data(s).o.shift(-1-h).reindex(d.index)/bt.data(s).o.shift(-1).reindex(d.index)-1
    d['tier']=t; rows.append(d)
A=pd.concat(rows)
pats={'all days':A.c>0,'bullish engulfing':A.engulf,'hammer':A.hammer,'morning star':A.mstar,'piercing':A.pierce,'inside-bar breakout':A.insidebo,'any bullish candle':A.bullcandle,
 'uptrend only':A.uptrend,'candle in uptrend':A.uptrend&A.bullcandle,'20d breakout + volume':A.bo20&A.volspike,'RSI2<10 above SMA200':(A.c>A.sma200)&(A.rsi2<10)}
out=[]
for tier in ['blue','middle','spec']:
    T=A[A.tier==tier]
    for k,m in pats.items():
        x=T[m.loc[T.index].fillna(False).values] if False else T[m[A.tier==tier].fillna(False).values]
        out.append({'tier':tier,'signal':k,'n':len(x),**{f'{h}d avg%':round(100*x[f'f{h}'].mean(),2) for h in [5,10,20]},'10d up%':round(100*(x.f10>0).mean(),1)})
pd.set_option('display.width',200); print(pd.DataFrame(out).to_string(index=False))
