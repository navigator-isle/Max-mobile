# Builds Max's trading notes (Obsidian vault) from the downloaded data. Every number comes from the data files; nothing typed by hand
# except the event list (dated, with sources) and platform facts (with sources).
import json, glob, os, re, sys, math, datetime as dt, collections, zipfile
import pandas as pd, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
S = '/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'
RES = '/home/claude/max-mobile/trader/research'
OUT = f'{S}/MaxTrading'
TODAY = '9 Nov 2026'
NOTES = {}   # path -> text
def note(path, title, tags, body):
    NOTES[f'{path}/{title}.md'] = f'---\ntags: [{", ".join(["trading"] + tags)}]\n---\n' + body.strip() + '\n'
def f2(x, d=2):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))): return '–'
    a = abs(x)
    if a >= 1000: return f'{x:,.0f}'
    if a >= 100: return f'{x:,.1f}'
    if a >= 1: return f'{x:,.2f}'
    if a >= 0.01: return f'{x:.4f}'
    return f'{x:.3g}'
def d2(x): return f'{x:.6f}'.rstrip('0').rstrip('.') if x < 10 else f'{x:,.4f}'.rstrip('0').rstrip('.')
def pc(x): return '–' if x is None or (isinstance(x, float) and math.isnan(x)) else f'{x*100:+.1f}%'
def money(v):
    if v is None or (isinstance(v, float) and math.isnan(v)): return '–'
    for u, n in ((1e9, 'B'), (1e6, 'M'), (1e3, 'K')):
        if abs(v) >= u: return f'{v/u:,.1f}{n}'
    return f'{v:,.0f}'
J = lambda f: json.load(open(f))
SRC_PSE = ('- PSE Edge daily prices (edge.pse.com.ph, 2015 → Nov 2026) + PSE archive (2002 → Mar 2021, incl. delisted)\n'
           '- Dividends (real peso amounts): PSE Quarterly Dividend Reports 4Q2013 → 3Q2025 (documents.pse.com.ph) + PSE Edge dividends list (Oct 2025 → 2026)')

# =====================================================================================  PSE
import pse3
from pse2 import edge
from pse3 import archive_full
E, EV = edge(); A_, AV = archive_full(); A_ = A_.drop(columns=[c for c in ['PSEI'] if c in A_.columns])
cols = sorted(set(E.columns) | set(A_.columns)); idx = E.index.union(A_.index)
RAW = {}; VAL = {}
for c in cols:
    e = E[c].dropna() if c in E else pd.Series(dtype=float); a = A_[c].dropna() if c in A_ else pd.Series(dtype=float)
    if len(e) and len(a):
        ov = a.index.intersection(e.index); k = (e.loc[ov] / a.loc[ov]).median() if len(ov) > 20 else 1.0
        RAW[c] = pd.concat([a[a.index < e.index.min()] * k, e]); VAL[c] = pd.concat([AV[c][AV.index < e.index.min()], EV[c].dropna()])
    elif len(e): RAW[c] = e; VAL[c] = EV[c].dropna()
    else: RAW[c] = a; VAL[c] = AV[c].dropna()
P, V, Dadj, Dreg, splits = pse3.load()
DIR = {r['sym']: r for r in J(f'{S}/dl/pse_dir.json')}
# dividend events with raw amounts
DIV = collections.defaultdict(list)
for e in J(f'{S}/qd/dividends_2013_2026.json'):
    DIV[e['sym']].append((e['ex'], e['amt'], 'special' if e['special'] else '', e.get('src', 'PSE report')))
for k in DIV: DIV[k].sort()
SPL = collections.defaultdict(list)
for c, d, r in splits: SPL[c].append((d, r))
pse_index = {}
psei = J(f'{S}/data/pse/json/PSEI.json'); psei = pd.Series(psei['c'], index=pd.to_datetime(psei['t'], unit='s'))
PSEI_YE = {y: float(psei[psei.index.year == y].iloc[-1]) for y in range(2002, 2021)}
PSEI_YE.update({2021: 7122.63, 2022: 6566.39, 2023: 6450.04, 2024: 6528.79, 2025: 6052.92})   # PSE / news year-end closes
PSEI_NOW = 5761.95  # 6 Nov 2026 (Yahoo Finance PSEI.PS)

stock_rows = {}
def stock_note(sym):
    s = RAW[sym].dropna(); s = s[s > 0]
    if len(s) < 40: return None
    v = VAL.get(sym, pd.Series(dtype=float)).reindex(s.index)
    info = DIR.get(sym); listed = info is not None
    yrs = sorted(set(s.index.year)); lines = []; dsum = {}
    ev = DIV.get(sym, [])
    for y in yrs:
        sy = s[s.index.year == y]; prev = s[s.index.year == y - 1]
        ch = sy.iloc[-1] / prev.iloc[-1] - 1 if len(prev) else None
        vy = v[v.index.year == y].dropna(); tv = vy.mean() if len(vy) else None
        dv = [x for x in ev if x[0][:4] == str(y)]; tot = sum(x[1] for x in dv); dsum[y] = tot
        dtxt = ''
        if dv:
            dtxt = f' · div ₱{f2(tot)} ({tot/sy.iloc[-1]*100:.1f}%): ' + ', '.join(
                f"{dt.date.fromisoformat(x[0]).strftime('%d%b')} {d2(x[1])}{'S' if x[2] else ''}{' (upcoming)' if x[0] > s.index[-1].strftime('%Y-%m-%d') else ''}" for x in dv)
        lines.append(f"- {y}{'*' if y == yrs[-1] else ''}: ₱{f2(sy.iloc[-1])} {pc(ch) if ch is not None else 'start'} · H {f2(sy.max())} L {f2(sy.min())}"
                     + (f" · ₱{money(tv)}/d" if tv else '') + dtxt)
    last = s.iloc[-1]; hi = s.max(); hid = s.idxmax(); lo = s.min(); lod = s.idxmin()
    ttm = sum(x[1] for x in ev if (s.index[-1] - pd.Timedelta(days=365)).strftime('%Y-%m-%d') < x[0] <= s.index[-1].strftime('%Y-%m-%d'))
    head = [f"**{sym}{' — ' + info['name'] if listed else ''}**",
            f"- Status: {'listed on PSE' if listed else 'not in the Nov 2026 PSE list (delisted, suspended or renamed)'}" + (f" · sector {info['sector']} › {info['sub']} · listed {info['listed']}" if listed else ''),
            f"- Data: {s.index[0].date()} → {s.index[-1].date()} ({len(s):,} trading days)",
            f"- Last close ₱{f2(last)} ({s.index[-1].date()}) · all-time high ₱{f2(hi)} ({hid.date()}) · low ₱{f2(lo)} ({lod.date()}) · now {pc(last/hi-1)} from high",
            f"- Cash dividends last 12 months ₱{f2(ttm)} = {ttm/last*100:.1f}% yield" if ttm else "- No cash dividend in the last 12 months",
            f"- Dividend events on record (2013 → 2026): {len(ev)}"]
    if SPL.get(sym): head.append('- Splits / stock dividends detected (prices before these dates are as traded then): ' + ', '.join(f'{d} (÷{r:g})' for d, r in SPL[sym]))
    body = '\n'.join(head) + '\n\n**Year by year** (close, change, H high, L low, ₱/d average traded value per day, div = cash dividends that year (yield on year-end close): ex-date amount per share, S = special; * = year to date; prices as traded)\n' + '\n'.join(lines)
    body += '\n\n**Sources**\n' + SRC_PSE
    stock_rows[sym] = {'last': last, 'ttm_y': ttm / last if ttm else 0, 'listed': listed, 'hi': hi, 'n': len(s), 'from': s.index[0].year,
                       'sector': info['sector'] if listed else 'delisted', 'name': info['name'] if listed else '', 'val': v.dropna().tail(20).mean() if v.notna().any() else None}
    return body
