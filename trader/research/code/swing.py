# Swing-trading engine: entry signal on today's close → buy at the NEXT close. Initial stop = k×ATR. Trailing stop (chandelier):
# highest close since entry − k×ATR (only moves up). Exit when a close breaks the stop → sell at the next close.
# Size every trade so a stop-out loses `risk` of equity (e.g. 1%); max position 25% of equity; max N positions; costs both sides.
import pandas as pd, numpy as np
def atr_close(c,n=20): return c.diff().abs().rolling(n).mean()*1.25      # ATR proxy from closes (works when only closes exist)
def atr_ohlc(h,l,c,n=20):
    tr=pd.concat([h-l,(h-c.shift()).abs(),(l-c.shift()).abs()],axis=1).max(axis=1); return tr.rolling(n).mean()
def rsi(c,n): d=c.diff(); up=d.clip(lower=0).ewm(alpha=1/n,adjust=False).mean(); dn=(-d.clip(upper=0)).ewm(alpha=1/n,adjust=False).mean(); return 100-100/(1+up/dn)
# ---- entry signals (True on the day the setup fires) ----
def E_donchian(c,n): return c>c.rolling(n).max().shift(1)
def E_ma_cross(c,f,s): fa,sl=c.rolling(f).mean(),c.rolling(s).mean(); return (fa>sl)&(fa.shift(1)<=sl.shift(1))
def E_pullback_rsi2(c,lo): return (rsi(c,2)<lo)&(c>c.rolling(200).mean())
def E_pullback_ma(c,n): s=c.rolling(n).mean(); return (c.shift(1)<s.shift(1))&(c>s)&(c>c.rolling(200).mean())   # reclaim the MA in an uptrend
def E_52wk_high(c): return c>=c.rolling(252).max().shift(1)
def E_squeeze(c,n=20): sd=c.rolling(n).std()/c.rolling(n).mean(); return (sd.shift(1)<sd.rolling(120).quantile(0.2).shift(1))&(c>c.rolling(n).max().shift(1))
def E_momentum(c,n): r=c/c.shift(n)-1; return (r>0)&(r.shift(1)<=0)&(c>c.rolling(100).mean())
ENTRIES={
 'donchian20':lambda c:E_donchian(c,20),'donchian55':lambda c:E_donchian(c,55),'donchian100':lambda c:E_donchian(c,100),
 'cross10/50':lambda c:E_ma_cross(c,10,50),'cross20/100':lambda c:E_ma_cross(c,20,100),'cross50/200':lambda c:E_ma_cross(c,50,200),
 'rsi2_pullback':lambda c:E_pullback_rsi2(c,10),'ma20_reclaim':lambda c:E_pullback_ma(c,20),'52wk_high':E_52wk_high,
 'squeeze_breakout':E_squeeze,'momentum_turn60':lambda c:E_momentum(c,60)}
def trades_for(c,a,entry,k,regime=None,max_hold=None,direction=1):
    """returns list of (entry_date, exit_date, entry_px, exit_px, risk_per_unit) for one asset"""
    cc=c if direction==1 else -c   # shorting: mirror the series
    sig=entry(cc).fillna(False).values; v=cc.values; at=a.values; idx=c.index; out=[]; i=0; n=len(v)
    reg=regime.reindex(idx).fillna(False).values if regime is not None else None
    while i<n-2:
        if sig[i] and not np.isnan(at[i]) and (reg is None or reg[i]):
            e=i+1; ep=v[e]; stop=ep-k*at[i]; hi=ep; risk=k*at[i]; j=e
            while j<n-1:
                j+=1
                if v[j]>hi: hi=v[j]
                if not np.isnan(at[j]): stop=max(stop,hi-k*at[j])
                if v[j]<stop or (max_hold and j-e>=max_hold): break
            x=min(j+1,n-1)
            out.append((idx[e],idx[x],ep*direction,v[x]*direction,risk,direction)); i=x
        i+=1
    return out
def portfolio(px,trades,cost,risk=0.01,max_pos=8,cap=0.25,start=1.0):
    """daily mark-to-market portfolio from a list of trades (sym, entry, exit, ep, xp, risk_unit, dir)."""
    trades=sorted(trades,key=lambda t:t[1]); eq=start; cash=start; open_=[]; curve={}; done=[]; ti=0
    dates=px.index
    for d in dates:
        # exits first
        for p in [p for p in open_ if p['exit']==d]:
            px_x=p['xp']; pnl=(px_x-p['ep'])*p['q']*p['dir']; fee=abs(px_x*p['q'])*cost
            cash+=p['margin']+pnl-fee
            done.append({'sym':p['sym'],'entry':p['entry'],'exit':d,'dir':p['dir'],'R':(pnl-fee-p['fee_in'])/(p['risk_unit']*p['q']),'pnl':pnl-fee-p['fee_in']})
            open_.remove(p)
        # mark to market
        mtm=cash+sum(p['margin']+(px.at[d,p['sym']]-p['ep'])*p['q']*p['dir'] for p in open_ if not np.isnan(px.at[d,p['sym']]))
        eq=mtm
        while ti<len(trades) and trades[ti][1]<=d:
            sym,ent,ex,ep,xp,ru,dr=trades[ti]; ti+=1
            if ent!=d or len(open_)>=max_pos or any(p['sym']==sym for p in open_): continue
            ep_r,xp_r=abs(ep),abs(xp)
            q=min(eq*risk/ru, eq*cap/ep_r); 
            need=q*ep_r; fee=need*cost
            if need+fee>cash: q=max(0,(cash-fee)/ep_r); need=q*ep_r
            if q<=0: continue
            cash-=need+fee
            open_.append({'sym':sym,'entry':ent,'exit':ex,'ep':ep_r,'xp':xp_r,'q':q,'risk_unit':ru,'dir':dr,'fee_in':fee,'margin':need})
        curve[d]=eq
    return pd.Series(curve), pd.DataFrame(done)
def evaluate(curve,tr,ann):
    r=curve.pct_change().dropna()
    if len(r)<50 or curve.iat[-1]<=0: return None
    yrs=len(r)/ann; cagr=curve.iat[-1]**(1/yrs)-1; dd=(curve/curve.cummax()-1).min()
    sh=r.mean()/r.std()*np.sqrt(ann) if r.std()>0 else 0
    o={'cagr_%':round(cagr*100,1),'total_%':round((curve.iat[-1]-1)*100,1),'max_drop_%':round(dd*100,1),'sharpe':round(sh,2),'mar':round(cagr/abs(dd),2) if dd<0 else 0}
    if len(tr):
        w=tr[tr.R>0]; l=tr[tr.R<=0]
        o.update({'trades':len(tr),'win_%':round(len(w)/len(tr)*100,1),'avg_win_R':round(w.R.mean(),2) if len(w) else 0,'avg_loss_R':round(l.R.mean(),2) if len(l) else 0,'best_R':round(tr.R.max(),1),'expectancy_R':round(tr.R.mean(),3)})
    return o
