import pandas as pd, numpy as np, itertools, json, sys, data, dtdata as dd
from swing import *
def fxd():
    out={}
    for p in ['EURUSD','GBPUSD','USDJPY','AUDUSD','XAUUSD']:
        f=pd.read_csv(f'{dd.D}/ejtraderLabs_historical-data/{p}/{p}d1.csv',parse_dates=['Date']).set_index('Date')
        sc=1e3 if p in ('USDJPY',) else (1e2 if p=='XAUUSD' else 1e5)
        out[p]=f.close/sc
    return pd.DataFrame(out).sort_index()
MK={
 'crypto':dict(px=data.crypto().loc['2016-01-01':],cost=0.0015,ann=365,IS=('2016-01-01','2021-12-31'),OOS=('2022-01-01',None),reg_sym='btc',dirs=[1]),
 'pse':dict(px=data.pse().loc['2009-01-01':],cost=0.0055,ann=245,IS=('2009-01-01','2016-12-31'),OOS=('2017-01-01',None),reg_sym='PSEI',dirs=[1]),
 'forex_gold':dict(px=fxd().loc['2012-12-01':],cost=0.0001,ann=260,IS=('2012-12-01','2018-12-31'),OOS=('2019-01-01',None),reg_sym=None,dirs=[1,-1]),
}
ALL={}
def main():
  for m,cfg in MK.items():
      px=cfg['px']; trade_px=px.drop(columns=[c for c in ['PSEI'] if c in px.columns])
      regime=None
      if cfg['reg_sym']: rs=px[cfg['reg_sym']]; regime=(rs>rs.rolling(200).mean())
      atr={c:atr_close(trade_px[c].dropna()) for c in trade_px.columns}
      rows=[]
      for (ename,efn),k,use_reg in itertools.product(ENTRIES.items(),[2,3,4],[False,True]):
          tr=[]
          for c in trade_px.columns:
              s=trade_px[c].dropna()
              for dr in cfg['dirs']:
                  if use_reg:
                      if cfg['reg_sym']: rg=regime.shift(1)
                      else: sm=s.rolling(200).mean(); rg=((s>sm) if dr==1 else (s<sm)).shift(1)   # FX: trade only with the 200-day trend
                  else: rg=None
                  for t in trades_for(s,atr[c].reindex(s.index),efn,k,rg,direction=dr): tr.append((c,)+t)
          res={}
          for per in ['IS','OOS']:
              a,b=cfg[per]; sub=trade_px.loc[a:b]; trs=[t for t in tr if t[1]>=sub.index[0] and t[1]<=sub.index[-1]]
              # exits beyond the window are clipped to the last day
              trs=[(t[0],t[1],min(t[2],sub.index[-1]),t[3],t[4] if t[2]<=sub.index[-1] else trade_px.at[sub.index[-1],t[0]]*t[6],t[5],t[6]) for t in trs]
              cur,done=portfolio(sub.ffill(),trs,cfg['cost'])
              res[per]=evaluate(cur,done,cfg['ann'])
          rows.append({'setup':f"{ename} | trail {k}×ATR | {'trend filter' if use_reg else 'no filter'}",'IS':res['IS'],'OOS':res['OOS']})
          print(m,rows[-1]['setup'],'IS mar',res['IS'] and res['IS']['mar'],'OOS total',res['OOS'] and res['OOS']['total_%'],flush=True)
      ALL[m]=rows
  json.dump(ALL,open('swing_results.json','w'),indent=1,default=str)

if __name__=='__main__': main()