for sym in sorted(RAW):
    b = stock_note(sym)
    if b: note('Trading/PSE/PSE stocks/' + (DIR[sym]['sector'] if sym in DIR else 'Delisted or not listed now'), sym, ['pse', 'stock', sym.lower()], b)
# market by year
P_raw_df = pd.DataFrame({k: v for k, v in RAW.items()}).sort_index()
yl = []
for y in range(2002, 2027):
    py = PSEI_YE.get(y, PSEI_NOW if y == 2026 else None); pp = PSEI_YE.get(y - 1)
    alive = P_raw_df.loc[str(y)].notna().any().sum() if str(y) in P_raw_df.index.year.astype(str) else 0
    nd = sum(1 for k, ev in DIV.items() for x in ev if x[0][:4] == str(y))
    yl.append(f"- {y}{' (to 6 Nov)' if y == 2026 else ''}: PSEi {f2(py)} ({pc(py/pp-1) if pp else '–'}) · stocks with prices {alive} · cash dividend payments on record {nd if y >= 2013 else 'n/a (reports start 2013)'}")
note('Trading/PSE', 'PSE market by year 2002-2026', ['pse', 'psei'], '**PSE market by year (PSEi year-end close)**\n' + '\n'.join(yl) +
     '\n\n**Notes**\n- PSEi 2002–2020 from the PSE archive; 2021–2025 year-end closes from PSE/news reports; 2026 = 6 Nov close (Yahoo Finance)\n- All-time PSEi high in this data: ' +
     f"{f2(psei.max())} ({psei.idxmax().date()})" + '\n\n**Sources**\n- PSE archive PSEI series · https://www.pse.com.ph/yearone/2024 (2023 6,450.04; 2024 6,528.79) · https://insiderph.com/pse-closes-most-challenging-year-since-pandemic-as-index-slides-73 (2025 6,052.92, −7.29%)')
# dividend leaders & directory
ranked = sorted([(r['ttm_y'], k) for k, r in stock_rows.items() if r['listed'] and r['ttm_y'] > 0], reverse=True)
dl = [f"- {k} {stock_rows[k]['name']}: {y*100:.1f}% (price ₱{f2(stock_rows[k]['last'])}, traded ₱{money(stock_rows[k]['val'])}/day)" for y, k in ranked]
note('Trading/PSE', 'PSE dividend yields now (all paying stocks)', ['pse', 'dividend'], f'**Dividend yield, last 12 months (as of {TODAY})**\n- Yield = cash dividends with ex-date in the last 365 days ÷ last close\n- Max buys only: price ≥ ₱1, ≥ ₱5M traded a day, yield ≥ 3%\n\n' + '\n'.join(dl) + '\n\n**Sources**\n' + SRC_PSE)
yt = collections.defaultdict(lambda: [0, 0.0])
for k, ev in DIV.items():
    for x in ev: yt[x[0][:4]][0] += 1
dyl = [f"- {y}: {n} cash dividend payments on record" for y, (n, _) in sorted(yt.items())]
note('Trading/PSE', 'PSE dividend history summary', ['pse', 'dividend'], '**PSE cash dividends on record**\n- Every payment (ex-date, peso per share) is in each stock\'s note under PSE stocks\n- 2013 → Sep 2025: PSE Quarterly Dividend Reports; Oct 2025 → 2026: PSE Edge dividends list (both in real pesos per share as declared)\n- Before 2013: PSE reports are not online, so dividend tests start in 2014\n\n' + '\n'.join(dyl) +
     f"\n- Total: {sum(len(v) for v in DIV.values()):,} payments, {len(DIV)} stocks\n\n**Sources**\n" + SRC_PSE)

# =====================================================================================  CRYPTO
D = f'{S}/data'
cmc = {}
for fn in glob.glob(f'{D}/data/csv/*.csv'):
    s = os.path.basename(fn)[:-4]; h = open(fn).readline()
    if 'PriceUSD' not in h: continue
    usec = ['time', 'PriceUSD'] + (['CapMrktCurUSD'] if 'CapMrktCurUSD' in h else [])
    df = pd.read_csv(fn, usecols=usec, parse_dates=['time']).dropna(subset=['PriceUSD'])
    if len(df) < 60: continue
    df = df.set_index('time'); df.index = df.index.tz_localize(None); cmc[s] = df
binance = {}
for fn in glob.glob(f'{S}/dl/bin/*USDT.json'):
    d = J(fn)
    if not d: continue
    df = pd.DataFrame(d, columns=['t', 'o', 'h', 'l', 'c', 'qv']); df.index = pd.to_datetime(df.t, unit='ms'); binance[os.path.basename(fn)[:-9]] = df
