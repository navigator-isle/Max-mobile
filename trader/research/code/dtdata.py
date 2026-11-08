import pandas as pd, numpy as np, json, subprocess, os, glob
D='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/data'
C='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/bt/cache'
os.makedirs(C,exist_ok=True)
def btc15():
    f=f'{C}/btc15.pkl'
    if os.path.exists(f): return pd.read_pickle(f)
    parts=[]
    for chunk in pd.read_csv(f'{D}/btcmin/data/historical/btcusd_bitstamp_1min_2012-2025.csv.gz',chunksize=2_000_000):
        chunk=chunk[chunk.timestamp>=1514764800]   # from 2018
        if len(chunk): parts.append(chunk)
    parts.append(pd.read_csv(f'{D}/btcmin/data/updates/btcusd_bitstamp_1min_latest.csv'))
    m=pd.concat(parts).drop_duplicates('timestamp').sort_values('timestamp')
    m.index=pd.to_datetime(m.timestamp,unit='s')
    o=m.resample('15min').agg({'open':'first','high':'max','low':'min','close':'last','volume':'sum'}).dropna()
    o.to_pickle(f); return o
def fx(pair,tf='h1'):
    df=pd.read_csv(f'{D}/ejtraderLabs_historical-data/{pair}/{pair}{tf}.csv',parse_dates=['Date']).set_index('Date')
    sc=1e5 if pair!='USDJPY' else 1e3
    df[['open','high','low','close']]=df[['open','high','low','close']]/sc
    return df[['open','high','low','close']]
def eur15_2026():
    df=pd.read_csv(f'{D}/getdata-finance_eurusd-15m-ohlcv-forex-historical-data/EURUSD_15m.csv',parse_dates=['datetime']).set_index('datetime')
    df.index=df.index.tz_convert(None); return df[['open','high','low','close']]
def fx_daily():
    df=pd.read_csv(f'{D}/datasets_exchange-rates/data/daily.csv',parse_dates=['Date'])
    m={'Euro':'EURUSD','United Kingdom':'GBPUSD','Japan':'USDJPY','Australia':'AUDUSD','Canada':'USDCAD','Switzerland':'USDCHF','New Zealand':'NZDUSD'}
    df=df[df.Country.isin(m)].pivot_table(index='Date',columns='Country',values='Exchange rate').rename(columns=m)
    return df.sort_index()
def pse_daily_recent():
    h=json.load(open(f'{D}/zhameersheraz_ph-stocks/history.json'))['stocks']
    return pd.DataFrame({k:pd.Series({pd.Timestamp(b['d']):b['c'] for b in v}) for k,v in h.items()}).sort_index(), {k:pd.DataFrame(v).assign(d=lambda x:pd.to_datetime(x.d)).set_index('d') for k,v in h.items()}
def pse_intraday():
    """30-minute snapshots from the git history of stocks.json (PSE Edge last price)."""
    f=f'{C}/pse_intra.pkl'
    if os.path.exists(f): return pd.read_pickle(f)
    repo=f'{D}/ph_full'
    revs=subprocess.run(['git','-C',repo,'log','--format=%H %ct','--','stocks.json'],capture_output=True,text=True).stdout.split('\n')
    rows=[]
    for line in revs:
        if not line.strip(): continue
        h,ts=line.split()
        try: j=json.loads(subprocess.run(['git','-C',repo,'show',f'{h}:stocks.json'],capture_output=True,text=True).stdout)
        except Exception: continue
        st=j.get('stocks') or []
        for s in (st if isinstance(st,list) else []):
            p=s.get('last_traded_price') or s.get('last') or s.get('price')
            if p: rows.append((int(ts),s.get('symbol'),float(p),s.get('as_of'),s.get('open'),s.get('high'),s.get('low')))
    df=pd.DataFrame(rows,columns=['ts','sym','price','as_of','open','high','low']); df.to_pickle(f); return df
