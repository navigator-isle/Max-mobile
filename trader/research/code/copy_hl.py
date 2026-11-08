# Copy trading on REAL trader records (Hyperliquid — the exchange Invo copies from). Honest test: at each month-end pick traders
# using ONLY their past record, then measure what they made in the NEXT month. Accounts that later blew up are included.
import json, glob, numpy as np, pandas as pd, os
S='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/dl/hl'
acc={}
for f in glob.glob(f'{S}/p_*.json'):
    d=json.load(open(f)); 
    if not d.get('pnlHistory') or len(d['pnlHistory'])<5: continue
    pn=pd.Series({pd.Timestamp(t,unit='ms'):float(v) for t,v in d['pnlHistory']}).sort_index()
    av=pd.Series({pd.Timestamp(t,unit='ms'):float(v) for t,v in d['accountValueHistory']}).sort_index()
    acc[os.path.basename(f)[2:-5]]=(pn[~pn.index.duplicated()],av[~av.index.duplicated()])
def at(s,t):
    s=s[s.index<=t]; return s.iat[-1] if len(s) else np.nan
ME=pd.date_range('2023-03-31','2026-10-31',freq='ME')
rows=[]
for a,(pn,av) in acc.items():
    st=pn.index.min()
    for i,t in enumerate(ME[:-1]):
        if t<st: continue
        t2=ME[i+1]; v=at(av,t)
        if not v or v<10000: continue
        dp=at(pn,t2)-at(pn,t); fwd=dp/max(v,at(av,t2)-dp)   # capital = start balance or start+deposits, whichever is larger
        def back(days):
            t0=t-pd.Timedelta(days=days)
            if t0<st: return np.nan
            v0=at(av,t0); dp=at(pn,t)-at(pn,t0); cap=max(v0 or 0,at(av,t)-dp); return dp/cap if cap>1000 else np.nan
        rows.append({'a':a,'t':t,'av':v,'fwd':max(fwd,-1.0),'r30':back(30),'r90':back(90),'r180':back(180),'pnl90':at(pn,t)-at(pn,t-pd.Timedelta(days=90)) if t-pd.Timedelta(days=90)>=st else np.nan})
R=pd.DataFrame(rows); print('accounts',len(acc),'trader-months',len(R))
# consistency score: share of positive months in the last 6 + low drawdown proxy
R=R.sort_values(['a','t']); R['pos6']=R.groupby('a').fwd.transform(lambda x:(x.shift(1)>0).rolling(6,min_periods=6).mean())
R['vol6']=R.groupby('a').fwd.transform(lambda x:x.shift(1).rolling(6,min_periods=6).std())
R['sharpe6']=R.groupby('a').fwd.transform(lambda x:x.shift(1).rolling(6,min_periods=6).mean())/R['vol6']
DRAG=0.005   # copy delay/slippage per month (assumption; copier also pays the same trading fees the trader already paid)
def strat(score,N,filt=None):
    out={}
    for t,g in R.groupby('t'):
        g=g.dropna(subset=[score]); 
        if filt is not None: g=g[filt(g)]
        if len(g)<N: continue
        out[t]=g.nlargest(N,score).fwd.clip(-1,1).mean()-DRAG
    return pd.Series(out)
def st(r):
    if len(r)<6: return None
    eq=(1+r).cumprod(); dd=(eq/eq.cummax()-1).min(); yrs=len(r)/12
    return {'months':len(r),'total_%':round((eq.iat[-1]-1)*100,1),'per_year_%':round((eq.iat[-1]**(1/yrs)-1)*100,1),'win_months_%':round((r>0).mean()*100),'worst_month_%':round(r.min()*100,1),'max_drop_%':round(dd*100,1),'sharpe':round(r.mean()/r.std()*np.sqrt(12),2) if r.std()>0 else 0}
OUT={}; RS={}
allm=R.assign(f=R.fwd.clip(-1,1)).groupby('t').f.mean()-DRAG; OUT['Copy everyone (average active trader)']=st(allm); RS['all']=allm
for sc in ['r30','r90','r180','pnl90','sharpe6']:
    for N in [5,10,20]:
        r=strat(sc,N); OUT[f'Copy top-{N} by {sc}']=st(r); RS[f'{sc}-{N}']=r
for N in [5,10,20]:
    r=strat('sharpe6',N,lambda g:(g.pos6>=0.67)&(g.r90>0)&(g.av>=100000)); OUT[f'Copy top-{N} steady (≥4/6 green months, 90d>0, ≥$100k)']=st(r); RS[f'steady-{N}']=r
# split: chosen-on-early vs unseen-later
for k,r in RS.items():
    a=r.loc[:'2024-12-31']; b=r.loc['2025-01-01':]
    OUT.setdefault('_split',{})[k]={'2023-2024':st(a),'2025-Oct 2026':st(b)}
OUT['_median_trader_month_%']=round(R.fwd.median()*100,2); OUT['_share_of_traders_positive_month_%']=round((R.fwd>0).mean()*100,1)
OUT['_note']={'accounts':len(acc),'trader_months':len(R),'drag_per_month_%':DRAG*100,'source':'api.hyperliquid.xyz portfolio (allTime pnl & account value history), leaderboard sample: 1,500 most active accounts (≥$20M volume), blown-up accounts included'}
for k,v in OUT.items():
    if not k.startswith('_'): print(f'{k:60s}',v)
json.dump(OUT,open('../2026-11-08-copytrading-hl-results.json','w'),indent=1,default=str); pd.to_pickle(RS,'copy_returns.pkl')