capM = pd.DataFrame({k: v['CapMrktCurUSD'] for k, v in cmc.items() if 'CapMrktCurUSD' in v}).sort_index()
def crypto_note(sym):
    src = []; s = None
    if sym.lower() in cmc: s = cmc[sym.lower()].PriceUSD; src.append('Coin Metrics community data (daily, to ' + str(s.index[-1].date()) + ')')
    b = binance.get(sym.upper())
    if b is not None:
        bs = b.c
        s = bs if s is None else pd.concat([s[s.index < bs.index.min()], bs]).sort_index()
        src.append(f'Binance {sym.upper()}USDT daily ({b.index[0].date()} → {b.index[-1].date()})')
    s = s[~s.index.duplicated()].dropna(); s = s[s > 0]
    if len(s) < 60: return None
    lines = []
    for y in sorted(set(s.index.year)):
        sy = s[s.index.year == y]; prev = s[s.index.year == y - 1]; ch = sy.iloc[-1] / prev.iloc[-1] - 1 if len(prev) else None
        cap = ''
        if sym.lower() in capM:
            cy = capM[sym.lower()][capM.index.year == y].dropna()
            if len(cy):
                rk = capM.loc[cy.index[-1]].rank(ascending=False).get(sym.lower()); cap = f" · cap ${money(cy.iloc[-1])} (#{int(rk)})"
        vol = ''
        if b is not None:
            by = b[b.index.year == y]
            if len(by): vol = f" · Binance ${money(by.qv.mean())}/d"
        lines.append(f"- {y}: ${f2(sy.iloc[-1])} {pc(ch) if ch is not None else 'start'} · H {f2(sy.max())} L {f2(sy.min())}{cap}{vol}")
    last = s.iloc[-1]; hi = s.max()
    live = b is not None and b.index[-1] >= pd.Timestamp('2026-11-01')
    head = [f"**{sym.upper()}**", f"- Data: {s.index[0].date()} → {s.index[-1].date()} ({len(s):,} days)",
            f"- Last ${f2(last)} ({s.index[-1].date()}) · all-time high ${f2(hi)} ({s.idxmax().date()}) · now {pc(last/hi-1)} from high · lowest ${f2(s.min())} ({s.idxmin().date()})",
            f"- Binance: {'trading now' if live else ('stopped trading on Binance (delisted) after ' + str(b.index[-1].date()) if b is not None else 'not on Binance USDT')}"]
    return '\n'.join(head) + '\n\n**Year by year** (USD: year-end close, change, H high, L low, cap = year-end market cap and rank among coins in data, Binance = average traded value per day)\n' + '\n'.join(lines) + '\n\n**Sources**\n' + '\n'.join('- ' + x for x in src)
# coins with own notes: all Coin Metrics coins with market cap + Binance coins ever in top-60 by volume
vol30 = pd.DataFrame({k: v.qv for k, v in binance.items()}).sort_index().rolling(30, min_periods=10).mean()
top_ever = set(vol30.columns[(vol30.rank(axis=1, ascending=False) <= 20).any()])
coins = sorted(set(k.upper() for k in capM.columns) | top_ever)
STB = {'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FDUSD', 'PAX', 'EUR', 'GBP', 'AUD', 'USDE', 'USD1', 'BFUSD', 'XUSD', 'AEUR', 'EURI', 'WBTC', 'PAXG'}
nc = 0
for c in coins:
    if c in STB: continue
    b = crypto_note(c)
    if b: note('Trading/Crypto/Crypto coins', c, ['crypto', c.lower()], b); nc += 1
# Binance full list
bl = []
for k in sorted(binance):
    b = binance[k]
    if len(b) < 2 or k in STB: continue
    hi = b.h.max(); live = b.index[-1] >= pd.Timestamp('2026-11-01')
    bl.append(f"- {k}: {b.index[0].date()} → {b.index[-1].date()}{'' if live else ' (STOPPED/delisted)'} · last ${f2(b.c.iloc[-1])} · peak ${f2(hi)} ({b.h.idxmax().date()}) · {pc(b.c.iloc[-1]/hi-1)} from peak · avg volume ${money(b.qv.tail(30).mean())}/day")
half = len(bl) // 2
note('Trading/Crypto', 'Binance coins list A-L', ['crypto', 'binance'], f'**All Binance USDT coins (A–{bl[half].split(":")[0][2:]}), daily data {TODAY}**\n' + '\n'.join(bl[:half]) + '\n\n**Sources**\n- Binance market data API (data-api.binance.vision), all USDT pairs incl. delisted')
note('Trading/Crypto', 'Binance coins list M-Z', ['crypto', 'binance'], f'**All Binance USDT coins (rest), daily data {TODAY}**\n' + '\n'.join(bl[half:]) + '\n\n**Sources**\n- Binance market data API (data-api.binance.vision), all USDT pairs incl. delisted')
# Bitcoin monthly
btc = cmc['btc'].PriceUSD
bs_ = pd.read_csv(f'{D}/btc-price-history/data/btc-usd-daily.csv', parse_dates=['date']).set_index('date').close
btcf = pd.concat([btc[btc.index < bs_.index.min()], bs_]).sort_index(); btcf = btcf[~btcf.index.duplicated()]
bm = btcf.resample('ME').last(); ml = []
for y in sorted(set(bm.index.year)):
    my = bm[bm.index.year == y]
    ml.append(f"- {y}: " + ' · '.join(f"{d.strftime('%b')} ${f2(v)}" for d, v in my.items()))
halv = ['2012-11-28', '2016-07-09', '2020-05-11', '2024-04-20']
note('Trading/Crypto', 'Bitcoin monthly closes 2010-2026', ['crypto', 'btc'], '**Bitcoin month-end closes (USD)**\n' + '\n'.join(ml) +
     '\n\n**Halvings (new BTC per block cut in half)**\n' + '\n'.join(f"- {h}: price ${f2(float(btcf[:h].iloc[-1]))} → 1 year later ${f2(float(btcf[:str(pd.Timestamp(h)+pd.Timedelta(days=365))[:10]].iloc[-1]))}" for h in halv) +
     '\n\n**Sources**\n- Coin Metrics community data (Jul 2010 → Aug 2011) + Bitstamp daily closes (Aug 2011 → Nov 2026)')

