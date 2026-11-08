# All strategy families × 3 markets on the widest data available. Settings chosen on older years; judged on unseen years.
import pandas as pd, numpy as np, json, itertools, pickle, universe as U
from bt import run, stats, rsi
from swing import trades_for, portfolio, evaluate, atr_close, E_donchian, E_pullback_rsi2
OUT={}; RET={}
def sleeve(market,name,family,ret_is,ret_oos,ann,params=None,turn=None,extra=None):
    si=stats(ret_is,turn if turn is not None else ret_is*0,ann); so=stats(ret_oos,turn if turn is not None else ret_oos*0,ann)
    OUT.setdefault(market,{})[name]={'family':family,'params':params,'in_sample':si,'out_of_sample':so,**({'extra':extra} if extra else {})}
    RET[(market,name)]=pd.concat([ret_is,ret_oos]); print(f"{market:6s} {family:22s} {name:38s} IS {si and (si['cagr'],si['sharpe'],si['maxdd'])}  OOS {so and (so['total'],so['cagr'],so['sharpe'],so['maxdd'])}",flush=True)
def vec(px,w,cost,ann,IS,OOS):
    r,t=run(px,w,cost,ann); return r.loc[IS[0]:IS[1]],r.loc[OOS[0]:OOS[1]],t
def best_of(px,builder,grid,cost,ann,IS):
    best=None
    for p in grid:
        w=builder(**p); r,t=run(px,w,cost,ann); s=stats(r.loc[IS[0]:IS[1]],t,ann)
        if s and (best is None or s['sharpe']>best[1]['sharpe']): best=(p,s,w)
    return best
def swing_curve(px,elig,cost,ann,k,use_reg,regime,dirs=(1,),risk=0.005,max_pos=8):
    tr=[]
    for c in px.columns:
        s=px[c].dropna()
        if len(s)<120: continue
        a=atr_close(s)
        for dr in dirs:
            rg=None
            if use_reg:
                if regime is not None: rg=regime.shift(1)
                else: sm=s.rolling(200).mean(); rg=((s>sm) if dr==1 else (s<sm)).shift(1)
            el=elig[c].reindex(s.index).fillna(False) if elig is not None else None
            for t in trades_for(s,a,lambda x:E_donchian(x,20),k,rg,direction=dr):
                if el is not None and not el.get(t[0]-pd.Timedelta(days=1),el.asof(t[0]) if hasattr(el,'asof') else True): continue
                tr.append((c,)+t)
    cur,done=portfolio(px.ffill(),tr,cost,risk=risk,max_pos=max_pos)
    return cur.pct_change().fillna(0),done
