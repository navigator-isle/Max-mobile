import bt, pandas as pd, numpy as np
from rotation import panel, bh
mk=bt.market_regime()
def run(tiers,K=3,look=252,start='2015-01-01',end='2026-10-30',cost=0.0075,minval=3e6,breadth=None,dailystop=False,skip=21):
    Cf=panel('c',tiers).ffill(limit=5); S200=panel('sma200',tiers); V=panel('val20',tiers); O=panel('o',tiers)
    mom=Cf.shift(skip)/Cf.shift(look)-1   # 12-1 momentum: skip the most recent month (reduces whipsaw)
    C=Cf.loc[start:end]; dates=C.index
    months=set(pd.Series(dates,index=dates).groupby([dates.year,dates.month]).first().values)
    eq=1.0; vals=[]; hold={}  # sym -> shares-equivalent weight value
    cash=1.0; pos={}
    prev=None
    for i,d in enumerate(dates):
        # mark to market
        if prev is not None:
            for s in list(pos):
                p0,p1=C.at[prev,s],C.at[d,s]
                if np.isfinite(p0) and np.isfinite(p1) and p0>0: pos[s]*=p1/p0
        if prev is not None and d in months:
            sd=prev
            m=mom.loc[sd]; ok=(V.loc[sd]>=minval)&(C.loc[sd]>S200.loc[sd])&(m>0)
            pick=list(m[ok].dropna().sort_values(ascending=False).index[:K])
            if breadth is not None and mk.get(sd,1)<breadth: pick=[]
            tot=cash+sum(pos.values())
            target={s:tot/K for s in pick}
            # trade: sell removed, rebalance only new entries (keep winners as-is to save costs)
            for s in list(pos):
                if s not in target: cash+=pos.pop(s)*(1-cost)
            for s in pick:
                if s not in pos:
                    amt=min(cash,tot/K); 
                    if amt>0: cash-=amt; pos[s]=amt*(1-cost)
        elif dailystop and prev is not None:
            for s in list(pos):
                if C.at[d,s]<S200.at[d,s]: cash+=pos.pop(s)*(1-cost)
        vals.append(cash+sum(pos.values())); prev=d
    return pd.Series(vals,index=dates)
def rep(name,c):
    yrs=(c.index[-1]-c.index[0]).days/365.25; cagr=c.iloc[-1]**(1/yrs)-1; dd=(c/c.cummax()-1).min()
    return f"{name:52s} total {100*(c.iloc[-1]-1):7.1f}%  /yr {100*cagr:6.1f}%  worst drop {100*dd:6.1f}%"
if __name__=='__main__':
  for per,(a,b) in {'2015-2022 tuning':('2015-01-01','2022-12-31'),'2023-2026 unseen':('2023-01-01','2026-10-30')}.items():
    print('---',per); print(rep('Buy & hold blue chips',bh(['blue'],a,b)))
    for tiers in [['blue'],['blue','middle']]:
      for K in [3,4,5]:
        for look in [189,252,315]:
          for ds,br in [(False,None),(True,None),(True,0.4)]:
            print(rep(f'{"+".join(tiers)} top{K} {look}d stop200={int(ds)} breadth={br}',run(tiers,K,look,a,b,breadth=br,dailystop=ds)))
