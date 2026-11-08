# PSE long dataset: prices 2002 → Nov 2026 (archive json 2002–Mar 2021 incl. delisted + PSE Edge 2015–2026), traded value,
# splits back-adjusted, cash dividends 2013–2026 (PSE Quarterly Dividend Reports 2013–Apr 2022 + stockanalysis Dec 2021 →).
import pandas as pd, numpy as np, json, glob, os
from pse2 import edge, adjust_splits, S
def archive_full():
    C,Vv={},{}
    for fn in glob.glob(f'{S}/data/pse/json/*.json'):
        t=os.path.basename(fn)[:-5]
        if t.startswith('_'): continue
        j=json.load(open(fn)); idx=pd.to_datetime(j['t'],unit='s')
        c=pd.Series(j['c'],index=idx,dtype=float); v=pd.Series(j.get('v',[np.nan]*len(idx)),index=idx,dtype=float)
        m=~idx.duplicated(); c,v=c[m],v[m]
        if len(c)>120: C[t]=c; Vv[t]=v*c
    return pd.DataFrame(C).sort_index(), pd.DataFrame(Vv).sort_index()
def load():
    f=f'{S}/bt/cache/pse3.pkl'
    if os.path.exists(f): return pd.read_pickle(f)
    E,EV=edge(); A,AV=archive_full(); A=A.drop(columns=[c for c in ['PSEI'] if c in A.columns])
    cols=sorted(set(E.columns)|set(A.columns)); idx=E.index.union(A.index)
    P=pd.DataFrame(index=idx,columns=cols,dtype=float); V=pd.DataFrame(index=idx,columns=cols,dtype=float)
    for c in cols:
        e=E[c].dropna() if c in E else pd.Series(dtype=float); a=A[c].dropna() if c in A else pd.Series(dtype=float)
        if len(e) and len(a):
            ov=a.index.intersection(e.index); k=(e.loc[ov]/a.loc[ov]).median() if len(ov)>20 else 1.0
            P[c]=pd.concat([a[a.index<e.index.min()]*k,e]).reindex(idx)
            V[c]=pd.concat([AV[c][AV.index<e.index.min()],EV[c].dropna()]).reindex(idx)
        elif len(e): P[c]=e.reindex(idx); V[c]=EV[c].reindex(idx)
        else: P[c]=a.reindex(idx); V[c]=AV[c].reindex(idx)
    P=P.where(P>0).loc['2002-01-01':]; keep=P.notna().sum(axis=1)>40; P=P[keep]; V=V.reindex(P.index)
    raw=P.copy(); P,log=adjust_splits(P)
    fac=(P/raw).ffill().bfill()          # split factor per day: adjusted = raw × fac
    D=pd.DataFrame(0.0,index=P.index,columns=P.columns); Dreg=D.copy()
    def add(sym,ex,amt,special,adjusted):
        if sym not in D.columns: return
        j=P.index.searchsorted(pd.Timestamp(ex))
        if j>=len(P.index): return
        a=amt if adjusted else amt*fac.iat[j,P.columns.get_loc(sym)]
        D.iat[j,D.columns.get_loc(sym)]+=a
        if not special: Dreg.iat[j,D.columns.get_loc(sym)]+=a
    for e in json.load(open(f'{S}/qd/dividends_2013_2022.json')):
        if e['ex']<'2021-12-01': add(e['sym'],e['ex'],e['amt'],e['special'],False)
    for fn in glob.glob(f'{S}/dl/div/*.json'):
        t=os.path.basename(fn)[:-5]
        for d,a in (json.load(open(fn)).get('chart') or []):
            if d>='2021-12-01': add(t,d,a,False,True)
    pd.to_pickle((P,V,D,Dreg,log),f); return P,V,D,Dreg,log
if __name__=='__main__':
    P,V,D,Dr,log=load(); print(P.shape,P.index.min(),P.index.max(),'splits',len(log))
    print('stocks alive per year', P.notna().groupby(P.index.year).any().sum(axis=1).to_dict())
    print('div events per year',(D>0).groupby(D.index.year).sum().sum(axis=1).to_dict())