if __name__=='__main__':
    # ================= CRYPTO: point-in-time top-20 by market cap (dead coins included) =================
    P,M=U.crypto_universe(); P=P.loc['2016-01-01':]; M=M.reindex(P.index)
    top20=(M.rank(axis=1,ascending=False)<=20)&P.notna()
    CI=('2016-01-01','2021-12-31'); CO=('2022-01-01','2026-11-06'); cc=0.0015; A=365
    btc=P['btc']
    def w_trend(n): s=(P>P.rolling(n).mean())&top20; return s.astype(float).div(top20.sum(axis=1),axis=0).fillna(0)
    b=best_of(P,w_trend,[{'n':n} for n in [20,50,100,200]],cc,A,CI); ri,ro,t=vec(P,b[2],cc,A,CI,CO); sleeve('crypto','Trend top-20 (SMA)','regular / position',ri,ro,A,b[0],t)
    def w_rot(L,top,reg):
        ret=P/P.shift(L)-1; on=(btc>btc.rolling(reg).mean()); w=pd.DataFrame(0.0,index=P.index,columns=P.columns); cur=pd.Series(dtype=float)
        for i,d in enumerate(P.index):
            if i%7==0:
                r=ret.loc[d][top20.loc[d]].dropna(); r=r[r>0].sort_values(ascending=False).head(top)
                cur=pd.Series(1/top,index=r.index) if (len(r) and on.loc[d]) else pd.Series(dtype=float)
            if len(cur): w.loc[d,cur.index]=cur.values
        return w
    b=best_of(P,w_rot,[{'L':L,'top':k,'reg':g} for L in [14,28] for k in [3,5] for g in [50,100]],cc,A,CI); ri,ro,t=vec(P,b[2],cc,A,CI,CO); sleeve('crypto','Momentum rotation top-20','regular / rotation',ri,ro,A,b[0],t)
    def w_rsi2(lo):
        r2=rsi(P,2) if False else P.apply(lambda c:rsi(c.dropna(),2).reindex(P.index))
        sig=((r2<lo)&(P>P.rolling(200).mean())&top20); s5=P.rolling(5).mean(); pos=pd.DataFrame(0.0,index=P.index,columns=P.columns); hold=pd.Series(False,index=P.columns)
        for d in P.index:
            hold=(hold&~(P.loc[d]>s5.loc[d]))|sig.loc[d]; pos.loc[d]=hold.astype(float)
        return pos.div(20)
    b=best_of(P,w_rsi2,[{'lo':5},{'lo':10}],cc,A,CI); ri,ro,t=vec(P,b[2],cc,A,CI,CO); sleeve('crypto','RSI(2) pullback top-20','swing / mean reversion',ri,ro,A,b[0],t)
    reg=btc>btc.rolling(200).mean(); best=None
    for k,ur in itertools.product([2,3],[False,True]):
        r,done=swing_curve(P,top20,cc,A,k,ur,reg); s=stats(r.loc[CI[0]:CI[1]],r*0,A)
        if best is None or s['sharpe']>best[1]['sharpe']: best=({'k_atr':k,'btc_filter':ur},s,r,done)
    p,_,r,done=best; sleeve('crypto','Swing breakout + ATR trail (top-20)','swing / trend',r.loc[CI[0]:CI[1]],r.loc[CO[0]:],A,p,extra={'win_%':round((done.R>0).mean()*100,1),'avg_win_R':round(done[done.R>0].R.mean(),2),'avg_loss_R':round(done[done.R<=0].R.mean(),2)})
    # copy the big traders: CME Bitcoin/Ether leveraged-fund positioning (weekly, used 3 days after the report date)
    cot=U.cot()
    for lab,sym in [('Bitcoin (CME)','btc'),('Ether (CME)','eth')]:
        z=cot[lab]; ch=(z-z.rolling(13).mean())
        for mode in ['follow','fade']:
            sig=(ch>0) if mode=='follow' else (ch<0)
            sig.index=sig.index+pd.Timedelta(days=3); w=sig.astype(float).reindex(P.index,method='ffill').fillna(0)
            ww=pd.DataFrame(0.0,index=P.index,columns=P.columns); ww[sym]=w
            r,t=run(P,ww,cc,A); RET[('tmp',lab+mode)]=r
        f=stats(RET[('tmp',lab+'follow')].loc['2018-06-01':CI[1]],t,A); g=stats(RET[('tmp',lab+'fade')].loc['2018-06-01':CI[1]],t,A)
        pick='follow' if (f and g and f['sharpe']>=g['sharpe']) else 'fade'; r=RET[('tmp',lab+pick)]
        sleeve('crypto',f'Copy big traders: {lab} ({pick})','copy trading (COT)',r.loc['2018-06-01':CI[1]],r.loc[CO[0]:],A,{'mode':pick})
    bh=top20.astype(float).div(top20.sum(axis=1),axis=0).fillna(0); ri,ro,t=vec(P,bh,cc,A,CI,CO); sleeve('crypto','Benchmark: hold top-20 equally','benchmark',ri,ro,A,None,t)
    # ================= PSE: all stocks (2009 → Mar 2021) =================
    X=U.pse_all(); X=X.loc['2009-01-01':]; X=X.loc[:,X.columns!='PSEI'] if 'PSEI' in X.columns else X
    psei=U.pse_all()['PSEI'].reindex(X.index).ffill() if 'PSEI' in U.pse_all().columns else None
    live=(X.notna())&(X>=1.0)&(X.notna().rolling(250).sum()>=200)
    BLUE={'AC','ALI','BDO','BPI','GLO','ICT','JFC','MBT','MER','SM','SMPH','TEL','URC','AEV','AGI','AP','DMC','FGEN','GTCAP','JGS','LTG','MEG','MPI','PGOLD','RLC','RRHI','SCC','SECB','SMC','CNVRG','MONDE','EMI','PCOR','BLOOM','WLCON','CBC','ACEN','NIKL'}
    pc=0.0075   # average round-trip half: blue chips ~0.55%, smaller stocks wider spreads
    PI=('2009-01-01','2016-12-31'); PO=('2017-01-01','2021-03-12'); PA=245
    Xp=X.where(live)
    def wp_trend(n): s=(Xp>Xp.rolling(n).mean())&live; return s.astype(float).div(live.sum(axis=1),axis=0).fillna(0)
    b=best_of(Xp,wp_trend,[{'n':n} for n in [50,100,200]],pc,PA,PI); ri,ro,t=vec(Xp,b[2],pc,PA,PI,PO); sleeve('pse','Trend all stocks (SMA)','regular / position',ri,ro,PA,b[0],t)
    def wp_mom(L,top):
        ret=Xp/Xp.shift(L)-1; on=(psei>psei.rolling(200).mean()) if psei is not None else pd.Series(True,index=Xp.index)
        w=pd.DataFrame(0.0,index=Xp.index,columns=Xp.columns); cur=pd.Series(dtype=float)
        for i,d in enumerate(Xp.index):
            if i%21==0:
                r=ret.loc[d][live.loc[d]].dropna(); r=r[r>0].sort_values(ascending=False).head(top)
                cur=pd.Series(1/top,index=r.index) if (len(r) and on.loc[d]) else pd.Series(dtype=float)
            if len(cur): w.loc[d,cur.index]=cur.values
        return w
    b=best_of(Xp,wp_mom,[{'L':L,'top':k} for L in [63,126,252] for k in [5,10]],pc,PA,PI); ri,ro,t=vec(Xp,b[2],pc,PA,PI,PO); sleeve('pse','Momentum rotation all stocks','regular / rotation',ri,ro,PA,b[0],t)
    best=None; reg=(psei>psei.rolling(200).mean()) if psei is not None else None
    for k,ur in itertools.product([2,3,4],[False,True]):
        r,done=swing_curve(Xp,live,pc,PA,k,ur,reg); s=stats(r.loc[PI[0]:PI[1]],r*0,PA)
        if s and (best is None or s['sharpe']>best[1]['sharpe']): best=({'k_atr':k,'psei_filter':ur},s,r,done)
    p,_,r,done=best; sleeve('pse','Swing breakout + ATR trail (all stocks)','swing / trend',r.loc[PI[0]:PI[1]],r.loc[PO[0]:],PA,p)
    bh=live.astype(float).div(live.sum(axis=1),axis=0).fillna(0); ri,ro,t=vec(Xp,bh,pc,PA,PI,PO); sleeve('pse','Benchmark: hold all stocks equally','benchmark',ri,ro,PA,None,t)
    # ================= FOREX: 21 currencies vs USD (2000 → Oct 2026) =================
    F=U.fx_all(); FI=('2000-06-01','2017-12-31'); FO=('2018-01-01','2026-10-30'); FA=252; fc=0.0002
    def wf_ts(L): s=np.sign(F/F.shift(L)-1).fillna(0); return s.div(F.notna().sum(axis=1),axis=0)
    b=best_of(F,wf_ts,[{'L':L} for L in [21,63,126,252]],fc,FA,FI); ri,ro,t=vec(F,b[2],fc,FA,FI,FO); sleeve('forex','Trend each currency (long/short)','regular / position',ri,ro,FA,b[0],t)
    def wf_xs(L,k):
        ret=F/F.shift(L)-1; w=pd.DataFrame(0.0,index=F.index,columns=F.columns); cur=None
        for i,d in enumerate(F.index):
            if i%21==0:
                r=ret.loc[d].dropna().sort_values()
                cur=pd.Series(0.0,index=F.columns)
                if len(r)>=2*k: cur[r.index[-k:]]=1/(2*k); cur[r.index[:k]]=-1/(2*k)
            w.loc[d]=cur.values
        return w
    b=best_of(F,wf_xs,[{'L':L,'k':k} for L in [21,63,126] for k in [3,5]],fc,FA,FI); ri,ro,t=vec(F,b[2],fc,FA,FI,FO); sleeve('forex','Currency momentum rotation','regular / rotation',ri,ro,FA,b[0],t)
    hi=[c for c in ['Australia','New Zealand','Mexico','Brazil','South Africa','India'] if c in F.columns]; lo=[c for c in ['Japan','Switzerland'] if c in F.columns]
    w=pd.DataFrame(0.0,index=F.index,columns=F.columns); w[hi]=0.5/len(hi); w[lo]=-0.5/len(lo); ri,ro,t=vec(F,w,fc,FA,FI,FO)
    sleeve('forex','Carry basket (high-yield vs JPY/CHF)','carry (interest-rate "dividend")',ri,ro,FA,{'note':'price only — real carry also earns the interest gap'},t)
    best=None
    for k,ur in itertools.product([2,3],[False,True]):
        r,done=swing_curve(F,None,fc,FA,k,ur,None,dirs=(1,-1)); s=stats(r.loc[FI[0]:FI[1]],r*0,FA)
        if s and (best is None or s['sharpe']>best[1]['sharpe']): best=({'k_atr':k,'trend_filter':ur},s,r,done)
    p,_,r,done=best; sleeve('forex','Swing breakout + ATR trail (both ways)','swing / trend',r.loc[FI[0]:FI[1]],r.loc[FO[0]:],FA,p)
    m={'EUR':'Euro','JPY':'Japan','GBP':'United Kingdom','CHF':'Switzerland','CAD':'Canada','AUD':'Australia','NZD':'New Zealand','MXN':'Mexico','BRL':'Brazil','ZAR':'South Africa'}
    cz=U.cot()[list(m)].rename(columns=m); ch=cz-cz.rolling(13).mean()
    for mode in ['follow','fade']:
        s=np.sign(ch) if mode=='follow' else -np.sign(ch); s.index=s.index+pd.Timedelta(days=3)
        w=s.reindex(F.index,method='ffill').reindex(columns=F.columns).fillna(0); w=w.div(w.abs().sum(axis=1).replace(0,np.nan),axis=0).fillna(0)
        r,t=run(F,w,fc,FA); RET[('tmp','fx'+mode)]=(r,t)
    f=stats(RET[('tmp','fx'+'follow')][0].loc['2018-06-01':'2021-12-31'],RET[('tmp','fxfollow')][1],FA); g=stats(RET[('tmp','fxfade')][0].loc['2018-06-01':'2021-12-31'],RET[('tmp','fxfade')][1],FA)
    pick='follow' if f['sharpe']>=g['sharpe'] else 'fade'; r,t=RET[('tmp','fx'+pick)]
    sleeve('forex',f'Copy big traders: 10 currencies ({pick})','copy trading (COT)',r.loc['2018-06-01':'2021-12-31'],r.loc['2022-01-01':FO[1]],FA,{'mode':pick,'note':'COT starts 2018 → older years = 2018–2021'},t)
    json.dump(OUT,open('master_results.json','w'),indent=1,default=str)
    pickle.dump({k:v for k,v in RET.items() if k[0]!='tmp'},open('master_returns.pkl','wb'))
