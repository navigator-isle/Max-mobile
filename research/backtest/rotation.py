import bt, pandas as pd, numpy as np
def panel(field, tiers):
    return pd.concat({s: bt.data(s).set_index('date')[field] for s,t in bt.TIER.items() if t in tiers}, axis=1).sort_index()
def run(tiers, K=5, look=126, start='2015-01-01', end='2026-10-30', filt=True, cost=0.0075, minval=3e6):
    C=panel('c',tiers).ffill(limit=5); O=panel('o',tiers); S200=panel('sma200',tiers); V=panel('val20',tiers)
    C=C.loc[start:end]; dates=C.index
    months=pd.Series(dates, index=dates).groupby([dates.year,dates.month]).first().values
    eq=1.0; curve=[]; hold=[]
    mom=(panel('c',tiers)/panel('c',tiers).shift(look)-1)
    for k in range(len(months)):
        d0=months[k]; d1=months[k+1] if k+1<len(months) else dates[-1]
        sig_day=dates[dates<d0]
        if len(sig_day)==0: continue
        sd=sig_day[-1]
        m=mom.loc[sd]; ok=(V.loc[sd]>=minval)
        if filt: ok&=(C.loc[sd]>S200.loc[sd])&(m>0)
        pick=list(m[ok].dropna().sort_values(ascending=False).index[:K])
        turnover=len(set(pick)^set(hold))/(2*K) if (pick or hold) else 0
        eq*=1-cost*2*turnover/1.0*0.5*2  # buy+sell legs on the changed part
        hold=pick
        seg=C.loc[d0:d1]
        if pick:
            r=(seg[pick].iloc[-1]/seg[pick].iloc[0]-1).fillna(0).mean()
            path=(seg[pick]/seg[pick].iloc[0]).mean(axis=1)*eq
        else:
            r=0; path=pd.Series(eq,index=seg.index)
        curve.append(path); eq*=1+r
    c=pd.concat(curve); c=c[~c.index.duplicated()]
    return c
def bh(tiers,start,end):
    C=panel('c',tiers).loc[start:end]; C=C.loc[:,C.iloc[0].notna()]
    return (C/C.iloc[0]).mean(axis=1)
def rep(name,c):
    yrs=(c.index[-1]-c.index[0]).days/365.25; cagr=c.iloc[-1]**(1/yrs)-1; dd=(c/c.cummax()-1).min()
    return f"{name:45s} total {100*(c.iloc[-1]-1):7.1f}%  per year {100*cagr:6.1f}%  worst drop {100*dd:6.1f}%"
for per,(a,b) in {'2015-2022 (tuning years)':('2015-01-01','2022-12-31'),'2023-2026 (unseen test)':('2023-01-01','2026-10-30')}.items():
    print('---',per)
    print(rep('Buy & hold, equal weight blue chips',bh(['blue'],a,b)))
    print(rep('Buy & hold, equal weight all 92',bh(['blue','middle','spec'],a,b)))
    for tiers in [['blue'],['blue','middle'],['blue','middle','spec']]:
        for K in [3,5]:
            for look in [126,252]:
                print(rep(f'Rotation {"+".join(tiers)} top{K} {look}d',run(tiers,K,look,a,b)))