# =====================================================================================  FOREX
import universe as U
F = U.fx_all()
MAP = {'EUR': ('Euro', 'EA20'), 'JPY': ('Japan', 'JPN'), 'GBP': ('United Kingdom', 'GBR'), 'CHF': ('Switzerland', 'CHE'), 'CAD': ('Canada', 'CAN'), 'AUD': ('Australia', 'AUS'),
       'NZD': ('New Zealand', 'NZL'), 'MXN': ('Mexico', 'MEX'), 'ZAR': ('South Africa', 'ZAF'), 'BRL': ('Brazil', None)}
ir = pd.read_csv(f'{S}/fx20/ir/rates_monthly.csv', index_col=0); ir.index = pd.to_datetime(ir.index)
cotL = J(f'{S}/fx20/cot_legacy.json'); cotT = J(f'{S}/fx20/cot_tff.json')
def cotser(rows, lk, sk):
    if not rows: return pd.Series(dtype=float)
    df = pd.DataFrame(rows); df['d'] = pd.to_datetime(df.report_date_as_yyyy_mm_dd); df = df.drop_duplicates('d').set_index('d').sort_index()
    return (df[lk].astype(float) - df[sk].astype(float)) / df.open_interest_all.astype(float)
for c, (nm, o) in MAP.items():
    s = F[nm].dropna(); quote_inv = c in ('EUR', 'GBP', 'AUD', 'NZD')   # market convention
    q = s if quote_inv else 1 / s; label = f'{c}/USD' if quote_inv else f'USD/{c}'
    spec = cotser(cotL.get(c), 'noncomm_positions_long_all', 'noncomm_positions_short_all'); hf = cotser(cotT.get(c), 'lev_money_positions_long', 'lev_money_positions_short')
    lines = []
    for y in sorted(set(q.index.year)):
        qy = q[q.index.year == y]; sy = s[s.index.year == y]; sp = s[s.index.year == y - 1]
        chg = sy.iloc[-1] / sp.iloc[-1] - 1 if len(sp) else None   # value of the currency vs USD
        rate = ir[o][ir.index.year == y].mean() if o and o in ir else None; usd = ir['USA'][ir.index.year == y].mean()
        carry = (chg + (rate - usd) / 100) if (chg is not None and rate is not None and not math.isnan(rate)) else None
        sy_ = spec[spec.index.year == y]; hy = hf[hf.index.year == y]
        lines.append(f"- {y}: {label} close {f2(qy.iloc[-1], 4)} · {c} vs USD {pc(chg) if chg is not None else '–'}" +
                     (f" · {c} 3-month rate {rate:.2f}% vs USD {usd:.2f}% · total return holding {c} {pc(carry)}" if rate is not None and not math.isnan(rate) else '') +
                     (f" · speculators net {sy_.mean()*100:+.0f}% of open interest" if len(sy_) else '') + (f" · hedge funds net {hy.mean()*100:+.0f}%" if len(hy) else ''))
    note('Trading/Forex/Currencies', f'{c} vs USD 2000-2026', ['forex', c.lower()], f'**{c} — {nm}**\n- Data: {s.index[0].date()} → {s.index[-1].date()} daily\n- "Total return holding" = price change + interest gap vs USD (the forex version of a dividend)\n- Net positions: (long − short) ÷ all open contracts, yearly average, CFTC\n\n**Year by year**\n' + '\n'.join(lines) +
         '\n\n**Sources**\n- Exchange rates: Federal Reserve H.10 via FRED (daily)\n- 3-month interest rates: OECD (IR3TIB)\n- Positions: CFTC Commitments of Traders (legacy 1998+, Traders in Financial Futures 2006+)')
php = pd.Series(dtype=float)
try:
    import urllib.request
    r = json.load(urllib.request.urlopen(urllib.request.Request('https://query1.finance.yahoo.com/v8/finance/chart/PHP=X?range=max&interval=1mo', headers={'User-Agent': 'Mozilla/5.0'}), timeout=60))['chart']['result'][0]
    php = pd.Series(r['indicators']['quote'][0]['close'], index=pd.to_datetime(r['timestamp'], unit='s')).dropna()
except Exception as e: print('php', e)
if len(php):
    pl = [f"- {y}: USD/PHP year-end {f2(php[php.index.year==y].iloc[-1],3)} · high {f2(php[php.index.year==y].max(),3)} · low {f2(php[php.index.year==y].min(),3)}" for y in sorted(set(php.index.year))]
    note('Trading/Forex/Currencies', 'PHP peso vs USD 2003-2026', ['forex', 'php'], '**Philippine peso (USD/PHP, monthly closes)**\n- Higher number = weaker peso\n- Record low ₱62.565 per USD on 2 Sep 2026 (Radar PH)\n\n' + '\n'.join(pl) + '\n\n**Sources**\n- Yahoo Finance PHP=X monthly\n- https://radar.ph/peso-hits-record-low-for-fourth-straight-session-as-psei-falls-september-2-2026/')
g = J(f'{S}/fx20/gold.json'); gold = pd.Series(g['c'], index=pd.to_datetime(g['t'], unit='s')).dropna()
gs = cotser(cotL.get('GOLD'), 'noncomm_positions_long_all', 'noncomm_positions_short_all')
gl = []
for y in sorted(set(gold.index.year)):
    gy = gold[gold.index.year == y]; gp = gold[gold.index.year == y - 1]
    gl.append(f"- {y}: close ${f2(gy.iloc[-1])}/oz ({pc(gy.iloc[-1]/gp.iloc[-1]-1) if len(gp) else 'first year'}) · high ${f2(gy.max())} · low ${f2(gy.min())}" + (f" · speculators net {gs[gs.index.year==y].mean()*100:+.0f}%" if len(gs[gs.index.year == y]) else ''))
note('Trading/Forex', 'Gold 2000-2026', ['gold'], f'**Gold (COMEX futures, USD per ounce)**\n- All-time high in data ${f2(gold.max())} ({gold.idxmax().date()}) · last ${f2(gold.iloc[-1])} ({gold.index[-1].date()})\n\n' + '\n'.join(gl) + '\n\n**Sources**\n- Yahoo Finance GC=F daily · CFTC legacy COT (gold)')

