# PSE full data: PSE Edge daily OHLC + value (2015 → Nov 2026, all 284 listed stocks) merged with the older archive (2009–Mar 2021, incl. delisted),
# split/stock-dividend gaps detected and adjusted, cash dividends (stockanalysis, 2021→2026) added on ex-dates (total return).
import pandas as pd, numpy as np, json, glob, os
S='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'
RATIOS=[2,3,4,5,10,20,1.5,1.25,1.2,1.1,0.5,0.1,0.2,0.25,1/3]
def edge():
    C,V={},{}
    for f in glob.glob(f'{S}/dl/pse/*.json'):
        t=os.path.basename(f)[:-5]; d=json.load(open(f))
        if len(d)<60: continue
        df=pd.DataFrame(d); df['d']=pd.to_datetime(df.CHART_DATE,format='%b %d, %Y %H:%M:%S'); df=df.drop_duplicates('d').set_index('d').sort_index()
        C[t]=df.CLOSE.astype(float); V[t]=df.VALUE.astype(float)
    return pd.DataFrame(C).sort_index(), pd.DataFrame(V).sort_index()
def archive():
    import sys; sys.path.insert(0,os.path.dirname(__file__)); import universe as U
    return U.pse_all()
def adjust_splits(px):
    """Back-adjust one-day jumps that match a split/stock-dividend ratio (≥ +60% or ≤ −35% overnight, close to a common ratio, not reversed next days)."""
    out=px.copy(); log=[]
    for c in px.columns:
        s=px[c].dropna(); s=s[s>0]; r=s/s.shift(1)
        for d,x in r[(r<0.65)|(r>1.6)].items():
            inv=1/x; best=min(RATIOS,key=lambda k:abs(np.log(inv/k)))
            if abs(np.log(inv/best))>0.08: continue
            i=s.index.get_loc(d); nxt=s.iloc[i:i+5]
            if (nxt/s.iloc[i-1]).between(0.85,1.15).any(): continue   # bounced back → bad print, not a split
            out.loc[:d-pd.Timedelta(days=1),c]=out.loc[:d-pd.Timedelta(days=1),c]/best; log.append((c,str(d.date()),round(best,3)))
    return out,log
def dividends(idx,cols):
    D=pd.DataFrame(0.0,index=idx,columns=cols)
    for f in glob.glob(f'{S}/dl/div/*.json'):
        t=os.path.basename(f)[:-5]
        if t not in cols: continue
        ch=json.load(open(f)).get('chart') or []
        for d,a in ch:
            d=pd.Timestamp(d); j=idx.searchsorted(d)
            if j<len(idx): D.iat[j,D.columns.get_loc(t)]+=a
    return D
def load():
    f=f'{S}/bt/cache/pse2.pkl'
    if os.path.exists(f): return pd.read_pickle(f)
    E,V=edge(); A=archive(); A=A.drop(columns=[c for c in ['PSEI'] if c in A.columns])
    # archive is used before Edge starts for each stock (and for delisted names); scaled to join smoothly
    cols=sorted(set(E.columns)|set(A.columns)); idx=E.index.union(A.index[A.index<E.index.min()]).union(A.index)
    P=pd.DataFrame(index=idx,columns=cols,dtype=float)
    for c in cols:
        e=E[c].dropna() if c in E else pd.Series(dtype=float); a=A[c].dropna() if c in A else pd.Series(dtype=float)
        if len(e) and len(a):
            ov=a.index.intersection(e.index)
            k=(e.loc[ov]/a.loc[ov]).median() if len(ov)>20 else 1.0
            s=pd.concat([a[a.index<e.index.min()]*k,e])
        else: s=e if len(e) else a
        P[c]=s.reindex(idx)
    P=P.where(P>0).loc['2009-01-01':]; P=P[P.notna().sum(axis=1)>50]
    P,log=adjust_splits(P)
    Dv=dividends(P.index,P.columns)
    V=V.reindex(P.index)
    pd.to_pickle((P,V,Dv,log),f); return P,V,Dv,log
if __name__=='__main__':
    P,V,Dv,log=load(); print(P.shape,P.index.min(),P.index.max()); print('splits adjusted',len(log),log[:15]); print('div events',int((Dv>0).sum().sum()))
