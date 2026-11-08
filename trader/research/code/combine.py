import json, pickle, pandas as pd, numpy as np
from bt import stats
O=json.load(open('master_results.json')); R=pickle.load(open('master_returns.pkl','rb'))
BENCH_DD={'crypto':O['crypto']['Benchmark: hold top-20 equally']['in_sample']['maxdd'],'pse':O['pse']['Benchmark: hold all stocks equally']['in_sample']['maxdd'],'forex':-100}
picks={m:[n for n,v in O[m].items() if v['family']!='benchmark' and v['in_sample'] and v['in_sample']['sharpe']>=0.7 and v['in_sample']['maxdd']>BENCH_DD[m]] for m in O}
def parts(weighting='invvol'):
    P={}
    for m,names in picks.items():
        rs=[R[(m,n)] for n in names]; cut='2016-12-31' if m=='pse' else '2021-12-31'
        iw=np.array([1/r.loc[:cut].std() for r in rs]) if weighting=='invvol' else np.ones(len(rs))
        iw=iw/iw.sum(); df=pd.concat(rs,axis=1).fillna(0); P[m]=(df*iw).sum(axis=1)
    return P
def master(window,budget,weighting='invvol'):
    a,b=window; idx=pd.date_range(a,b,freq='D'); tot=pd.Series(0.0,index=idx); P=parts(weighting)
    for m,r in P.items(): tot+=budget[m]*r.reindex(idx).fillna(0)
    return tot,P
if __name__=='__main__':
    print('PICKED:',picks)
    B={'crypto':0.5,'forex':0.25,'pse':0.25}
    for w in [('2022-01-01','2026-10-30'),('2018-06-01','2021-03-12')]:
        t,P=master(w,B); s=stats(t,t*0,365)
        print(f"\nMAX-MASTER-1 {w}: {s}")
        print(' by year:',((1+t).groupby(t.index.year).prod()-1).mul(100).round(1).to_dict())
        for m,r in P.items():
            rr=r.loc[w[0]:w[1]]; print('  part',m,stats(rr,rr*0,365) if len(rr)>60 else 'no data in this window → cash')
    print('\nRobustness 2022→Oct 2026:')
    for name,bud,wt in [('equal weights inside markets',B,'eq'),('budget 60/20/20',{'crypto':0.6,'forex':0.2,'pse':0.2},'invvol'),('budget 40/30/30',{'crypto':0.4,'forex':0.3,'pse':0.3},'invvol'),('crypto only',{'crypto':1,'forex':0,'pse':0},'invvol')]:
        t,_=master(('2022-01-01','2026-10-30'),bud,wt); print(' ',name,stats(t,t*0,365))