# =====================================================================================  STRATEGY NOTES (best → worst)
def tbl(rows, cols):
    return '| ' + ' | '.join(cols) + ' |\n|' + '---|' * len(cols) + '\n' + '\n'.join('| ' + ' | '.join(str(x) for x in r) + ' |' for r in rows)
pl1 = J(f'{RES}/2026-11-09-pse-long-results.json'); pl2 = J(f'{RES}/2026-11-09-pse-long-results-2.json'); pf = J(f'{RES}/2026-11-08-pse-full-results.json')
allp = {**{k: v for k, v in pl1.items() if not k.startswith('_')}, **{k: v for k, v in pl2.items() if not k.startswith('_')}}
rows = sorted([(k, v['per_year_%'], v['worst_drop_%'], v['sharpe'], v.get('2014-2019_%/yr'), v.get('2020-2026_%/yr'), v.get('buys')) for k, v in allp.items()], key=lambda r: -(r[1] / max(5, abs(r[2]))))
prow = [(i + 1, re.sub(r'^[A-Z]\d?\s+|^[A-Z]{1,2}\s+', '', k), f'{a}%', f'{b}%', c, f'{d}%' if d is not None else '–', f'{e}%' if e is not None else '–', f or '–') for i, (k, a, b, c, d, e, f) in enumerate(rows)]
short = [(k, v['2021-Nov 2026 (unseen)']['cagr'], v['2021-Nov 2026 (unseen)']['maxdd']) for k, v in pf.items() if not k.startswith('_') and v.get('2021-Nov 2026 (unseen)')]
by_year = allp['DJ buffer top-40 + trailing stop 25%']['by_year']
note('Trading/PSE', 'PSE strategies best to worst', ['pse', 'strategy'], f'''**PSE strategies tested (ranked best → worst by return per unit of worst drop)**
- Data: 372 PSE stocks incl. delisted; prices 2002 → 6 Nov 2026; dividends 2013 → 2026
- Rules: decide at a close, trade at the next close; COL fees + slippage 0.545% per side; 10% dividend tax; bad prints (moves beyond the ±50% daily limit) removed
- Dividend strategies 2014 → Nov 2026; momentum/benchmark rows marked 2003–2026 cover 24 years

{tbl(prow, ['#', 'Strategy', '%/yr', 'Worst drop', 'Sharpe', '2014-19 %/yr', '2020-26 %/yr', 'Buys'])}

**Chosen (in Max's paper trading)**
- Dividend top-20, rebalance every 3 months, keep holdings while in top-40, sell if 25% below the highest close since buying
- 2014 → Nov 2026: {allp["DJ buffer top-40 + trailing stop 25%"]["per_year_%"]}%/yr, worst drop {allp["DJ buffer top-40 + trailing stop 25%"]["worst_drop_%"]}%
- By year: ''' + ' · '.join(f'{y} {v:+.1f}%' for y, v in by_year.items()) + f'''

**Earlier short test (2021 → Nov 2026, unseen years)**
''' + '\n'.join(f'- {k}: {a}%/yr, worst drop {b}%' for k, a, b in sorted(short, key=lambda r: -r[1])) + '''

**Day trading PSE (6 weeks of 30-minute data)**
- Loses to costs (~0.9% round trip incl. spread); not used

**Why not other things**
- Dividend capture (buy before ex-date, sell after): −27% to −48% (2021–2026); price drops by about the dividend and fees + tax eat the rest
- Market filter on dividend stocks: lowers returns (3.9% vs 9.0%/yr 2021–2026)
- Tighter stops (20%, 200-day average) and "trap"/consistency filters: worse

**Sources**
- Results files: trader/research/2026-11-09-pse-long-results*.json, 2026-11-08-pse-full-results.json
''' + SRC_PSE)
cl = J(f'{RES}/2026-11-09-crypto-long-results.json'); cc = J(f'{RES}/2026-11-09-crypto-combos.json'); cb = J(f'{RES}/2026-11-08-crypto-binance-results.json'); qf = J(f'{RES}/2026-11-09-quality-filter-test.json')
crow = []
for g_, d_ in cl.items():
    for k, v in d_.items():
        if 'per_year_%' not in v: continue
        p_ = v['per_period_%/yr']; crow.append((('Bitcoin only: ' if g_ == 'BTC' else 'Top-20 coins: ') + k, v['from'], v['per_year_%'], v['worst_drop_%'], p_.get('2011-2016'), p_.get('2017-2021'), p_.get('2022-Nov 2026')))
