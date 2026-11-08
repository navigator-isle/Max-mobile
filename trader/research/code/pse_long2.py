exec(open('pse_long.py').read().split("OUT={}; RET={}")[0])
OUT={}; RET={}
Y=lambda d:yld.loc[d]
mom=lambda L:(lambda d:(Pf.loc[d]/Pf.shift(L).loc[d]-1).where(live.loc[d]))
summary('A  Dividend top-20, 3 months (current)',*run(Y,3))
summary('J  A + trailing stop 25% below highest close',*run(Y,3,stop=('trail',0.25)))
summary('J2 A + trailing stop 20%',*run(Y,3,stop=('trail',0.20)))
summary('J3 A + trailing stop 30%',*run(Y,3,stop=('trail',0.30)))
summary('DJ buffer top-40 + trailing stop 25%',*run(Y,3,keep_rank=40,stop=('trail',0.25)))
summary('P2 Momentum top-10 when market up (2003–2026)',*run(mom(126),1,top=10,start='2003-01-01',market_gate=mkt_up))
summary('P4 P2 + trailing stop 20% (2003–2026)',*run(mom(126),1,top=10,start='2003-01-01',market_gate=mkt_up,stop=('trail',0.20)))
summary('P5 P2 + trailing stop 15% (2003–2026)',*run(mom(126),1,top=10,start='2003-01-01',market_gate=mkt_up,stop=('trail',0.15)))
rdj,_=run(Y,3,keep_rank=40,stop=('trail',0.25)); rj,_=run(Y,3,stop=('trail',0.25))
for lab,ms in [('P2',None),('P4',('trail',0.20))]:
    rm,_=run(mom(126),1,top=10,market_gate=mkt_up,stop=ms)
    for nm,rd in [('J',rj),('DJ',rdj)]:
        summary(f'X  50% {nm} dividend + 50% {lab} momentum (2014–2026)',0.5*rd+0.5*rm.reindex(rd.index).fillna(0),{'turnover_yr':None,'buys':0,'stop_exits':0})
json.dump(OUT,open('../2026-11-09-pse-long-results-2.json','w'),indent=1,default=str); pd.to_pickle(RET,'pse_long_returns2.pkl')
for k in ['A  Dividend top-20, 3 months (current)','DJ buffer top-40 + trailing stop 25%']: print(k,OUT[k]['by_year'])
