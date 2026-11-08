# PSE re-test on full PSE Edge data: settings picked on 2009–2020, judged on unseen 2021 → Nov 2026. Total return (cash dividends included).
import pandas as pd, numpy as np, json, itertools, pickle, sys
import pse2
from bt import run, stats, rsi
from swing import trades_for, portfolio, evaluate, atr_close, E_donchian, ENTRIES
P,V,Dv,splits=pse2.load()
TR=((P.ffill(limit=5)+Dv.fillna(0))/P.ffill(limit=5).shift(1)).fillna(1).cumprod().where(P.notna())   # total-return index
IS=('2009-01-01','2020-12-31'); OS=('2021-01-01','2026-11-06'); A=245
val20=V.rolling(20,min_periods=10).mean()
hist=P.notna().rolling(250).sum()>=200
early=pd.DataFrame(np.repeat((P.index<pd.Timestamp('2015-03-01'))[:,None],P.shape[1],axis=1),index=P.index,columns=P.columns)
liq=(val20.reindex(columns=P.columns)>=5e6)|(val20.reindex(columns=P.columns).isna()&early)   # ≥ ₱5M a day traded (Edge years); price rule before 2015
live=(hist&(P>=1.0)&liq).astype(bool)
X=TR.where(live)
mkt=(X.pct_change(fill_method=None).where(live)).mean(axis=1).fillna(0); mkt_i=(1+mkt).cumprod()   # equal-weight market index
reg=mkt_i>mkt_i.rolling(200).mean()
COST={'col':0.00345+0.002}   # COL avg side (buy 0.295 / sell 0.395) + ~0.2% spread/slippage per side
c=COST['col']; OUT={}; RET={}
def put(name,family,r,t,params=None,extra=None):
    si=stats(r.loc[IS[0]:IS[1]],t,A); so=stats(r.loc[OS[0]:OS[1]],t,A)
    OUT[name]={'family':family,'params':params,'2009-2020 (settings chosen)':si,'2021-Nov 2026 (unseen)':so,**({'extra':extra} if extra else {})}; RET[name]=r
    print(f"{family:24s} {name:42s} IS {si and (si['cagr'],si['sharpe'],si['maxdd'])} | OOS tot {so and so['total']} cagr {so and so['cagr']} sh {so and so['sharpe']} dd {so and so['maxdd']}",flush=True)
def best(builder,grid):
    b=None
    for p in grid:
        w=builder(**p); r,t=run(X,w,c,A); s=stats(r.loc[IS[0]:IS[1]],t,A)
        if s and (b is None or s['sharpe']>b[1]['sharpe']): b=(p,s,w)
    r,t=run(X,b[2],c,A); return b[0],r,t,b[2]
def rot(score,top,every=21,use_reg=True,positive=True):
    w=pd.DataFrame(0.0,index=X.index,columns=X.columns); cur=pd.Series(dtype=float)
    for i,d in enumerate(X.index):
        if i%every==0:
            s=score.loc[d][live.loc[d]].dropna()
            if positive: s=s[s>0]
            s=s.sort_values(ascending=False).head(top)
            cur=pd.Series(1/top,index=s.index) if (len(s) and (not use_reg or reg.loc[d])) else pd.Series(dtype=float)
        if len(cur): w.loc[d,cur.index]=cur.values
    return w
# 1 benchmark
bh=live.astype(float).div(live.sum(axis=1).replace(0,np.nan),axis=0).fillna(0); r,t=run(X,bh,c,A); put('Hold all liquid stocks equally (with dividends)','benchmark',r,t)
# 2 trend per stock
p,r,t,_=best(lambda n:((X>X.rolling(n).mean())&live).astype(float).div(live.sum(axis=1).replace(0,np.nan),axis=0).fillna(0),[{'n':n} for n in [50,100,200]]); put('Trend each stock (SMA)','regular / position',r,t,p)
# 3 momentum rotation
p,r,t,wm=best(lambda L,top,skip:rot(X.shift(skip)/X.shift(L)-1,top),[{'L':L,'top':k,'skip':s} for L in [63,126,252] for k in [5,10] for s in [0,21]]); put('Momentum rotation (monthly, market filter)','regular / rotation',r,t,p)
# 4 low-volatility / quality proxy rotation
vol=X.pct_change(fill_method=None).rolling(126).std()
p,r,t,_=best(lambda top:rot(-vol,top,positive=False),[{'top':k} for k in [10,20]]); put('Low-volatility rotation','regular / defensive',r,t,p)
# 5 dividend yield rotation (yield known from paid dividends of the past 12 months; data 2021+ so judged on unseen years only)
ttm=Dv.rolling(250,min_periods=1).sum(); yld=(ttm/P.ffill()).where(live)
for top in [10,20]:
    for ur in [False,True]:
        w=rot(yld.where(yld>0.03),top,every=63,use_reg=ur); r,t=run(X,w,c,A); put(f'High dividend yield top-{top}'+(' + market filter' if ur else ''),'dividend',r,t,{'top':top,'filter':ur})
