# Honest backtests: signals on today's close, trade at the NEXT day's close (no look-ahead), costs on every change.
import pandas as pd, numpy as np, data, json, itertools
def rsi(c,n):
    d=c.diff(); up=d.clip(lower=0).ewm(alpha=1/n,adjust=False).mean(); dn=(-d.clip(upper=0)).ewm(alpha=1/n,adjust=False).mean()
    return 100-100/(1+up/dn)
# ---- per-asset signals: 1 = hold, 0 = cash ----
def s_sma(c,n=200): return (c>c.rolling(n).mean()).astype(float)
def s_cross(c,f=50,s=200): return (c.rolling(f).mean()>c.rolling(s).mean()).astype(float)
def s_tsmom(c,L=90): return (c/c.shift(L)-1>0).astype(float)
def s_donchian(c,entry=55,exit=20):
    hi=c.rolling(entry).max().shift(1); lo=c.rolling(exit).min().shift(1); pos=np.zeros(len(c)); p=0
    for i,(x,h,l) in enumerate(zip(c.values,hi.values,lo.values)):
        if p==0 and x>h: p=1
        elif p==1 and x<l: p=0
        pos[i]=p
    return pd.Series(pos,index=c.index)
def s_rsi2(c,lo=10):
    r=rsi(c,2); s200=c.rolling(200).mean(); s5=c.rolling(5).mean(); pos=np.zeros(len(c)); p=0
    for i in range(len(c)):
        if p==0 and r.iat[i]<lo and c.iat[i]>s200.iat[i]: p=1
        elif p==1 and c.iat[i]>s5.iat[i]: p=0
        pos[i]=p
    return pd.Series(pos,index=c.index)
def s_boll(c,n=20,k=2):
    m=c.rolling(n).mean(); sd=c.rolling(n).std(); s200=c.rolling(200).mean(); pos=np.zeros(len(c)); p=0
    for i in range(len(c)):
        if p==0 and c.iat[i]<m.iat[i]-k*sd.iat[i] and c.iat[i]>s200.iat[i]: p=1
        elif p==1 and c.iat[i]>m.iat[i]: p=0
        pos[i]=p
    return pd.Series(pos,index=c.index)
def s_hold(c): return c.notna().astype(float)
PER_ASSET={'buy_hold':(s_hold,{}),'sma':(s_sma,{'n':[50,100,150,200]}),'ma_cross':(s_cross,{'f':[20,50],'s':[100,200]}),
 'tsmom':(s_tsmom,{'L':[30,60,90,180]}),'donchian':(s_donchian,{'entry':[20,55],'exit':[10,20]}),'rsi2':(s_rsi2,{'lo':[5,10]}),'bollinger':(s_boll,{'k':[1.5,2.0]})}
def weights_per_asset(px,fn,params):
    w=pd.DataFrame({c:fn(px[c].dropna(),**params).reindex(px.index) for c in px.columns}).fillna(0)
    avail=px.notna().astype(float)
    return w.mul(1/avail.sum(axis=1).replace(0,np.nan),axis=0).fillna(0)*avail   # each listed asset gets an equal slot
def xs_momentum(px,L=28,top=3,regime_n=100,reb=7):
    # weekly: hold the top-N coins by L-day return (only if positive) and only when BTC is above its regime SMA
    ret=px/px.shift(L)-1; btc_on=px['btc']>px['btc'].rolling(regime_n).mean(); w=pd.DataFrame(0.0,index=px.index,columns=px.columns); cur=None
    for i,d in enumerate(px.index):
        if i%reb==0:
            r=ret.loc[d].dropna(); r=r[r>0].sort_values(ascending=False).head(top)
            cur=pd.Series(1/top,index=r.index) if (len(r) and bool(btc_on.loc[d])) else pd.Series(dtype=float)
        if cur is not None and len(cur): w.loc[d,cur.index]=cur.values
    return w
def vol_target(w,px,target,ann):
    r=(px.pct_change(fill_method=None).fillna(0)*w.shift(1).fillna(0)).sum(axis=1)
    vol=r.rolling(30).std()*np.sqrt(ann); scale=(target/vol).clip(upper=1.0).fillna(0)
    return w.mul(scale.shift(1).fillna(0),axis=0)
def run(px,w,cost,ann):
    rets=px.pct_change(fill_method=None).fillna(0)
    wl=w.shift(1).fillna(0)                         # trade at next close
    gross=(wl*rets).sum(axis=1)
    turn=(wl-wl.shift(1).fillna(0)).abs().sum(axis=1)
    return gross-turn*cost, turn
def stats(r,turn,ann):
    r=r.dropna()
    if len(r)<60: return None
    eq=(1+r).cumprod(); yrs=len(r)/ann; cagr=eq.iat[-1]**(1/yrs)-1
    sharpe=r.mean()/r.std()*np.sqrt(ann) if r.std()>0 else 0
    dd=(eq/eq.cummax()-1).min()
    return {'cagr':round(cagr*100,1),'sharpe':round(sharpe,2),'maxdd':round(dd*100,1),'total':round((eq.iat[-1]-1)*100,1),'turnover_yr':round(turn.loc[r.index].sum()/yrs,1)}
