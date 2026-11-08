# Forex & "copy big traders" long test, 2000 → Oct 2026 (26 yrs). Total return of holding a currency vs USD = price change + interest gap (carry).
# CFTC positions used only from the Monday after release (report Tuesday + 6 days). Costs 0.03% per unit traded. No leverage (sum of |weights| = 1).
import pandas as pd, numpy as np, json, os, sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import universe as U
from bt import stats
S='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/fx20'
MAP={'EUR':('Euro','EA20'),'JPY':('Japan','JPN'),'GBP':('United Kingdom','GBR'),'CHF':('Switzerland','CHE'),'CAD':('Canada','CAN'),'AUD':('Australia','AUS'),'NZD':('New Zealand','NZL'),'MXN':('Mexico','MEX'),'ZAR':('South Africa','ZAF'),'BRL':('Brazil',None)}
F=U.fx_all()
PX=pd.DataFrame({c:F[n] for c,(n,_) in MAP.items() if n in F}).loc['2000-01-01':].ffill(limit=5)
ir=pd.read_csv(f'{S}/ir/rates_monthly.csv',index_col=0); ir.index=pd.to_datetime(ir.index); ir=ir.reindex(pd.date_range(ir.index.min(),'2026-11-30',freq='D')).ffill()
rd=pd.DataFrame({c:(ir[o]-ir['USA'])/100/365 for c,(n,o) in MAP.items() if o}).reindex(PX.index,method='ffill')   # daily interest gap vs USD
# GBP rate gaps in recent months: carry forward last value
rd=rd.ffill()
RET=PX.pct_change(fill_method=None).fillna(0)+rd.reindex(columns=PX.columns).fillna(0)   # BRL: price only
A=252; COST=0.0003
def run(w):
    wl=w.reindex(PX.index).ffill().fillna(0).shift(1).fillna(0); turn=(wl-wl.shift(1).fillna(0)).abs().sum(axis=1)
    return (wl*RET).sum(axis=1)-turn*COST
def norm(w): return w.div(w.abs().sum(axis=1).replace(0,np.nan),axis=0).fillna(0)
OUT={}; R={}
PER=[('2000-2008','2000-01-01','2008-12-31'),('2009-2016','2009-01-01','2016-12-31'),('2017-Oct 2026','2017-01-01','2026-10-30')]
def put(g,name,r,note=None):
    r=r.loc['2000-06-01':'2026-10-30']; s=stats(r,r*0,A); per={l:(stats(r.loc[a:b],r*0,A) or {}).get('cagr') for l,a,b in PER}
    yrs={str(y):round(((1+r[r.index.year==y]).prod()-1)*100,1) for y in sorted(set(r.index.year))}
    OUT.setdefault(g,{})[name]={'per_year_%':s['cagr'],'total_%':s['total'],'worst_drop_%':s['maxdd'],'sharpe':s['sharpe'],'periods_%/yr':per,'by_year':yrs,**({'note':note} if note else {})}; R[(g,name)]=r
    print(f"{g:6s} {name:64s} {s['cagr']:5.1f}%/yr dd {s['maxdd']:6.1f} sh {s['sharpe']:5.2f} | "+" ".join(f"{k} {v}" for k,v in per.items()),flush=True)
me=PX.resample('ME').last().index; ME=lambda w:w.reindex(PX.index,method='ffill')
# 0 benchmarks
put('FX','Hold all 10 currencies vs USD equally (with interest)',run(pd.DataFrame(0.1,index=PX.index,columns=PX.columns)))
# 1 carry
carry=pd.DataFrame({c:(ir[o]-ir['USA']) for c,(n,o) in MAP.items() if o}).reindex(me,method='ffill')
def cw(k):
    w=pd.DataFrame(0.0,index=me,columns=PX.columns)
    for d in me:
        x=carry.loc[d].dropna().sort_values()
        if len(x)>=2*k: w.loc[d,x.index[-k:]]=1/(2*k); w.loc[d,x.index[:k]]=-1/(2*k)
    return ME(w)
