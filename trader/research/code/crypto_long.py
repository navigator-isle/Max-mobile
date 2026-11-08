# Crypto long test: Bitcoin Jul 2010 → Nov 2026 (16 yrs); top-20 coins by market cap 2013 → 2026 (point-in-time, dead coins kept);
# all Binance coins 2017 → 2026. Trade at next close; fee+slippage 0.30%/side before 2017 (early exchanges), 0.15% after.
import pandas as pd, numpy as np, json, glob, os, sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from bt import stats
from swing import trades_for, portfolio, atr_close, E_donchian
D='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/data'
A=365
cm=pd.read_csv(f'{D}/data/csv/btc.csv',usecols=['time','PriceUSD'],parse_dates=['time']).dropna().set_index('time').PriceUSD; cm.index=cm.index.tz_localize(None)
bs=pd.read_csv(f'{D}/btc-price-history/data/btc-usd-daily.csv',parse_dates=['date']).set_index('date').close
btc=pd.concat([cm[cm.index<bs.index.min()],bs]).sort_index(); btc=btc[~btc.index.duplicated()].asfreq('D').ffill()
def cost_at(idx): return pd.Series(np.where(idx<pd.Timestamp('2017-01-01'),0.003,0.0015),index=idx)
def run1(sig,px):            # single asset: sig 1/0 decided at close, held from next day
    r=px.pct_change().fillna(0); pos=sig.shift(1).fillna(0); turn=pos.diff().abs().fillna(0)
    return r*pos-turn*cost_at(px.index)
def trail_sys(px,entry_n,k=None,pct=None,regime=None):
    """breakout above entry_n-day high; exit on trailing stop: k×ATR (chandelier) or pct below highest close."""
    a=atr_close(px); hi=px.rolling(entry_n).max().shift(1); pos=np.zeros(len(px)); p=0; top=0; stop=0
    v=px.values; av=a.values; hv=hi.values; rg=regime.reindex(px.index).fillna(False).values if regime is not None else None
    for i in range(len(px)):
        if p==0:
            if not np.isnan(hv[i]) and v[i]>hv[i] and (rg is None or rg[i]): p=1; top=v[i]; stop=v[i]-(k*av[i] if k else v[i]*pct)
        else:
            top=max(top,v[i]); stop=max(stop,top-(k*av[i] if k else top*pct))
            if v[i]<stop: p=0
        pos[i]=p
    return pd.Series(pos,index=px.index)
OUT={}; RET={}
PER=[('2011-2016','2011-01-01','2016-12-31'),('2017-2021','2017-01-01','2021-12-31'),('2022-Nov 2026','2022-01-01','2026-11-06')]
def put(group,name,r,extra=None):
    r=r.loc['2011-01-01':'2026-11-06']; r=r[r.index>=r.ne(0).idxmax()] if r.ne(0).any() else r
    full=stats(r,r*0,A); per={lab:(stats(r.loc[a:b],r*0,A) or {}).get('cagr') for lab,a,b in PER}
    yrs={str(y):round(((1+r[r.index.year==y]).prod()-1)*100,1) for y in sorted(set(r.index.year))}
    OUT.setdefault(group,{})[name]={'from':str(r.index[0].date()),'per_year_%':full['cagr'],'total_%':full['total'],'worst_drop_%':full['maxdd'],'sharpe':full['sharpe'],'per_period_%/yr':per,'by_year':yrs,**(extra or {})}
    RET[(group,name)]=r
    print(f"{group:7s} {name:58s} from {str(r.index[0].date())} {full['cagr']:8.1f}%/yr dd {full['maxdd']:6.1f} sh {full['sharpe']:5.2f} | "+" ".join(f"{k} {v}" for k,v in per.items()),flush=True)
# ---------- BITCOIN ONLY (2011 → 2026) ----------
put('BTC','Buy & hold Bitcoin',run1(pd.Series(1.0,index=btc.index),btc))
for n in [50,100,200]: put('BTC',f'Hold only above {n}-day average',run1((btc>btc.rolling(n).mean()).astype(float),btc))
put('BTC','50-day above 200-day (golden cross)',run1((btc.rolling(50).mean()>btc.rolling(200).mean()).astype(float),btc))
for k in [2,3,4]: put('BTC',f'Breakout 20-day high + {k}×ATR trailing stop',run1(trail_sys(btc,20,k=k),btc))
for pc in [0.15,0.25]: put('BTC',f'Breakout 20-day high + {int(pc*100)}% trailing stop',run1(trail_sys(btc,20,pct=pc),btc))
put('BTC','Breakout 55-day high + 3×ATR trailing stop',run1(trail_sys(btc,55,k=3),btc))
# vol-targeted trend (40% yearly vol)
sig=(btc>btc.rolling(100).mean()).astype(float); vol=btc.pct_change().rolling(30).std()*np.sqrt(A); w=(sig*(0.4/vol).clip(upper=1)).fillna(0)
put('BTC','Above 100-day avg, sized to 40% volatility',run1(w,btc))
# monthly DCA benchmark (value of equal monthly buys) — reported as money-weighted return separately
m=btc.resample('MS').first().loc['2011-01-01':]; units=(1/m).cumsum(); paid=np.arange(1,len(m)+1); val=units*btc.reindex(m.index)
OUT['BTC']['DCA ₱1 every month since Jan 2011 (no selling)']={'paid':int(paid[-1]),'value_now':round(float(units.iat[-1]*btc.iat[-1]),1),'multiple':round(float(units.iat[-1]*btc.iat[-1]/paid[-1]),1)}
# ---------- TOP-20 COINS BY MARKET CAP (2013 → 2026) ----------
STABLE={'usdt','usdc','dai','busd','tusd','usdp','gusd','pax','husd','usdk','fdusd','pyusd','usde','eurc','wbtc','weth','steth','cbeth','wsteth','reth','paxg','xaut','frax','lusd','usdd','susd','eurs','usdglo','usd1','usds','rlusd'}
Pc={};Mc={}
for fn in glob.glob(f'{D}/data/csv/*.csv'):
    s=os.path.basename(fn)[:-4]
    if s in STABLE: continue
    h=open(fn).readline()
    if 'PriceUSD' not in h or 'CapMrktCurUSD' not in h: continue
    df=pd.read_csv(fn,usecols=['time','PriceUSD','CapMrktCurUSD'],parse_dates=['time']).dropna()
    if len(df)<200: continue
    df=df.set_index('time'); df.index=df.index.tz_localize(None); Pc[s]=df.PriceUSD; Mc[s]=df.CapMrktCurUSD
