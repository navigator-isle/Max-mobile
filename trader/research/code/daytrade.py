# Day-trading tests: every trade opens and closes the same day. Costs on every trade. Settings picked on older years only.
import pandas as pd, numpy as np, dtdata as d, itertools, json
def summarize(tr,cost):
    """tr: Series of gross trade returns (fraction), index = entry time. Returns stats after costs (round trip)."""
    if len(tr)==0: return {'trades':0}
    net=tr-cost; eq=(1+net).cumprod(); days=max(1,(net.index.max()-net.index.min()).days)
    dd=(eq/eq.cummax()-1).min(); wins=(net>0).mean()
    pf=net[net>0].sum()/abs(net[net<0].sum()) if (net<0).any() else 9.99
    daily=net.groupby(net.index.date).sum(); sh=daily.mean()/daily.std()*np.sqrt(252) if daily.std()>0 else 0
    return {'trades':int(len(net)),'total_%':round((eq.iat[-1]-1)*100,1),'yearly_%':round(((eq.iat[-1])**(365/days)-1)*100,1),'win_%':round(wins*100,1),
            'avg_trade_%':round(net.mean()*100,3),'profit_factor':round(pf,2),'sharpe':round(sh,2),'max_drop_%':round(dd*100,1)}
# ---------------- CRYPTO (BTC, 15-minute bars, UTC day) ----------------
def crypto_orb(b,range_min=60,regime=None,stop_mult=1.0,side='long'):
    out={}
    for day,g in b.groupby(b.index.date):
        if len(g)<80: continue
        n=range_min//15; rng=g.iloc[:n]; rest=g.iloc[n:]; hi,lo=rng.high.max(),rng.low.min(); R=hi-lo
        if R<=0: continue
        if regime is not None and not regime.get(pd.Timestamp(day),False): continue
        if side=='long':
            hit=rest[rest.high>hi]
            if hit.empty: continue
            t=hit.index[0]; entry=hi; stop=hi-stop_mult*R; after=rest.loc[t:]
            stopped=after[after.low<=stop]
            exitp=stop if len(stopped) and stopped.index[0]>=t else after.close.iat[-1]
            out[t]=exitp/entry-1
    return pd.Series(out)
def crypto_intraday_mom(b,first_h=6,regime=None):
    out={}
    for day,g in b.groupby(b.index.date):
        if len(g)<90: continue
        k=first_h*4; r1=g.close.iat[k-1]/g.open.iat[0]-1
        if regime is not None and not regime.get(pd.Timestamp(day),False): continue
        if r1>0: out[g.index[k]]=g.close.iat[-1]/g.close.iat[k-1]-1
    return pd.Series(out)
def crypto_rsi2_h1(b,regime=None,lo=10,max_h=8):
    h=b.resample('1h').agg({'open':'first','high':'max','low':'min','close':'last'}).dropna()
    c=h.close; dl=c.diff(); up=dl.clip(lower=0).ewm(alpha=.5,adjust=False).mean(); dn=(-dl.clip(upper=0)).ewm(alpha=.5,adjust=False).mean(); r=100-100/(1+up/dn)
    ema=c.ewm(span=200).mean(); out={}; i=200; idx=c.index
    while i<len(c)-1:
        day=idx[i].normalize()
        if r.iat[i]<lo and c.iat[i]>ema.iat[i] and (regime is None or regime.get(day,False)) and idx[i].hour<20:
            entry=c.iat[i]; j=i+1
            while j<len(c)-1 and r.iat[j]<70 and j-i<max_h and idx[j].normalize()==day: j+=1
            out[idx[i]]=c.iat[j]/entry-1; i=j
        i+=1
    return pd.Series(out)
# ---------------- FOREX (hourly, London session) ----------------
def fx_london_bo(h,regime=None,both=True,exit_hour=16):
    out={}
    for day,g in h.groupby(h.index.date):
        asia=g[g.index.hour<7]; lon=g[(g.index.hour>=7)&(g.index.hour<exit_hour)]
        if len(asia)<5 or len(lon)<5: continue
        hi,lo=asia.high.max(),asia.low.min(); R=hi-lo
        if R<=0: continue
        dirn=None if regime is None else regime.get(pd.Timestamp(day),0)
        for t,row in lon.iterrows():
            if row.high>hi and (dirn in (None,1)):
                after=lon.loc[t:]; s=after[after.low<=lo]; ex=lo if len(s) else after.close.iat[-1]; out[t]=ex/hi-1; break
            if both and row.low<lo and (dirn in (None,-1)):
                after=lon.loc[t:]; s=after[after.high>=hi]; ex=hi if len(s) else after.close.iat[-1]; out[t]=lo/ex-1; break
    return pd.Series(out)