for k, v in cc.items(): crow.append(('Mix: ' + k, '2013', v['cagr'], v['dd'], v['periods'][0][1], v['periods'][1][1], v['periods'][2][1]))
crow.sort(key=lambda r: -((r[6] or -99) / max(10, abs(r[3]))))
crow_t = [(i + 1, r[0], r[1], f'{r[2]}%', f'{r[3]}%', f'{r[4]}%' if r[4] is not None else '–', f'{r[5]}%' if r[5] is not None else '–', f'{r[6]}%' if r[6] is not None else '–') for i, r in enumerate(crow)]
qrow = [(k, v['2022-Nov 2026']['cagr'], v['2022-Nov 2026']['maxdd'], v['trades_2022+'], v['win_%']) for k, v in qf.items()]
note('Trading/Crypto', 'Crypto strategies best to worst', ['crypto', 'strategy'], f'''**Crypto strategies tested (ranked best → worst by 2022–2026 return per unit of worst drop)**
- Bitcoin Jul 2010 → Nov 2026 (16 years — Bitcoin did not exist before 2009); top-20 coins by market cap 2013 → 2026 incl. dead coins
- Trade at next close; fee + slippage 0.30% per side before 2017, 0.15% after
- Early years show huge numbers (Bitcoin $0.30 → $126,000); the 2022–2026 column matters most

{tbl(crow_t, ['#', 'Strategy', 'From', '%/yr all', 'Worst drop', '2011/13-16', '2017-21', '2022-26'])}

**Quality filter test on ALL Binance coins (2022 → Nov 2026)**
''' + '\n'.join(f'- {k}: {a}%/yr, worst drop {b}%, {n} trades, {w}% wins' for k, a, b, n, w in qrow) + '''

**Chosen (in Max's paper trading)**
- 70% swing: buy a top-20 coin closing above its 20-day high, only when Bitcoin is above its 50-day average; stop 2×ATR, trailing; risk 0.5% per trade; max 8 coins
- 30% Bitcoin trend: hold Bitcoin only above its 100-day average, sized to 40% yearly volatility
- Day trading crypto: BTC 2-hour opening-range breakout loses with spot fees (−38% 2024–2026); works only at ≤0.10% round trip

**Sources**
- Results files: trader/research/2026-11-09-crypto-long-results.json, crypto-combos.json, quality-filter-test.json, 2026-11-08-crypto-binance-results.json
- Coin Metrics community data · Bitstamp · Binance market data API''')
fl = J(f'{RES}/2026-11-09-fx-copy-long-results.json')
frow = sorted([(k, v['per_year_%'], v['worst_drop_%'], v['periods_%/yr']) for k, v in fl['FX'].items()], key=lambda r: -r[1])
note('Trading/Forex', 'Forex strategies best to worst', ['forex', 'strategy'], '''**Forex strategies tested 2000 → Oct 2026 (26 years), ranked by return**
- 10 currencies vs USD (EUR, JPY, GBP, CHF, CAD, AUD, NZD, MXN, ZAR, BRL); returns include the interest gap (carry); no leverage; 0.03% per trade

''' + tbl([(i + 1, k, f'{a}%', f'{b}%', *[f'{x}%' for x in p.values()]) for i, (k, a, b, p) in enumerate(frow)], ['#', 'Strategy', '%/yr', 'Worst drop', '2000-08', '2009-16', '2017-26']) + '''

**Gold (2000 → Nov 2026)**
- Hold gold: 10.5%/yr, worst drop −44% · hold only above 200-day average: 6.9%/yr, −39.5% · above 200-day sized to 12% volatility: 6.3%/yr, −34% (CHOSEN, 30% of MAX-MASTER-3)

**Verdict**
- No forex strategy kept an edge over 26 years (all between −1.9% and +0.8% a year; results flip sign between periods)
- Forex only becomes "profitable" with leverage, which multiplies the same weak edge and the losses
- Forex kept as a watch-only paper book

**Day trading forex (2024–2026 hourly)**
- London breakout and Asian-session mean reversion ≈ break-even after costs

**Sources**
- FRED H.10 exchange rates · OECD 3-month rates · CFTC COT · results file trader/research/2026-11-09-fx-copy-long-results.json''')
hl = J(f'{RES}/2026-11-08-copytrading-hl-results.json')
hrow = [(k, v['per_year_%'], v['max_drop_%'], v['win_months_%'], v['months']) for k, v in hl.items() if not k.startswith('_') and v]
hrow.sort(key=lambda r: -r[1])
crow2 = sorted([(k, v['per_year_%'], v['worst_drop_%'], v['periods_%/yr']) for k, v in fl['COPY'].items()], key=lambda r: -r[1])
grow2 = sorted([(k, v['per_year_%'], v['worst_drop_%'], v['periods_%/yr']) for k, v in fl['GOLD'].items()], key=lambda r: -r[1])
note('Trading/Copy trading', 'Copy trading strategies best to worst', ['copy-trading', 'strategy'], f'''**Copy trading — what was tested**
- Real copy-trading records exist only on Hyperliquid (on-chain, 2023 → 2026); eToro/ZuluTrade/Bybit/Binance do not publish full trader histories
- For 20+ years: "copy the big traders" through CFTC weekly positions (1998 → 2026)

**1) Hyperliquid traders (the exchange Invo copies), Mar 2023 → Oct 2026**
- {hl["_note"]["accounts"]} accounts (1,500 most active), {hl["_note"]["trader_months"]:,} trader-months; blown-up accounts included
- Median trader month {hl["_median_trader_month_%"]}% · positive months {hl["_share_of_traders_positive_month_%"]}% · copy delay cost 0.5%/month
''' + tbl([(i + 1, k, f'{a}%', f'{b}%', f'{c}%', d) for i, (k, a, b, c, d) in enumerate(hrow)], ['#', 'Copy rule', '%/yr', 'Worst drop', 'Green months', 'Months']) + '''
- Warning: sample = today's most active accounts (survivor bias); steady accounts may be market makers that cannot be copied

**2) Copy / fade big traders via CFTC (2000 → Oct 2026)**
''' + tbl([(i + 1, k, f'{a}%', f'{b}%', *[f'{x}%' for x in p.values()]) for i, (k, a, b, p) in enumerate(crow2)], ['#', 'Rule (10 currencies)', '%/yr', 'Worst drop', '2000-08', '2009-16', '2017-26']) + '''

''' + tbl([(i + 1, k, f'{a}%', f'{b}%', *[f'{x}%' for x in p.values()]) for i, (k, a, b, p) in enumerate(grow2)], ['#', 'Rule (gold)', '%/yr', 'Worst drop', '2000-08', '2009-16', '2017-26']) + '''

**Verdict**
- No copy rule kept an edge for 20+ years; copying the "hottest" traders lost 45–97%
- Only "steady" Hyperliquid traders were positive, with too short a record → watch-only paper books (copy steady, copy hot)

**Sources**
- api.hyperliquid.xyz portfolio data; stats-data.hyperliquid.xyz leaderboard · CFTC COT · results files 2026-11-08-copytrading-hl-results.json, 2026-11-09-fx-copy-long-results.json''')

