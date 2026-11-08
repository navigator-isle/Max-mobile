# Does trading only the "best" setups help? Crypto swing on all Binance coins, unseen 2022 → Nov 2026, same costs.
import pandas as pd, numpy as np, json
exec(open('crypto_binance.py').read().split("O={}")[0])
from swing import evaluate
vol_ok=(V>1.5*V.rolling(20).mean().shift(1))
coin_up=P>P.rolling(50).mean()
R={}
def go(name,elig,reg):
    r,done=swing_curve(P,elig,c,A,2,reg is not None,reg)
    a=stats(r.loc['2018-01-01':'2021-12-31'],r*0,A); b=stats(r.loc['2022-01-01':'2026-11-06'],r*0,A)
    d=done[done.entry>='2022-01-01'] if len(done) else done
    R[name]={'2018-2021':a,'2022-Nov 2026':b,'trades_2022+':len(d),'win_%':round((d.R>0).mean()*100,1) if len(d) else None,'avg_R':round(d.R.mean(),2) if len(d) else None}
    print(name,R[name],flush=True)
go('A every breakout (current)',top20,None)
go('B only when BTC above 200-day avg',top20,btc>btc.rolling(200).mean())
go('C only when BTC above 50-day avg',top20,btc>btc.rolling(50).mean())
go('D breakout with 1.5x volume',top20&vol_ok,None)
go('E coin above its 50-day avg + BTC above 200-day',top20&coin_up,btc>btc.rolling(200).mean())
go('F all filters (BTC>200d, coin>50d, 1.5x volume)',top20&coin_up&vol_ok,btc>btc.rolling(200).mean())
json.dump(R,open('../2026-11-09-quality-filter-test.json','w'),indent=1,default=str)
