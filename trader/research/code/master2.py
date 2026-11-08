# MAX-MASTER-2: only parts that held up on unseen data in EVERY dataset. Monthly rebalance to fixed weights. 2022 → Oct 2026.
import pickle,pandas as pd,numpy as np,json,os,sys
sys.path.insert(0,os.path.dirname(__file__))
M=pickle.load(open('/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/bt/master_returns.pkl','rb')); PS=pickle.load(open('pse_returns.pkl','rb')); CP=pd.read_pickle('copy_returns.pkl')
exec(open('crypto_binance.py').read().split("O={}")[0])   # rebuild Binance universe
r_sw,_=swing_curve(P,top20,c,A,2,False,None)
def mon(r): return (1+r).resample('ME').prod()-1
fx=[k for k in M if k[0]=='forex' and 'Copy big traders' in k[1]][0]
S=pd.DataFrame({'crypto swing (ATR trail)':mon(r_sw),'PSE high-dividend top-20':mon(PS['High dividend yield top-20']),'forex copy big traders (COT fade)':mon(M[fx]),
                'copy steady traders (Hyperliquid)':CP['steady-10']}).loc['2022-01-31':'2026-10-31']
S.index=S.index.to_period('M')
W={'crypto swing (ATR trail)':0.30,'PSE high-dividend top-20':0.30,'forex copy big traders (COT fade)':0.25,'copy steady traders (Hyperliquid)':0.15}
port=sum(S[k].fillna(0)*w for k,w in W.items())   # missing copy months = cash
def st(r):
    eq=(1+r).cumprod(); y=len(r)/12; dd=(eq/eq.cummax()-1).min()
    return {'months':len(r),'total_%':round((eq.iat[-1]-1)*100,1),'per_year_%':round((eq.iat[-1]**(1/y)-1)*100,1),'max_drop_%':round(dd*100,1),'win_months_%':round((r>0).mean()*100),'worst_month_%':round(r.min()*100,1),'sharpe':round(r.mean()/r.std()*np.sqrt(12),2)}
O={'weights':W,'MAX-MASTER-2 (2022-Oct 2026)':st(port),'without copy trading':st(sum(S[k].fillna(0)*w for k,w in W.items() if 'Hyperliquid' not in k)/0.85),
   'parts':{k:st(S[k].dropna()) for k in S},'correlation':S.corr().round(2).to_dict(),'by_year_%':{str(y):round(((1+port[port.index.year==y]).prod()-1)*100,1) for y in range(2022,2027)}}
print(json.dumps(O,indent=1,default=str)); json.dump(O,open('../2026-11-08-MAX-MASTER-2-results.json','w'),indent=1,default=str)