# =====================================================================================  overview, platforms, events
fees = open(f'{RES}/fees-2026-11.md').read().split('---', 2)[-1]
note('Trading', 'Trading fees 2026', ['fees'], fees)
note('Trading/Copy trading', 'Copy trading platforms', ['copy-trading', 'platforms'], '''**Copy trading platforms (facts with sources)**
- **Tradency "Mirror Trader"** (about 2005): early automatic system to copy a strategy's trades
- **ZuluTrade** (founded 2007; beta 2008; EU portfolio-management licence 2015; US 2020; bought by Finvasia Dec 2021; dropped profit-share fees 2022)
- **eToro CopyTrader** (trademark 2012): copy "Popular Investors"; users in 140+ countries
- **FxPro SuperTrader**: closed 2017; many brokers closed copy services after regulators cleaned up scams
- **MetaQuotes MQL5 Signals**: copy MetaTrader signal providers for a monthly fee
- **Crypto exchanges** (Binance, Bybit, Bitget, OKX and others): copy futures traders; profit share to the lead trader; leverage common
- **Invo** (runs on Hyperliquid perpetuals): taker 0.0768%, maker rebate 0.048%; copied traders get 15% of the fees their copiers generate — paid for activity, not for winning
- **Hyperliquid** itself: every trade is public on-chain → the only place with full, checkable trader records (2023 →)

**Rules and research**
- 2014: UK FCA said copy-trading firms act as portfolio/investment managers (must be authorised); ESMA MiFID Q&A treats copying as automatic execution of signals
- Research: copied trades lose more when they lose (Pelster & Hofmann 2018); showing others' success raises risk-taking
- KuCoin research: about 400,000 wallets on Invo and 5 similar apps lost about $280M; for BTC trades, fees exceeded users' gains

**Max's rule**
- Copy only traders with long, steady records and low turnover; paper first; never leverage

**Sources**
- https://en.wikipedia.org/wiki/Copy_trading · https://en.wikipedia.org/wiki/ZuluTrade
- https://www.invoapp.com/guides/fees · https://www.kucoin.com/blog/hyperliquid-retail-traders-280-million-losses''')
# events with measured moves
pse_eq = (P.pct_change(fill_method=None).clip(-0.5, 0.5).mean(axis=1).fillna(0) + 1).cumprod()
def move(series, d, days):
    s = series.dropna(); i = s.index.searchsorted(pd.Timestamp(d))
    if i >= len(s) or i == 0: return None
    j = min(len(s) - 1, s.index.searchsorted(pd.Timestamp(d) + pd.Timedelta(days=days)))
    return s.iloc[j] / s.iloc[i - 1] - 1
psei_all = pd.concat([psei, pse_eq[pse_eq.index > psei.index[-1]] / pse_eq[:psei.index[-1]].iloc[-1] * psei.iloc[-1]])
EVENTS = [
 ('2003-03-20', 'Global', 'US-led invasion of Iraq begins'), ('2004-05-10', 'PH', 'Philippine presidential election (Arroyo re-elected)'),
 ('2005-07-08', 'PH', '"Hello Garci" political crisis; 10 cabinet members resign'), ('2006-02-24', 'PH', 'State of emergency declared (Proclamation 1017)'),
 ('2007-02-27', 'Global', 'China stock crash spreads worldwide'), ('2007-08-09', 'Global', 'BNP Paribas freezes funds — start of the subprime crisis'),
 ('2008-09-15', 'Global', 'Lehman Brothers collapses — global financial crisis'), ('2009-01-03', 'Crypto', 'Bitcoin genesis block mined'),
 ('2010-05-06', 'Global', 'US "flash crash"; Greek debt crisis'), ('2010-05-10', 'PH', 'Philippine election (Aquino III)'),
 ('2011-03-11', 'Global', 'Japan earthquake and tsunami (Fukushima)'), ('2011-08-05', 'Global', 'S&P downgrades US credit rating'),
 ('2013-03-27', 'PH', 'Philippines gets first investment-grade rating (Fitch)'), ('2013-05-22', 'Global', 'Fed "taper tantrum" — emerging markets sell off'),
 ('2013-11-08', 'PH', 'Typhoon Haiyan (Yolanda)'), ('2014-02-24', 'Crypto', 'Mt. Gox collapses'),
 ('2015-01-15', 'Global', 'Swiss central bank removes the franc cap (CHF +30% in minutes)'), ('2015-08-11', 'Global', 'China devalues the yuan; global sell-off'),
 ('2016-05-09', 'PH', 'Philippine election (Duterte)'), ('2016-06-23', 'Global', 'UK votes for Brexit'), ('2016-11-08', 'Global', 'US election (Trump)'),
 ('2017-05-23', 'PH', 'Marawi siege; martial law in Mindanao'), ('2017-12-17', 'Crypto', 'Bitcoin peaks near $20,000; CME futures launch'),
 ('2018-01-01', 'PH', 'TRAIN tax law takes effect; PSEi record high late Jan 2018'), ('2018-02-05', 'Global', 'US volatility shock ("Volmageddon")'),
 ('2018-09-07', 'PH', 'Inflation reaches 6.4–6.7%; BSP hikes rates through 2018'), ('2018-03-22', 'Global', 'US–China trade war tariffs begin'),
 ('2020-01-12', 'PH', 'Taal Volcano eruption'), ('2020-03-12', 'Crypto', 'COVID "Black Thursday" — Bitcoin −39% in a day'),
 ('2020-03-16', 'PH', 'Luzon COVID lockdown; PSE closes 17–18 Mar 2020'), ('2020-05-11', 'Crypto', 'Third Bitcoin halving'),
 ('2020-08-13', 'PH', 'AREIT lists — first Philippine REIT'), ('2021-03-26', 'PH', 'CREATE law cuts corporate income tax'),
 ('2021-05-19', 'Crypto', 'Crypto crash (China mining ban, Tesla stops BTC payments)'), ('2021-11-10', 'Crypto', 'Bitcoin record ~$69,000'),
 ('2022-02-24', 'Global', 'Russia invades Ukraine; oil and inflation spike'), ('2022-03-16', 'Global', 'Fed starts fastest rate hikes since 1980s'),
 ('2022-05-09', 'PH', 'Philippine election (Marcos Jr.)'), ('2022-05-09', 'Crypto', 'TerraUSD/LUNA collapse'),
 ('2022-09-15', 'Crypto', 'Ethereum "Merge" to proof-of-stake'), ('2022-10-03', 'PH', 'Peso hits ₱59 per USD; BSP rate hikes to 6.5% by 2023'),
 ('2022-11-08', 'Crypto', 'FTX exchange collapses'), ('2023-03-10', 'Global', 'Silicon Valley Bank fails'),
 ('2024-01-10', 'Crypto', 'US approves spot Bitcoin ETFs'), ('2024-04-20', 'Crypto', 'Fourth Bitcoin halving'),
 ('2024-08-15', 'PH', 'BSP starts cutting rates'), ('2024-11-05', 'Global', 'US election (Trump returns)'),
 ('2025-04-02', 'Global', 'US "Liberation Day" tariffs; global sell-off'), ('2025-07-01', 'PH', 'Stock transaction tax cut from 0.6% to 0.1% (CMEPA)'),
 ('2025-09-01', 'PH', 'Flood-control corruption scandal hits markets; PSEi 2025 worst year since 2013 (−7.3%)'),
 ('2025-10-06', 'Crypto', 'Bitcoin all-time high ~$126,000'), ('2025-10-10', 'Crypto', 'US 100% China tariff threat; >$19B crypto liquidations in a day'),
 ('2026-02-06', 'Crypto', 'Bitcoin falls ~52% from peak, near $60,000'), ('2026-02-28', 'Global', 'US and Israeli strikes on Iran'),
 ('2026-04-07', 'Global', 'US–Iran two-week ceasefire'), ('2026-09-02', 'PH', 'Peso record low ₱62.565 per USD'),
 ('2026-10-01', 'PH', 'PSEi 2026 low 5,679.48')]
