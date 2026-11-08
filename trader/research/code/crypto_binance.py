# Cross-check on ALL Binance USDT coins (incl. delisted): point-in-time top-20 by 30-day traded value. Settings fixed from the earlier test
# (chosen on 2016–2021) — no re-tuning — judged on 2022 → Nov 2026. Cost 0.15% per side (0.10% fee + slippage).
import json,glob,os,pandas as pd,numpy as np,sys
sys.path.insert(0,os.path.dirname(__file__))
from bt import run,stats
from master import swing_curve
S='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/dl/bin'
BAD=('UP','DOWN','BULL','BEAR'); STB={'USDC','BUSD','TUSD','USDP','FDUSD','DAI','PAX','EUR','GBP','AUD','USDS','SUSD','UST','PAXG','WBTC','AEUR','EURI','USDE','XUSD','BFUSD','USD1','TRY','BRL','BIDR','RUB','IDRT','NGN','UAH','ZAR'}
C,Vl={},{}
for f in glob.glob(f'{S}/*USDT.json'):
    b=os.path.basename(f)[:-9]
    if b in STB or b.endswith(BAD) or not b: continue
    d=json.load(open(f))
    if len(d)<60: continue
    df=pd.DataFrame(d,columns=['t','o','h','l','c','qv']); df.index=pd.to_datetime(df.t,unit='ms')
    C[b.lower()]=df.c; Vl[b.lower()]=df.qv
P=pd.DataFrame(C).sort_index().asfreq('D'); V=pd.DataFrame(Vl).reindex(P.index)
P=P.ffill(limit=3); stale=P.notna()&(V.fillna(0).rolling(5).sum()>0)    # coin dropped once trading stops
v30=V.rolling(30,min_periods=20).mean(); top20=(v30.rank(axis=1,ascending=False)<=20)&stale
P=P.where(stale); A=365; c=0.0015; OS=('2022-01-01','2026-11-06'); btc=P['btc']
def w_rot(L=14,top=5,reg=50):
    ret=P/P.shift(L)-1; on=btc>btc.rolling(reg).mean(); w=pd.DataFrame(0.0,index=P.index,columns=P.columns); cur=pd.Series(dtype=float)
    for i,d in enumerate(P.index):
        if i%7==0:
            r=ret.loc[d][top20.loc[d]].dropna(); r=r[r>0].sort_values(ascending=False).head(top)
            cur=pd.Series(1/top,index=r.index) if (len(r) and on.loc[d]) else pd.Series(dtype=float)
        if len(cur): w.loc[d,cur.index]=cur.values
    return w
O={}
r,t=run(P,w_rot(),c,A); O['Momentum rotation top-20 (L14, top5, BTC>SMA50)']={'2018-2021':stats(r.loc['2018-01-01':'2021-12-31'],t,A),'2022-Nov 2026 (unseen)':stats(r.loc[OS[0]:OS[1]],t,A)}
r,done=swing_curve(P,top20,c,A,2,False,None); O['Swing breakout + 2×ATR trail (top-20)']={'2018-2021':stats(r.loc['2018-01-01':'2021-12-31'],r*0,A),'2022-Nov 2026 (unseen)':stats(r.loc[OS[0]:OS[1]],r*0,A)}
bh=top20.astype(float).div(top20.sum(axis=1).replace(0,np.nan),axis=0).fillna(0); r,t=run(P,bh,c,A); O['Benchmark: hold top-20 equally']={'2018-2021':stats(r.loc['2018-01-01':'2021-12-31'],t,A),'2022-Nov 2026 (unseen)':stats(r.loc[OS[0]:OS[1]],t,A)}
r,t=run(P[['btc']],pd.DataFrame({'btc':1.0},index=P.index),c,A); O['Benchmark: hold BTC']={'2022-Nov 2026 (unseen)':stats(r.loc[OS[0]:OS[1]],t,A)}
O['_data']={'coins':P.shape[1],'from':str(P.index.min().date()),'to':str(P.index.max().date())}
for k,v in O.items(): print(k,v)
json.dump(O,open('/home/claude/max-mobile/trader/research/2026-11-08-crypto-binance-results.json','w'),indent=1,default=str)
