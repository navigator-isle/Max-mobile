# PSE long test. Dividend strategies 2014 → Nov 2026 (13 yrs, dividends known from 2013); price strategies 2003 → Nov 2026 (24 yrs).
# Monthly decisions, trade at next close, COL fees + slippage (0.545%/side avg), cash dividends credited on ex-date less 10% tax.
import pandas as pd, numpy as np, json, sys
import pse3
from bt import stats
P,V,D,Dreg,splits=pse3.load()
A=245; cost=0.00545; tax=0.9
Pf=P.ffill(limit=10)
Dc=D.where(D/Pf.shift(1)<=0.30,0.0)                               # a single payment above 30% of price is treated as a data error
pr=Pf/Pf.shift(1)-1; bad=pr.abs()>0.5                               # beyond the PSE ±50% daily limit = bad print / unadjusted action
R=((Pf+Dc.fillna(0)*tax)/Pf.shift(1)-1).where(P.notna()).mask(bad,0.0)   # daily total return per stock (cleaned)
D=Dc
val20=V.rolling(20,min_periods=10).mean()
live=(P.notna().rolling(250).sum()>=200)&(Pf>=1.0)&(val20>=3e6)   # liquid, listed ≥1 year
mkt=R.where(live).mean(axis=1).fillna(0); mkt_i=(1+mkt).cumprod(); mkt_up=mkt_i>mkt_i.rolling(200).mean()
ttm=D.rolling(250,min_periods=1).sum(); ttm_reg=Dreg.rolling(250,min_periods=1).sum()
yld=(ttm/Pf).where(live); yld_reg=(ttm_reg/Pf).where(live)
paid_both=(D.rolling(250,min_periods=1).sum()>0)&(D.shift(250).rolling(250,min_periods=1).sum()>0)   # paid in each of the last 2 years
chg12=Pf/Pf.shift(250)-1
idx=P.index; months=pd.Series(idx,index=idx).groupby([idx.year,idx.month]).first().values   # first trading day of each month
def run(select, every=3, stop=None, keep_rank=None, start='2014-01-01', end='2026-11-06', top=20, market_gate=None):
    """select(d) -> ranked Series of scores (higher=better). Equal weight top-N. stop: ('fixed',x)|('trail',x)|('sma200',None)."""
    dates=idx[(idx>=start)&(idx<=end)]; reb=set(m for i,m in enumerate([m for m in months if start<=str(m)[:10]<=end]) if i%every==0)
    w={}; held={}; out=[]; turn=0.0; nsell=0; ntr=0; stopped=0; pending=None
    for d in dates:
        r=sum(w[s]*(R.at[d,s] if not np.isnan(R.at[d,s]) else 0) for s in w)
        tot=sum(w.values()); w={s:x*(1+(R.at[d,s] if not np.isnan(R.at[d,s]) else 0)) for s,x in w.items()}
        cash=1-tot; nav=cash+sum(w.values()); w={s:x/nav for s,x in w.items()}   # re-normalise to 1
        c=0.0
        if pending is not None:                                 # trade at today's close what was decided yesterday
            tgt=pending; pending=None
            for s in set(w)|set(tgt):
                dlt=abs(tgt.get(s,0)-w.get(s,0)); c+=dlt*cost; turn+=dlt
                if s in tgt and s not in w: held[s]={'ep':Pf.at[d,s],'hi':Pf.at[d,s]}; ntr+=1
            w={s:x for s,x in tgt.items() if x>0}; held={s:h for s,h in held.items() if s in w}
        out.append(r-c)
        # stops (decided at close, executed next close)
        if stop and w:
            exit_=[]
            for s,h in held.items():
                p=Pf.at[d,s]
                if np.isnan(p): continue
                h['hi']=max(h['hi'],p)
                if stop[0]=='fixed' and p<h['ep']*(1-stop[1]): exit_.append(s)
                if stop[0]=='trail' and p<h['hi']*(1-stop[1]): exit_.append(s)
                if stop[0]=='sma200' and p<Pf[s].loc[:d].tail(200).mean(): exit_.append(s)
            if exit_: pending={s:x for s,x in w.items() if s not in exit_}; stopped+=len(exit_)
        if d in reb:
            if market_gate is not None and not market_gate.loc[d]: pending={}; continue
            sc=select(d).dropna(); sc=sc[sc>0].sort_values(ascending=False)
            pick=list(sc.index[:top])
            if keep_rank:                                       # buffer: keep current holdings while still inside top-keep_rank
                keep=[s for s in w if s in sc.index[:keep_rank]]
                pick=keep+[s for s in sc.index if s not in keep][:max(0,top-len(keep))]
            pending={s:1/len(pick) for s in pick} if pick else {}
    r=pd.Series(out,index=dates)
    return r,{'turnover_yr':round(turn/(len(dates)/A),2),'buys':ntr,'stop_exits':stopped}
