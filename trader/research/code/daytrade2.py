import pandas as pd, numpy as np, dtdata as d, itertools, json
from daytrade import *
RES.update(json.load(open('daytrade_results.json')))
# ---- crypto: how much do fees matter for the opening-range breakout? (settings fixed from older years) ----
b=d.btc15(); daily=b.close.resample('1D').last(); reg={k:v for k,v in ((daily>daily.rolling(50).mean()).shift(1)).items()}
p=RES['crypto']['Opening-range breakout']['params']; tr=crypto_orb(b.loc['2024-01-01':],p['range_min'],reg,p['stop_x_range'])
sens={f'{c*100:.2f}% round trip':summarize(tr,c) for c in [0.0004,0.0008,0.0010,0.0014,0.0020]}
RES['crypto']['ORB fee sensitivity (2024→Nov 2026)']=sens
for k,v in sens.items(): print('ORB',k,v)
yr=(tr-0.0010); print('ORB by year @0.10%:',((1+yr).groupby(yr.index.year).prod()-1).mul(100).round(1).to_dict())
# ---- FOREX (hourly, 2013-2018 pick settings, 2019-Mar 2022 test; EURUSD 2026 extra test) ----
SPREAD={'EURUSD':0.00008,'GBPUSD':0.00012,'USDJPY':0.00010,'AUDUSD':0.00012}   # ~0.8-1.2 pip round trip as a fraction (approx)
fxIS=slice('2013-01-01','2018-12-31'); fxOOS=slice('2019-01-01',None)
allIS={}; allOOS={}
for pair in SPREAD:
    h=d.fx(pair); dd=h.close.resample('1D').last().dropna(); s50=dd.rolling(50).mean()
    regd={k:(1 if v>0 else -1) for k,v in ((dd-s50).shift(1)).dropna().items()}
    cost=SPREAD[pair]/h.close.mean()*h.close.mean()  # already a fraction
    for name,fn in [('London breakout',lambda x:fx_london_bo(x)),('London breakout + daily trend',lambda x:fx_london_bo(x,regime=regd)),('Asian-session mean reversion',lambda x:fx_meanrev(x))]:
        a=fn(h.loc[fxIS]); o=fn(h.loc[fxOOS]); allIS.setdefault(name,[]).append(a); allOOS.setdefault(name,[]).append(o)
        rec('forex',f'{name} — {pair}',{},summarize(a,SPREAD[pair]),summarize(o,SPREAD[pair]))
for name in allIS:
    a=pd.concat(allIS[name]).sort_index(); o=pd.concat(allOOS[name]).sort_index()
    rec('forex',f'{name} — 4 pairs together',{'cost':'~1 pip/trade'},summarize(a/4*4,0.0001),summarize(o,0.0001))
# EURUSD 2026 (15-minute data → hourly) as a fresh check
e=d.eur15_2026().resample('1h').agg({'open':'first','high':'max','low':'min','close':'last'}).dropna()
for name,fn in [('London breakout',lambda x:fx_london_bo(x)),('Asian-session mean reversion',lambda x:fx_meanrev(x))]:
    rec('forex',f'{name} — EURUSD Mar–Sep 2026',{},None,summarize(fn(e),0.00008))
# ---- PSE (30-minute snapshots, 25 Sep – 6 Nov 2026, 21 blue chips) ----
pi=d.pse_intraday(); pi['t']=pd.to_datetime(pi.as_of,format='%b %d, %Y %I:%M %p',errors='coerce'); pi=pi.dropna(subset=['t']).drop_duplicates(['sym','t'])
PC=0.0069+0.002   # COL: buy 0.295% + sell 0.395% (incl. 0.1% sales tax) + ~0.2% spread/ticks
mom={}; orb={}
for (sym,day),g in pi.groupby(['sym',pi.t.dt.date]):
    g=g.sort_values('t'); 
    if len(g)<8: continue
    o=g.open.dropna().iat[0] if g.open.notna().any() else g.price.iat[0]
    first=g[g.t.dt.hour<11]   # first 1.5 hours (9:30-11:00)
    if len(first)<2: continue
    r1=first.price.iat[-1]/o-1; last=g.price.iat[-1]
    if r1>0.005: mom[(sym,first.t.iat[-1])]=last/first.price.iat[-1]-1
    hi=first.price.max(); rest=g[g.t>first.t.iat[-1]]; br=rest[rest.price>hi]
    if len(br): orb[(sym,br.t.iat[0])]=last/br.price.iat[0]-1
def ser(dct): s=pd.Series(dct); s.index=[t for _,t in dct.keys()]; return s.sort_index()
rec('pse','Intraday momentum (first 1.5h up >0.5%, hold to close)',{'data':'25 Sep–6 Nov 2026, 21 blue chips'},None,summarize(ser(mom),PC),{'before_costs':summarize(ser(mom),0)})
rec('pse','Morning-high breakout (hold to close)',{'data':'25 Sep–6 Nov 2026'},None,summarize(ser(orb),PC),{'before_costs':summarize(ser(orb),0)})
# PSE swing alternative (2–5 days) on the long archive + recent 4 months: RSI(2)/Bollinger pullback on blue chips
import data as dd2
from bt import s_rsi2, s_boll, run, stats
px=dd2.pse().drop(columns=['PSEI'])
for nm,fn,pp in [('RSI(2) pullback swing',s_rsi2,{'lo':5}),('Bollinger pullback swing',s_boll,{'k':1.5})]:
    w=pd.DataFrame({c:fn(px[c].dropna(),**pp).reindex(px.index) for c in px.columns}).fillna(0)
    w=w.div(w.sum(axis=1).clip(lower=1),axis=0)   # split cash across active signals (fully used when several fire)
    r,t=run(px,w,0.0055,245)
    rec('pse',nm+' (swing 2–5 days, not day trade)',pp,stats(r.loc['2009':'2017'],t,245),stats(r.loc['2018':],t,245))
json.dump(RES,open('daytrade_results.json','w'),indent=1,default=str)