put('FX','Carry: long 3 highest rates, short 3 lowest (monthly)',run(cw(3)))
put('FX','Carry: long 2 highest, short 2 lowest',run(cw(2)))
# 2 trend
for L in [63,126,252]:
    s=np.sign(PX/PX.shift(L)-1).resample('ME').last(); put('FX',f'Trend: each currency long/short by its {L}-day direction',run(ME(norm(s))))
# 3 cross-sectional momentum
for L in [63,252]:
    m=(PX/PX.shift(L)-1).resample('ME').last(); w=pd.DataFrame(0.0,index=me,columns=PX.columns)
    for d in me:
        x=m.loc[d].dropna().sort_values()
        if len(x)>=6: w.loc[d,x.index[-3:]]=1/6; w.loc[d,x.index[:3]]=-1/6
    put('FX',f'Momentum: long 3 strongest, short 3 weakest ({L}-day)',run(ME(w)))
# 4 carry + trend combined
s=np.sign(PX/PX.shift(126)-1).resample('ME').last(); c3=cw(3).resample('ME').last()
put('FX','Carry + trend 50/50',run(ME(0.5*c3+0.5*norm(s))))
put('FX','Carry, only when the currency trend agrees (6-month)',run(ME(norm(c3*(np.sign(c3)==s)))))
# 5 COPY BIG TRADERS (CFTC)
def cot_frame(src,lk,sk):
    J=json.load(open(f'{S}/{src}')); out={}
    for c,rows in J.items():
        df=pd.DataFrame(rows); df['d']=pd.to_datetime(df.report_date_as_yyyy_mm_dd); df=df.drop_duplicates('d').set_index('d').sort_index()
        out[c]=(df[lk].astype(float)-df[sk].astype(float))/df.open_interest_all.astype(float)
    return pd.DataFrame(out)
groups={'speculators (non-commercial)':cot_frame('cot_legacy.json','noncomm_positions_long_all','noncomm_positions_short_all'),
        'big companies/hedgers (commercial)':cot_frame('cot_legacy.json','comm_positions_long_all','comm_positions_short_all'),
        'hedge funds (leveraged funds, 2006+)':cot_frame('cot_tff.json','lev_money_positions_long','lev_money_positions_short'),
        'asset managers (2006+)':cot_frame('cot_tff.json','asset_mgr_positions_long','asset_mgr_positions_short')}
for gname,z in groups.items():
    z=z.drop(columns=['GOLD'],errors='ignore').reindex(columns=PX.columns)
    for how,sig in [('level',np.sign(z)),('change vs 13-wk avg',np.sign(z-z.rolling(13).mean()))]:
        sig=sig.copy(); sig.index=sig.index+pd.Timedelta(days=6)
        for mode,k in [('COPY',1),('FADE',-1)]:
            w=norm(k*sig.reindex(PX.index,method='ffill').fillna(0))
            put('COPY',f'{mode} {gname}: {how}',run(w))
# gold: copy/fade speculators & commercials
g=json.load(open(f'{S}/gold.json')); gold=pd.Series(g['c'],index=pd.to_datetime(g['t'],unit='s').normalize()).dropna(); gold=gold[~gold.index.duplicated()].asfreq('B').ffill()
gr=gold.pct_change().fillna(0)
for gname,(lk,sk) in {'speculators':('noncomm_positions_long_all','noncomm_positions_short_all'),'big companies/hedgers':('comm_positions_long_all','comm_positions_short_all')}.items():
    z=cot_frame('cot_legacy.json',lk,sk)['GOLD']; ch=np.sign(z-z.rolling(13).mean()); ch.index=ch.index+pd.Timedelta(days=6)
    for mode,k in [('COPY',1),('FADE',-1)]:
        pos=(k*ch).reindex(gr.index,method='ffill').fillna(0).shift(1).fillna(0); r=pos*gr-pos.diff().abs().fillna(0)*0.0003
        put('GOLD',f'{mode} {gname} in gold (change vs 13-wk avg)',r)
put('GOLD','Hold gold',gr)
json.dump(OUT,open('../2026-11-09-fx-copy-long-results.json','w'),indent=1,default=str); pd.to_pickle(R,'fx_long_returns.pkl')
