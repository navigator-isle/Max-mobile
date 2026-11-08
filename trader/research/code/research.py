import pandas as pd, numpy as np, json, itertools, data
from bt import *
OUT={}
def study(name,px,cost,ann,is_end,oos_start,vt):
    res={}
    for sname,(fn,grid) in PER_ASSET.items():
        best=None
        keys=list(grid); combos=[dict(zip(keys,v)) for v in itertools.product(*[grid[k] for k in keys])] or [{}]
        for p in combos:
            if sname=='ma_cross' and p['f']>=p['s']: continue
            w=weights_per_asset(px,fn,p); r,t=run(px,w,cost,ann)
            si=stats(r.loc[:is_end],t,ann)
            if si and (best is None or si['sharpe']>best[1]['sharpe']): best=(p,si,w)
        p,si,w=best; r,t=run(px,w,cost,ann); so=stats(r.loc[oos_start:],t,ann)
        res[sname]={'params':p,'in_sample':si,'out_of_sample':so,'_w':w}
    if name=='crypto':
        best=None
        for L,top,reg in itertools.product([14,28,56],[2,3],[50,100,200]):
            w=xs_momentum(px,L,top,reg); r,t=run(px,w,cost,ann); si=stats(r.loc[:is_end],t,ann)
            if si and (best is None or si['sharpe']>best[1]['sharpe']): best=({'L':L,'top':top,'regime_sma':reg},si,w)
        p,si,w=best; r,t=run(px,w,cost,ann); res['xs_momentum']={'params':p,'in_sample':si,'out_of_sample':stats(r.loc[oos_start:],t,ann),'_w':w}
    # ---- the combined strategy: chosen ONLY from in-sample results (no peeking at 2022+) ----
    bh=res['buy_hold']['in_sample']['sharpe']
    picks=[k for k,v in res.items() if k!='buy_hold' and v['in_sample']['sharpe']>=max(0.3,bh) and v['in_sample']['maxdd']>-60]
    note='passed the in-sample bar (Sharpe >= buy & hold and >= 0.3, max drop better than -60%)'
    if not picks: picks=[k for k,v in res.items() if k!='buy_hold']; note='NONE passed the bar; top-2 by in-sample Sharpe used, flagged'
    picks=sorted(picks,key=lambda k:-res[k]['in_sample']['sharpe'])[:4] if 'NONE' not in note else sorted(picks,key=lambda k:-res[k]['in_sample']['sharpe'])[:2]
    print(name,'picks',picks,note)
    W=sum(res[k]['_w'] for k in picks)/len(picks)
    Wv=vol_target(W,px,vt,ann)
    for label,ww in [('COMBINED',W),('COMBINED_voltarget',Wv)]:
        r,t=run(px,ww,cost,ann)
        res[label]={'params':{'sleeves':picks,'rule':note,'vol_target':vt if 'vol' in label else None},'in_sample':stats(r.loc[:is_end],t,ann),'out_of_sample':stats(r.loc[oos_start:],t,ann),'_w':ww}
    OUT[name]={k:{kk:vv for kk,vv in v.items() if kk!='_w'} for k,v in res.items()}
    return res
cr=data.crypto(); ps=data.pse().drop(columns=['PSEI'])
rc=study('crypto',cr.loc['2016-01-01':],0.0015,365,'2021-12-31','2022-01-01',0.45)
rp=study('pse',ps.loc['2009-01-01':],0.0055,245,'2017-12-31','2018-01-01',0.15)
json.dump(OUT,open('results.json','w'),indent=1)
for m in OUT:
    print('\n=====',m)
    for k,v in OUT[m].items(): print(f"{k:20s} {str(v['params'])[:46]:46s} IS {v['in_sample']}  OOS {v['out_of_sample']}")
import pickle; pickle.dump({'crypto':{k:v['_w'] for k,v in rc.items()},'pse':{k:v['_w'] for k,v in rp.items()}},open('weights.pkl','wb'))