# 6 dividend capture: buy 5 days before ex-date, sell 3 days after (ex-dates are announced weeks ahead)
for pre,post,mn in [(5,3,0.015),(10,5,0.02),(3,1,0.02)]:
    ev=(Dv/P.ffill().shift(1))>=mn; w=pd.DataFrame(0.0,index=X.index,columns=X.columns)
    for k in range(-pre,post): w=w+ev.shift(-k).fillna(False).astype(float)
    w=(w>0).astype(float)*live; w=w.div(w.sum(axis=1).clip(lower=5),axis=0).fillna(0)
    r,t=run(X,w,c,A); put(f'Dividend capture (−{pre}d/+{post}d, yield ≥{mn*100:.1f}%)','dividend',r,t)
# 7 RSI(2) mean reversion in uptrends
def w_rsi2(lo):
    r2=X.apply(lambda s:rsi(s.dropna(),2).reindex(X.index)); sig=(r2<lo)&(X>X.rolling(200).mean())&live; s5=X.rolling(5).mean()
    pos=pd.DataFrame(0.0,index=X.index,columns=X.columns); hold=pd.Series(False,index=X.columns)
    for d in X.index: hold=(hold&~(X.loc[d]>s5.loc[d]))|sig.loc[d]; pos.loc[d]=hold.astype(float)
    return pos.div(10)
p,r,t,_=best(w_rsi2,[{'lo':5},{'lo':10}]); put('RSI(2) pullback','swing / mean reversion',r,t,p)
# 8 swing: several entries + ATR trailing stop, risk 0.5–1% per trade
SW={}
for ent in ['donchian20','donchian55','52wk_high','ma20_reclaim','squeeze_breakout','cross20/100','momentum_turn60','rsi2_pullback']:
    for k in [2,3,4]:
        for ur in [False,True]:
            tr=[]
            for col in X.columns:
                s=X[col].dropna()
                if len(s)<150: continue
                for z in trades_for(s,atr_close(s),ENTRIES[ent],k,reg.shift(1) if ur else None): tr.append((col,)+z)
            cur,done=portfolio(X.ffill(),tr,c,risk=0.0075,max_pos=10)
            e=evaluate(cur.loc[IS[0]:IS[1]]/cur.loc[IS[0]:IS[1]].iat[0],done[done.entry<=IS[1]] if len(done) else done,A)
            SW[(ent,k,ur)]=(e,cur,done); print('swing',ent,k,ur,e and (e['cagr_%'],e['sharpe'],e['max_drop_%']),flush=True)
bk=max([k for k in SW if SW[k][0]],key=lambda k:SW[k][0]['sharpe']); e,cur,done=SW[bk]
r=cur.pct_change().fillna(0); dO=done[done.entry>=OS[0]]
put('Swing breakout + ATR trailing stop','swing / trend',r,r*0,{'entry':bk[0],'k_atr':bk[1],'market_filter':bk[2]},
    {'unseen_trades':len(dO),'win_%':round((dO.R>0).mean()*100,1) if len(dO) else None,'avg_win_R':round(dO[dO.R>0].R.mean(),2) if len(dO) else None,'avg_loss_R':round(dO[dO.R<=0].R.mean(),2) if len(dO) else None,'best_R':round(dO.R.max(),1) if len(dO) else None})
OUT['_swing_grid']={f'{k[0]}|k{k[1]}|filter{k[2]}':v[0] for k,v in SW.items()}
OUT['_data']={'stocks':int(P.shape[1]),'days':int(P.shape[0]),'from':str(P.index.min().date()),'to':str(P.index.max().date()),'splits_adjusted':len(splits),'dividend_events':int((Dv>0).sum().sum()),'cost_per_side_%':c*100}
# current signals (for the paper ledger)
d=X.index[-1]; OUT['_now']={'date':str(d.date()),'market_above_200d':bool(reg.iloc[-1]),'momentum_pick':[k for k,v in wm.iloc[-1].items() if v>0]}
json.dump(OUT,open('../2026-11-08-pse-full-results.json','w'),indent=1,default=str); pickle.dump(RET,open('pse_returns.pkl','wb'))