el = []
for d, where, what in sorted(EVENTS):
    m = [('PSEi', move(psei_all, d, 30)), ('Bitcoin', move(btcf, d, 30)), ('gold', move(gold, d, 30))]
    el.append(f"- {d} [{where}] {what} → next 30 days: " + ' · '.join(f'{n} {pc(x)}' for n, x in m if x is not None))
note('Trading', 'Market events 2003-2026 (PH and global)', ['events'], '''**Notable events that moved markets**
- Each line: date, where, what happened, and the measured move over the next 30 days from Max's data (PSEi; after Mar 2021 an equal-weight PSE index scaled to the PSEi)

''' + '\n'.join(el) + '''

**Sources**
- Dates: public record; 2025–2026: https://www.fticonsulting.com/insights/articles/crypto-crash-october-2025-leverage-met-liquidity · https://learn.backpack.exchange/articles/bitcoin-crash · https://radar.ph/peso-hits-record-low-for-fourth-straight-session-as-psei-falls-september-2-2026/ · https://www.manilatimes.net/2026/10/01/business/top-business/psei-falls-to-2026-low-as-investor-worries-rise/2436568 · https://insiderph.com/pse-closes-most-challenging-year-since-pandemic-as-index-slides-73
- Moves: PSE archive/PSE Edge, Bitstamp, Yahoo Finance GC=F''')
mm = J(f'{RES}/2026-11-09-new-master-candidates.json')
best = mm['A: 40 PSE / 30 crypto / 30 gold trend (vol-sized)']
note('Trading', '00 Trading overview MAX-MASTER-3', ['strategy', 'core'], f'''**Max trading — overview ({TODAY})**
- Paper trading only (pretend money). No real orders. Not financial advice.
- Everything here comes from downloaded data and tests; Max answers trading questions from these notes

**MAX-MASTER-3 (current plan)**
- 40% PSE dividend top-20 (3-month rebalance, keep while in top-40, 25% trailing stop)
- 21% crypto swing (top-20 coins, 20-day breakout, 2×ATR trailing stop, only when Bitcoin > 50-day average, 0.5% risk per trade)
- 9% Bitcoin trend (above 100-day average, volatility-sized)
- 30% gold trend (above 200-day average, sized to 12% volatility)
- Watch only: forex fade big traders, copy steady traders, copy hot traders, crypto momentum rotation
- Backtest 2014 → Oct 2026: {best["per_year_%"]}%/yr, worst drop {best["worst_drop_%"]}%, worst month {best["worst_month_%"]}%; 2014–19 {best["2014-2019"]}%/yr, 2020–26 {best["2020-2026"]}%/yr
- By year: ''' + ' · '.join(f'{y} {v:+.1f}%' for y, v in best['years'].items()) + '''

**Test rules (all tests)**
- Decide at a close → trade at the next close; real fees and slippage; settings chosen on older years, judged on later years
- Delisted stocks and dead coins kept (no survivor bias in PSE/crypto); bad prints removed

**Where to look**
- PSE: strategies, market by year, dividend yields now, dividend history, one note per stock (PSE stocks › sector)
- Crypto: strategies, Bitcoin monthly closes, Binance coin lists, one note per coin
- Forex: strategies, one note per currency (incl. peso), gold
- Copy trading: strategies, platforms
- Events 2003–2026 · Trading fees 2026
- Paper trading live: dashboard https://claude.ai/artifact/25fnUcKASedJmKSZBRbW9H (weekly email every Sunday)

**Data downloaded**
- PSE: 372 stocks, 2002 → 6 Nov 2026; ''' + f'{sum(len(v) for v in DIV.values()):,}' + ''' cash dividends 2013 → 2026
- Crypto: Bitcoin 2010 → 2026; ''' + f'{len(capM.columns)}' + ''' coins with market caps (Coin Metrics); ''' + f'{len(binance)}' + ''' Binance USDT pairs incl. delisted
- Forex: 10 currencies + peso 2000 → 2026; OECD rates; CFTC positions 1998 → 2026; gold 2000 → 2026
- Copy trading: 1,500 Hyperliquid traders' full histories; 48,237-row leaderboard''')

# =====================================================================================  write vault + zips
import shutil
shutil.rmtree(OUT, ignore_errors=True)
for p, t in NOTES.items():
    fp = f'{OUT}/{p}'; os.makedirs(os.path.dirname(fp), exist_ok=True); open(fp, 'w').write(t)
groups = {'1-Trading-overview-and-strategies': lambda p: '/PSE stocks/' not in p and '/Crypto coins/' not in p,
          '2-PSE-stocks-A-L': lambda p: '/PSE stocks/' in p and os.path.basename(p)[0].upper() <= 'L',
          '3-PSE-stocks-M-Z': lambda p: '/PSE stocks/' in p and os.path.basename(p)[0].upper() > 'L',
          '4-Crypto-coins': lambda p: '/Crypto coins/' in p}
sizes = {}
for g_, fn in groups.items():
    z = f'{S}/Max-Trading-{g_}.zip'; n = 0; b = 0
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for p, t in NOTES.items():
            if fn(p): zf.writestr('Max Trading/' + p, t); n += 1; b += len(t)
    sizes[g_] = (n, b)
print('notes', len(NOTES), 'stocks', sum('/PSE stocks/' in p for p in NOTES), 'coins', nc, sizes, 'total chars', sum(len(t) for t in NOTES.values()))
json.dump({k: v for k, v in stock_rows.items()}, open(f'{S}/notes_stock_rows.json', 'w'), default=float)
