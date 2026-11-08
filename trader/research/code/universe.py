import pandas as pd, numpy as np, json, os, glob
D='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/data'; C='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/bt/cache'
STABLE={'usdt','usdc','dai','busd','tusd','usdp','gusd','pax','husd','usdk','fdusd','pyusd','usde','eurc','wbtc','weth','steth','cbeth','wsteth','reth','paxg','xaut','frax','lusd','usdd','susd','eurs','usdglo','usd1','usds','rlusd'}
def crypto_universe():
    f=f'{C}/cu.pkl'
    if os.path.exists(f): return pd.read_pickle(f)
    P={};M={}
    for fn in glob.glob(f'{D}/data/csv/*.csv'):
        sym=os.path.basename(fn)[:-4]
        if sym in STABLE: continue
        h=open(fn).readline()
        if 'PriceUSD' not in h or 'CapMrktCurUSD' not in h: continue
        df=pd.read_csv(fn,usecols=['time','PriceUSD','CapMrktCurUSD'],parse_dates=['time']).dropna()
        if len(df)<200: continue
        df=df.set_index('time'); df.index=df.index.tz_localize(None)
        P[sym]=df.PriceUSD; M[sym]=df.CapMrktCurUSD
    P=pd.DataFrame(P).sort_index(); M=pd.DataFrame(M).reindex(P.index)
    s=pd.read_csv(f'{D}/dct/top_100_cryptocurrency_market_historical.csv',usecols=['fetch_date','symbol','current_price','market_cap'],parse_dates=['fetch_date'])
    s=s[s.symbol.isin(P.columns)]
    sp=s.pivot_table(index='fetch_date',columns='symbol',values='current_price',aggfunc='last'); sm=s.pivot_table(index='fetch_date',columns='symbol',values='market_cap',aggfunc='last')
    P=P.combine_first(sp); M=M.combine_first(sm)
    b=pd.read_csv(f'{D}/btc-price-history/data/btc-usd-daily.csv',parse_dates=['date']).set_index('date')['close']
    idx=P.index.union(b.index); P=P.reindex(idx); M=M.reindex(idx); P['btc']=b.reindex(idx).combine_first(P['btc'])
    P=P.asfreq('D').ffill(limit=3).loc['2015-06-01':]; M=M.asfreq('D').ffill(limit=7).loc['2015-06-01':]
    pd.to_pickle((P,M),f); return P,M
def pse_all():
    f=f'{C}/pse_all.pkl'
    if os.path.exists(f): return pd.read_pickle(f)
    cols={}
    for fn in glob.glob(f'{D}/pse/json/*.json'):
        t=os.path.basename(fn)[:-5]
        if t.startswith('_'): continue
        j=json.load(open(fn)); s=pd.Series(j['c'],index=pd.to_datetime(j['t'],unit='s'),dtype=float); s=s[~s.index.duplicated()]
        if len(s)>250: cols[t]=s
    px=pd.DataFrame(cols).sort_index().loc['2008-01-01':]
    px.to_pickle(f); return px
def fx_all():
    df=pd.read_csv(f'{D}/datasets_exchange-rates/data/daily.csv',parse_dates=['Date'])
    px=df.pivot_table(index='Date',columns='Country',values='Exchange rate').sort_index()
    px=px.drop(columns=[c for c in ['Venezuela'] if c in px.columns])
    # express every currency as USD per 1 unit of that currency (up = currency stronger)
    inv={c:(1/px[c]) for c in px.columns}   # FRED here gives units of currency per USD
    return pd.DataFrame(inv).loc['2000-01-01':].ffill(limit=5)
def cot():
    u={x['code']:x['label'] for x in json.load(open(f'{D}/StephenKirchner_cot-data/universe.json'))}
    j=json.load(open(f'{D}/StephenKirchner_cot-data/data/spec.json'))
    df=pd.DataFrame(j['rows'],columns=j['fields']); df['label']=df.code.map(u); df['date']=pd.to_datetime(df.date)
    df['net_pct']=(df.long-df.short)/df.oi
    return df.pivot_table(index='date',columns='label',values='net_pct')
if __name__=='__main__':
    P,M=crypto_universe(); print('crypto',P.shape,P.index.min(),P.index.max()); 
    top=M.rank(axis=1,ascending=False); print('coins ever in top20:',int((top<=20).any().sum()))
    ps=pse_all(); print('pse',ps.shape,ps.index.min(),ps.index.max())
    fx=fx_all(); print('fx',fx.shape,list(fx.columns),fx.index.max())
    c=cot(); print('cot',c.shape,c.index.max(),list(c.columns))