def fx_meanrev(h,z=2.0,win=24,max_h=6):
    c=h.close; m=c.rolling(win).mean(); sd=c.rolling(win).std(); zz=(c-m)/sd; out={}; i=win; idx=c.index
    while i<len(c)-max_h:
        if idx[i].hour in range(0,6) and abs(zz.iat[i])>z:
            s=-np.sign(zz.iat[i]); j=i+1
            while j<i+max_h and np.sign(zz.iat[j])==np.sign(zz.iat[i]) and abs(zz.iat[j])>0.2: j+=1
            out[idx[i]]=s*(c.iat[j]/c.iat[i]-1); i=j
        i+=1
    return pd.Series(out)
RES={}
def rec(cat,name,params,is_s,oos_s,extra=None):
    RES.setdefault(cat,{})[name]={'params':params,'in_sample':is_s,'out_of_sample':oos_s,**({'extra':extra} if extra else {})}
    print(f"{cat:7s} {name:28s} {str(params)[:40]:40s}\n   IS {is_s}\n   OOS {oos_s}" + (f"\n   +  {extra}" if extra else ''))
if __name__=='__main__':
    # ===== CRYPTO =====
    b=d.btc15(); daily=b.close.resample('1D').last()
    reg={k:v for k,v in ((daily>daily.rolling(50).mean()).shift(1)).items()}   # yesterday's close above SMA50 (no look-ahead)
    CC=0.0024   # round trip: 0.10% fee + 0.02% slippage per side
    IS=slice('2018-03-01','2023-12-31'); OOS=slice('2024-01-01',None)
    best=None
    for rm,reg_on,sm in itertools.product([30,60,120],[False,True],[0.5,1.0]):
        tr=crypto_orb(b.loc[IS],rm,reg if reg_on else None,sm); s=summarize(tr,CC)
        if s.get('trades',0)>100 and (best is None or s['sharpe']>best[1]['sharpe']): best=({'range_min':rm,'trend_filter':reg_on,'stop_x_range':sm},s)
    p=best[0]; rec('crypto','Opening-range breakout',p,best[1],summarize(crypto_orb(b.loc[OOS],p['range_min'],reg if p['trend_filter'] else None,p['stop_x_range']),CC))
    best=None
    for fh,reg_on in itertools.product([3,6,9],[False,True]):
        s=summarize(crypto_intraday_mom(b.loc[IS],fh,reg if reg_on else None),CC)
        if s.get('trades',0)>100 and (best is None or s['sharpe']>best[1]['sharpe']): best=({'first_hours':fh,'trend_filter':reg_on},s)
    p=best[0]; rec('crypto','Intraday momentum',p,best[1],summarize(crypto_intraday_mom(b.loc[OOS],p['first_hours'],reg if p['trend_filter'] else None),CC))
    best=None
    for lo,reg_on in itertools.product([5,10],[False,True]):
        s=summarize(crypto_rsi2_h1(b.loc[IS],reg if reg_on else None,lo),CC)
        if s.get('trades',0)>100 and (best is None or s['sharpe']>best[1]['sharpe']): best=({'rsi2_below':lo,'trend_filter':reg_on},s)
    p=best[0]; rec('crypto','Hourly RSI(2) dip-buy',p,best[1],summarize(crypto_rsi2_h1(b.loc[OOS],reg if p['trend_filter'] else None,p['rsi2_below']),CC))
    # maker-fee variant of the best idea (limit orders 0.02% + no slippage) — what a careful day trader would pay
    p=RES['crypto']['Opening-range breakout']['params']
    rec('crypto','ORB with limit orders (0.04% rt)',p,summarize(crypto_orb(b.loc[IS],p['range_min'],reg if p['trend_filter'] else None,p['stop_x_range']),0.0004),summarize(crypto_orb(b.loc[OOS],p['range_min'],reg if p['trend_filter'] else None,p['stop_x_range']),0.0004))
    json.dump(RES,open('daytrade_results.json','w'),indent=1,default=str)
