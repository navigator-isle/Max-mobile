import pandas as pd, numpy as np, json, glob, os
D='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/data'
COINS=['btc','eth','bnb','xrp','ada','doge','link','ltc']
def crypto():
    cols={}
    for c in COINS:
        df=pd.read_csv(f'{D}/data/csv/{c}.csv',usecols=['time','PriceUSD'],parse_dates=['time']).dropna()
        cols[c]=df.set_index('time')['PriceUSD']
    px=pd.DataFrame(cols)
    px.index=px.index.tz_localize(None)
    # extend with the daily top-100 snapshots (to Oct 2026)
    s=pd.read_csv(f'{D}/dct/top_100_cryptocurrency_market_historical.csv',usecols=['fetch_date','symbol','current_price'],parse_dates=['fetch_date'])
    s=s[s.symbol.isin(COINS)].pivot_table(index='fetch_date',columns='symbol',values='current_price',aggfunc='last')
    px=px.combine_first(s)
    # BTC from Bitstamp daily closes (to Nov 2026)
    b=pd.read_csv(f'{D}/btc-price-history/data/btc-usd-daily.csv',parse_dates=['date']).set_index('date')['close']
    px=px.reindex(px.index.union(b.index)); px['btc']=b.reindex(px.index).combine_first(px['btc'])
    px=px.sort_index().asfreq('D').ffill(limit=3)
    return px.loc['2015-01-01':]
PSE=['AC','ALI','BDO','BPI','GLO','ICT','JFC','MBT','MER','SM','SMPH','TEL','URC']
def pse():
    cols={}
    for t in PSE+['PSEI']:
        j=json.load(open(f'{D}/pse/json/{t}.json'))
        idx=pd.to_datetime(j['t'],unit='s')
        cols[t]=pd.Series(j['c'],index=idx,dtype=float)
    px=pd.DataFrame(cols).sort_index()
    px=px[~px.index.duplicated()]
    return px.loc['2008-01-01':].ffill(limit=5)
if __name__=='__main__':
    c=crypto(); print(c.tail(3)); print(c.notna().sum()); print(c.index.min(), c.dropna(how='all').index.max())
    for k in COINS: print(k, c[k].last_valid_index())
    p=pse(); print(p.tail(2)); print(p.index.min(), p.index.max(), len(p))