P=pd.DataFrame(Pc).sort_index().asfreq('D').ffill(limit=3).loc['2013-01-01':]; M=pd.DataFrame(Mc).reindex(P.index).ffill(limit=7)
P['btc']=btc.reindex(P.index); M['btc']=M['btc'].ffill()
top20=(M.rank(axis=1,ascending=False)<=20)&P.notna()
print('coins in top-20 by year',top20.sum(axis=1).resample('YE').mean().round().to_dict())
def runN(px,w,cost_series):
    r=px.pct_change(fill_method=None).fillna(0).clip(-0.9,5); wl=w.shift(1).fillna(0); turn=(wl-wl.shift(1).fillna(0)).abs().sum(axis=1)
    return (wl*r).sum(axis=1)-turn*cost_series
cs=cost_at(P.index); bt_=P['btc']; up50=bt_>bt_.rolling(50).mean()
put('TOP20','Hold top-20 coins equally (monthly rebalance)',runN(P,top20.astype(float).div(top20.sum(axis=1),axis=0).fillna(0).resample('MS').first().reindex(P.index,method='ffill').fillna(0),cs))
def swing(px,elig,reg,k=2,risk=0.005):
    tr=[]
    for c in px.columns:
        s=px[c].dropna()
        if len(s)<120: continue
        a=atr_close(s); el=elig[c].reindex(s.index).fillna(False)
        for t in trades_for(s,a,lambda x:E_donchian(x,20),k,reg.shift(1) if reg is not None else None):
            if el.get(t[0]-pd.Timedelta(days=1),False): tr.append((c,)+t)
    cur,done=portfolio(px.ffill(),tr,0.0015,risk=risk,max_pos=8)
    return cur.pct_change().fillna(0),done
r,dn=swing(P,top20,None); put('TOP20','Swing: 20-day breakout + 2×ATR trail (no filter)',r,{'trades':len(dn),'win_%':round((dn.R>0).mean()*100,1)})
r,dn=swing(P,top20,up50); put('TOP20','Swing + only when BTC above 50-day avg (CURRENT PLAN)',r,{'trades':len(dn),'win_%':round((dn.R>0).mean()*100,1),'avg_win_R':round(dn[dn.R>0].R.mean(),2),'avg_loss_R':round(dn[dn.R<=0].R.mean(),2)})
r,dn=swing(P,top20,up50,k=3); put('TOP20','Swing 3×ATR + BTC above 50-day avg',r,{'trades':len(dn),'win_%':round((dn.R>0).mean()*100,1)})
def rot(px,elig,L=14,top=5,reg=None):
    ret=px/px.shift(L)-1; w=pd.DataFrame(0.0,index=px.index,columns=px.columns); cur=pd.Series(dtype=float)
    for i,d in enumerate(px.index):
        if i%7==0:
            rr=ret.loc[d][elig.loc[d]].dropna(); rr=rr[rr>0].sort_values(ascending=False).head(top)
            cur=pd.Series(1/top,index=rr.index) if (len(rr) and (reg is None or reg.loc[d])) else pd.Series(dtype=float)
        if len(cur): w.loc[d,cur.index]=cur.values
    return w
put('TOP20','Momentum: top-5 by 14-day return weekly, BTC>50-day',runN(P,rot(P,top20,reg=up50),cs))
put('TOP20','Momentum: top-5 by 60-day return weekly, BTC>50-day',runN(P,rot(P,top20,L=60,reg=up50),cs))
# combined: 50% BTC trend (above 100d) + 50% alt swing with filter
rb=run1((btc>btc.rolling(100).mean()).astype(float),btc).reindex(P.index).fillna(0); rs,_=swing(P,top20,up50)
put('TOP20','COMBO: 50% BTC above 100-day + 50% swing (filter)',0.5*rb+0.5*rs)
json.dump(OUT,open('../2026-11-09-crypto-long-results.json','w'),indent=1,default=str); pd.to_pickle(RET,'crypto_long_returns.pkl')
print(json.dumps(OUT['BTC']['DCA ₱1 every month since Jan 2011 (no selling)']))