def summary(name,r,info):
    s=stats(r,r*0,A); eq=(1+r).cumprod()
    yrs={str(y):round(((1+r[r.index.year==y]).prod()-1)*100,1) for y in sorted(set(r.index.year))}
    o={'total_%':s['total'],'per_year_%':s['cagr'],'worst_drop_%':s['maxdd'],'sharpe':s['sharpe'],**info,
       '2014-2019_%/yr':stats(r.loc[:'2019-12-31'],r*0,A)['cagr'] if r.index[0].year<2019 else None,'2020-2026_%/yr':stats(r.loc['2020-01-01':],r*0,A)['cagr'],'by_year':yrs}
    OUT[name]=o; print(f"{name:62s} {o['per_year_%']:6.1f}%/yr dd {o['worst_drop_%']:6.1f} sh {o['sharpe']:5.2f} | 14-19 {o['2014-2019_%/yr']} 20-26 {o['2020-2026_%/yr']} | buys {info['buys']} stops {info['stop_exits']}",flush=True)
    RET[name]=r
OUT={}; RET={}
Y=lambda d:yld.loc[d]; YR=lambda d:yld_reg.loc[d]
# benchmarks
summary('Benchmark: hold all liquid stocks (dividends included)',*run(lambda d:live.loc[d].astype(float).where(live.loc[d]),every=1,top=1000))
summary('A  Dividend top-20, rebalance every 3 months (current plan)',*run(Y,3))
summary('B  ... every 6 months',*run(Y,6))
summary('C  ... every 12 months',*run(Y,12))
summary('D  buffer: buy top-20, keep while in top-40 (3 months)',*run(Y,3,keep_rank=40))
summary('E  buffer top-60',*run(Y,3,keep_rank=60))
summary('F  rank by REGULAR dividends only (no specials)',*run(YR,3))
trap=lambda d:yld.loc[d].where((chg12.loc[d]>-0.30)&(yld.loc[d]<0.15))
summary('G  trap filter: skip if price −30% in a year or yield >15%',*run(trap,3))
cons=lambda d:yld.loc[d].where(paid_both.loc[d])
summary('H  only stocks that paid in each of the last 2 years',*run(cons,3))
summary('I  stop: sell if 20% below buy price',*run(Y,3,stop=('fixed',0.20)))
summary('J  stop: sell if 25% below highest close',*run(Y,3,stop=('trail',0.25)))
summary('K  stop: sell if below its 200-day average',*run(Y,3,stop=('sma200',None)))
best=lambda d:yld_reg.loc[d].where(paid_both.loc[d]&(chg12.loc[d]>-0.30)&(yld_reg.loc[d]<0.15))
summary('L  combo: regular divs + paid 2 yrs + trap filter + buffer 40',*run(best,3,keep_rank=40))
summary('M  combo L + stop 25% below highest close',*run(best,3,keep_rank=40,stop=('trail',0.25)))
summary('N  combo L, top-10 instead of 20',*run(best,3,keep_rank=20,top=10))
# price-only, 24 years
mom=lambda L:(lambda d:(Pf.loc[d]/Pf.shift(L).loc[d]-1).where(live.loc[d]))
summary('P1 Momentum top-10 by 6-month return, monthly (2003–2026)',*run(mom(126),1,top=10,start='2003-01-01'))
summary('P2 Momentum top-10, only when market above 200-day avg (2003–2026)',*run(mom(126),1,top=10,start='2003-01-01',market_gate=mkt_up))
summary('P3 Benchmark all liquid stocks (2003–2026)',*run(lambda d:live.loc[d].astype(float).where(live.loc[d]),every=1,top=1000,start='2003-01-01'))
# blend: dividend combo (always) + momentum when market strong, 50/50
rd,_=run(best,3,keep_rank=40); rm,_=run(mom(126),1,top=10,market_gate=mkt_up)
summary('Q  50% dividend combo L + 50% momentum-when-market-up',(0.5*rd+0.5*rm.reindex(rd.index).fillna(0)),{'turnover_yr':None,'buys':0,'stop_exits':0})
OUT['_data']={'stocks':int(P.shape[1]),'from':str(P.index.min().date()),'to':str(P.index.max().date()),'dividend_events_2013+':int((D>0).sum().sum()),'splits_adjusted':len(splits),'cost_per_side_%':cost*100,'dividend_tax_%':10}
json.dump(OUT,open('../2026-11-09-pse-long-results.json','w'),indent=1,default=str); pd.to_pickle(RET,'pse_long_returns.pkl')
