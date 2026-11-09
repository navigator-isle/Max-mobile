# Max's trading notes, layout v2 (Mark, 9 Nov 2026):
#   Trading/                      Start here · My plan · Paper trading · Words used · Fees · Market events by year
#   Trading › PSE › Strategy      plan · ranking · one note per strategy family (every version, year by year)
#   Trading › PSE › Stocks        one note per stock (flat, sector inside) · PSEi by year · stocks by sector
#   Trading › PSE › Dividend      yields now · history · calendar · one note per paying stock (every payment)
#   Trading › Crypto › Strategy   plan · ranking · one note per strategy family
#   Trading › Crypto › Coins      one note per coin · Bitcoin monthly · all Binance coins
#   Trading › Forex › Strategy    plan · ranking · one note per strategy family (forex, gold)
#   Trading › Forex › Currency    one note per currency incl. peso and gold
#   Trading › Copy trading › Strategy   verdict · ranking · Hyperliquid copy tests · CFTC copy/fade tests
#   Trading › Copy trading › Platform   one note per platform
#   Trading › Copy trading › Traders    all traders table · one note per notable trader (every month)
# Every number comes from the data and result files (built by build_notes.py / organize_notes.py and the backtests).
import json, os, re, glob, sys, collections, datetime as dt, html, zipfile, hashlib
import numpy as np, pandas as pd
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
S = '/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'; RES = '/home/claude/max-mobile/trader/research'
OLD = f'{S}/MaxTrading/Trading'; OUT = f'{S}/MaxTrading3'
# the organized group-1 notes (plans, rankings, words…) — re-used, then moved into the new folders
G1 = {}
_src = open(f'{HERE}/organize_notes.py').read(); _src = _src[:_src.index('# write vault: new group 1')]
_ns = {'__file__': f'{HERE}/organize_notes.py'}; exec(compile(_src, 'organize_notes.py', 'exec'), _ns)
G1 = _ns['NOTES']; J = _ns['J']; pc = _ns['pc']; verdict = _ns['verdict']; table = _ns['table']
NOTES = {}   # (category, title) -> markdown
def note(cat, title, tags, body): NOTES[(cat, title)] = f'---\ntags: [{", ".join(dict.fromkeys(["trading"] + tags))}]\n---\n' + body.strip() + '\n'
def g1(path): t = G1[path]; return re.sub(r'^---\n.*?\n---\n', '', t, flags=re.S).strip(), re.match(r'^---\ntags: \[(.*?)\]', t).group(1).split(', ')[1:]
def move(path, cat, title=None, edit=None):
    b, tags = g1(path); b = edit(b) if edit else b; note(cat, title or path.split('/')[-1][:-3], tags, b)
def oldmd(p): return re.sub(r'^---\n.*?\n---\n', '', open(f'{OLD}/{p}').read(), flags=re.S).strip()
def yrs(d, sep=' · '): return sep.join(f'{y} {v:+.1f}%' for y, v in sorted(d.items()))
T = 'Trading'; P = 'Trading › PSE'; C = 'Trading › Crypto'; F = 'Trading › Forex'; K = 'Trading › Copy trading'

# ============================================================ Trading (top)
note(T, '1 Start here', ['core'], '''**Start here — Max's trading notes**
- Paper trading only (pretend money). Max never places real trades and gives no buy/sell advice.
- Every number comes from real downloaded prices and tested strategies, fees included.
- For the price on any exact day, ask Max ("price of LTC on 5 November 2025") — he looks it up from the source.

**How the notes are arranged**
- **Trading** — 1 Start here · 2 My plan · 3 Paper trading · 4 Words used · 5 Fees 2026 · 6 Market events by year
- **PSE › Strategy** — PSE plan · all strategies ranked · one note per strategy (every version, year by year)
- **PSE › Stocks** — one note per stock (every year since listing: close, change, high, low, value traded, dividends) · PSEi by year · stocks by sector
- **PSE › Dividend** — yields now · dividend calendar (which month each stock pays) · history · one note per paying stock (every payment since 2013)
- **Crypto › Strategy** — crypto plan · ranking · one note per strategy
- **Crypto › Coins** — one note per coin (every year: close, change, high, low, market cap, rank) · Bitcoin month by month · all Binance coins
- **Forex › Strategy** — forex and gold plan · ranking · one note per strategy
- **Forex › Currency** — one note per currency incl. the peso and gold (every year: close, change, interest rates, positions of big traders)
- **Copy trading › Strategy** — verdict · ranking · copy tests on real traders and on big-trader positions
- **Copy trading › Platform** — one note per platform
- **Copy trading › Traders** — every tested trader in one table (1,260 with 3+ months of record, from 1,500 checked) · one note per notable trader (every month)''')
move('Trading/2 My plan MAX-MASTER-3.md', T)
move('Trading/3 Paper trading.md', T)
move('Trading/4 Words used.md', T, edit=lambda b: b + '\n- **Ex-date** months — the calendar note lists the usual month(s) each stock goes ex-dividend\n- **Copy / fade** — do the same as / the opposite of a group of traders')
move('Trading/Reference/Fees 2026.md', T, '5 Fees 2026')
move('Trading/Reference/Market events by year 2003-2026.md', T, '6 Market events by year 2003-2026')

# ============================================================ PSE › Strategy
pl1 = J('2026-11-09-pse-long-results.json'); pl2 = J('2026-11-09-pse-long-results-2.json'); pf = J('2026-11-08-pse-full-results.json')
move('Trading/PSE/1 PSE plan.md', f'{P} › Strategy', edit=lambda b: b.replace('- Dividends are added on the ex-date after 10% tax', '- Big winners are never cut back to equal size: a stock that doubles keeps all its shares (see Letting big winners run)\n- Dividends are added on the ex-date after 10% tax'))
move('Trading/PSE/2 PSE strategies ranked.md', f'{P} › Strategy')
def variant(name, v, how=''):
    out = [f'**{name}**' + (f' — {how}' if how else '')]
    keys = [('per_year_%', 'per year', '%'), ('total_%', 'total', '%'), ('worst_drop_%', 'worst drop', '%'), ('sharpe', 'Sharpe', ''), ('turnover_yr', 'turnover a year', '×'), ('buys', 'buys', ''), ('stop_exits', 'stop sells', ''),
            ('2014-2019_%/yr', '2014–2019 a year', '%'), ('2020-2026_%/yr', '2020–2026 a year', '%'), ('trades', 'trades', ''), ('win_%', 'winning trades', '%'), ('avg_win_R', 'average win', 'R'), ('avg_loss_R', 'average loss', 'R'), ('from', 'from', '')]
    out.append('- ' + ' · '.join(f'{lab} {v[k]}{u}' for k, lab, u in keys if k in v and v[k] is not None))
    per = v.get('per_period_%/yr') or v.get('periods_%/yr')
    if per: out.append('- By period (per year): ' + ' · '.join(f'{k} {x:+.1f}%' for k, x in per.items()))
    if v.get('by_year'): out.append('- Year by year: ' + yrs(v['by_year']))
    return '\n'.join(out)
DIV_HOW = {'A': 'Basic: top-20 yields, re-check every 3 months, no stop', 'B': 'Basic, re-check every 6 months', 'C': 'Basic, re-check every 12 months', 'D': 'Keep a stock while it is still in the top 40 (no stop)',
           'E': 'Keep a stock while it is still in the top 60', 'F': 'Rank by regular dividends only (specials left out)', 'G': 'Skip "traps" (price down 30% in a year, or yield above 15%)', 'H': 'Only stocks that paid in each of the last 2 years',
           'I': 'Sell if 20% below the buy price', 'J': 'Sell if 25% below the highest close since buying (trailing stop)', 'K': 'Sell when below its 200-day average', 'L': 'All filters: regular dividends only + paid 2 years + skip traps + keep while in top 40',
           'M': 'All filters + 25% trailing stop', 'N': 'All filters, 10 stocks instead of 20', 'J2': 'Basic + 20% trailing stop', 'J3': 'Basic + 30% trailing stop', 'DJ': 'Keep while in top 40 + 25% trailing stop (CHOSEN)'}
def code(k): return k.split()[0]
dv = [(k, v) for k, v in {**pl1, **pl2}.items() if not k.startswith('_') and code(k) in DIV_HOW]
dv.sort(key=lambda kv: (code(kv[0]) != 'DJ', -float(kv[1]['per_year_%']) / max(10, abs(float(kv[1]['worst_drop_%'])))))
_seen = set(); dv = [kv for kv in dv if not ((k_ := (kv[1]['per_year_%'], kv[1]['total_%'], kv[1]['worst_drop_%'])) in _seen or _seen.add(k_))]   # same test run twice → once
note(f'{P} › Strategy', 'Dividend top-20 (all versions)', ['pse', 'strategy', 'dividend'], '''**Dividend top-20 — every version tested (2014 → Nov 2026)**
- Basic rule: all PSE stocks with price ≥ ₱1 and ≥ ₱5M traded a day; rank by cash dividends of the last 12 months ÷ price; buy the top 20 in equal pesos (whole board lots)
- Fees (COL, about 0.545% per side incl. sales tax) and 10% dividend tax included; trades at the next day's close; delisted stocks included
- Benchmark (hold all liquid stocks, dividends included): ''' + f"{pl1['Benchmark: hold all liquid stocks (dividends included)']['per_year_%']}% a year, worst drop {pl1['Benchmark: hold all liquid stocks (dividends included)']['worst_drop_%']}%" + '''
- Why the chosen version: same profit as the best, but the smallest drop (−23.7% vs −41.6% without a stop) and it keeps stocks long enough to collect their dividends

''' + '\n\n'.join(variant(f'{i}. ' + DIV_HOW[code(k)][0].upper() + DIV_HOW[code(k)][1:], v) for i, (k, v) in enumerate(dv, 1)) + '''

**Benchmark**
''' + variant('Hold all liquid stocks (dividends included)', pl1['Benchmark: hold all liquid stocks (dividends included)']))
MOM_HOW = {'P1': 'every month buy the 10 stocks with the best 6-month return', 'P2': 'P1, only when the PSEi is above its 200-day average (else cash)', 'P3': 'hold all liquid stocks (benchmark)',
           'P4': 'P2 + 20% trailing stop', 'P5': 'P2 + 15% trailing stop'}
mv = [(k, v) for k, v in {**pl1, **pl2}.items() if code(k) in MOM_HOW]
note(f'{P} › Strategy', 'Momentum (all versions)', ['pse', 'strategy', 'momentum'], '''**Momentum — buy the recent winners (24 years, 2003 → Nov 2026)**
- Uses the PSE archive (2002 → 2021, incl. delisted) joined to PSE Edge (2015 → 2026); fees included
- Earned the most over 24 years but almost all of it in 2003–2013; drops of 50–65%; weak since 2020

''' + '\n\n'.join(variant(k.split(None, 1)[1], v, MOM_HOW[code(k)]) for k, v in mv))
bg = {**J('2026-11-09-pse-bagger-results.json'), **J('2026-11-09-pse-bagger-results-2.json')}; sd = bg.pop('_sold_then_doubled')
note(f'{P} › Strategy', 'Letting big winners run (multi-baggers)', ['pse', 'strategy', 'baggers'], f"""**Letting big winners run — "baggers" (2014 → Nov 2026)**
- Mark's question (9 Nov 2026): make sure stocks that double or triple are not sold too early
- Problem found: a stock that rises gets a LOWER dividend yield (same dividend ÷ higher price), so it can fall out of the top 40 and be sold at the 3-month re-check; and resizing every holding back to equal pesos cuts winners down
- Of {sd['sells']} sells by the chosen plan, {sd['later_doubled_within_3y']} stocks doubled later within 3 years (most were stop-loss sells while they were falling)

**Rule Max now uses (paper trading already works this way)**
- Never cut a winner back to equal size at the re-check — it keeps all its shares and keeps growing; new picks only use free cash
- A winner is still sold only by the 25% trailing stop or when it falls out of the top 40
- Tested: """ + f"{bg['NT  no trimming of winners']['per_year_%']}% a year vs {bg['DJ chosen: top-40 buffer + 25% trailing stop (re-weights to equal)']['per_year_%']}% when cutting winners back; worst drop {bg['NT  no trimming of winners']['worst_drop_%']}% (same); better in BOTH halves (2014–2019 and 2020–2026)" + """

**Also tested, NOT used (results jump around when the settings change a little = luck, not a real edge)**
- Keep any stock up 30%, 50% or 100% whatever its rank; wider 30–40% stop once a stock doubles
- Best of these: keep doubled stocks + 35% stop = """ + f"{bg['NT+KW100+BT35@100 keep only doubled stocks']['per_year_%']}% a year but worst drop {bg['NT+KW100+BT35@100 keep only doubled stocks']['worst_drop_%']}%; a close neighbour (35% stop once up 50%) made only {bg['NT+BT35@50 no trim + 35% stop once up 50%']['per_year_%']}%" + """

""" + '\n\n'.join(variant(k, v) for k, v in bg.items()) + """

**Stocks the chosen plan sold that later doubled (first 25)**
""" + '\n'.join(f"- {a} sold {b} at ₱{c:g} → later {x}× higher within 3 years" for a, b, c, x in sd['examples']))
mix = [(k, v) for k, v in {**pl1, **pl2}.items() if code(k) in ('Q', 'X')]
note(f'{P} › Strategy', 'Dividend + momentum mixes', ['pse', 'strategy'], '''**Half dividend, half momentum (2014 → Nov 2026)**
- Mixing smooths the ride a little but does not beat the chosen dividend version after its drop

''' + '\n\n'.join(variant(k.split(None, 1)[1] if code(k) == 'X' else k, v) for k, v in mix))
def pfv(k, v, how=''):
    out = [f'**{k}**' + (f' — {how}' if how else '')]
    for per in ('2009-2020 (settings chosen)', '2021-Nov 2026 (unseen)'):
        x = v.get(per)
        if x and any(x.values()): out.append(f'- {per}: {x["cagr"]:+.1f}% a year · total {x["total"]:+.1f}% · worst drop {x["maxdd"]}% · Sharpe {x["sharpe"]} · turnover {x["turnover_yr"]}× a year')
    if v.get('params'): out.append('- Settings: ' + ', '.join(f'{a} {b}' for a, b in v['params'].items()))
    if v.get('extra'): e = v['extra']; out.append(f"- Trades {e['unseen_trades']} · winners {e['win_%']}% · average win {e['avg_win_R']}R · average loss {e['avg_loss_R']}R · best {e['best_R']}R")
    return '\n'.join(out)
PF_HOW = {'Trend each stock (SMA)': 'hold each stock only above its own moving average', 'Momentum rotation (monthly, market filter)': 'monthly, 10 strongest stocks, only when the market is up',
          'Low-volatility rotation': 'the 20 calmest stocks', 'RSI(2) pullback': 'buy after a sharp 2-day dip, sell on the bounce', 'Swing breakout + ATR trailing stop': 'buy a 20-day high, trailing stop 4×ATR',
          'Hold all liquid stocks equally (with dividends)': 'benchmark'}
note(f'{P} › Strategy', 'Price swing, trend and other tests', ['pse', 'strategy'], '''**Other PSE strategies (settings picked on 2009–2020, then tested on unseen 2021 → Nov 2026)**
- Data: ''' + f"{pf['_data']['stocks']} stocks, {pf['_data']['from']} → {pf['_data']['to']}, {pf['_data']['splits_adjusted']} splits adjusted, cost {pf['_data']['cost_per_side_%']}% per side" + '''
- None of these beat simply holding high-dividend stocks in the unseen years

''' + '\n\n'.join(pfv(k, v, PF_HOW.get(k, '')) for k, v in pf.items() if not k.startswith('_') and 'capture' not in k and 'High dividend' not in k) + '''

**Swing breakout — every setting tried (2009 → Nov 2026)**
''' + '\n'.join(f"- {k.replace('|', ' · ')}: {g['cagr_%']:+.1f}% a year · worst drop {g['max_drop_%']}% · trades {g['trades']} · winners {g['win_%']}%" for k, g in pf['_swing_grid'].items()))
note(f'{P} › Strategy', 'Dividend capture and high-yield tests', ['pse', 'strategy', 'dividend'], '''**Dividend capture — buy just before the ex-date, sell just after (2021 → Nov 2026)**
- Lost money in every version: the price drops by about the dividend on the ex-date, and fees + 10% tax eat the rest

''' + '\n\n'.join(pfv(k, v) for k, v in pf.items() if 'capture' in k) + '''

**First high-yield tests (2021 → Nov 2026; before 2021 the old dividend data was incomplete)**
''' + '\n\n'.join(pfv(k, v) for k, v in pf.items() if 'High dividend' in k))

# ============================================================ PSE › Stocks and Dividend
D = json.load(open(f'{S}/qd/dividends_2013_2026.json')); DIR = {x['sym']: x for x in json.load(open(f'{S}/dl/pse_dir.json'))}
byS = collections.defaultdict(list)
for d in D: byS[d['sym']].append(d)
stock_files = sorted(glob.glob(f'{OLD}/PSE/PSE stocks/*/*.md')); SECT = collections.defaultdict(list); YE = {}
for fn in stock_files:
    sym = os.path.basename(fn)[:-3]; sect = os.path.basename(os.path.dirname(fn)).replace('&amp;', '&'); b = oldmd(fn[len(OLD) + 1:])
    name = re.match(r'\*\*[^—]*— (.*?)\*\*', b); name = name.group(1).replace('&amp;', '&') if name else sym
    SECT[sect].append((sym, name)); YE[sym] = {int(m.group(1)): float(m.group(2).replace(',', '')) for m in re.finditer(r'^- (\d{4})\*?: ₱([\d,.]+)', b, re.M)}
    if sym in byS:   # full payment list moves to the Dividend note; the stock note keeps the year's total and yield
        b = re.sub(r'(· div ₱[\d,.]+ \([\d.]+%\)): .*$', r'\1', b, flags=re.M)
        b = b.replace('\n**Sources**', f'\n- Every dividend payment: see PSE › Dividend › {sym} dividends\n\n**Sources**', 1)
    b = b.replace('div = cash dividends that year (yield on year-end close): ex-date amount per share, S = special; ', 'div = cash dividends that year (yield on year-end close); ')
    tags = ['pse', 'stock', sym.lower(), re.sub(r'[^a-z]+', '-', sect.lower()).strip('-')]
    note(f'{P} › Stocks', sym, tags, b.replace('**\n- Status:', f'**\n- Sector folder: {sect}\n- Status:', 1))
note(f'{P} › Stocks', '0 PSEi index by year 2002-2026', ['pse', 'psei'], G1['Trading/PSE/4 PSEi by year 2002-2026.md'].split('---\n', 2)[2])
note(f'{P} › Stocks', '0 Stocks by sector', ['pse', 'stock', 'index'], '**PSE stocks by sector (one note per stock in this folder)**\n- Names as listed on PSE Edge; "Delisted or not listed now" = in the old PSE archive but not trading today\n\n' +
     '\n\n'.join(f'**{s}** ({len(v)})\n' + '\n'.join(f'- {a} — {n}' for a, n in sorted(v)) for s, v in sorted(SECT.items(), key=lambda x: (x[0].startswith('Delisted'), x[0]))))
move('Trading/PSE/3 Dividend yields now.md', f'{P} › Dividend', '1 Dividend yields now')
move('Trading/PSE/5 Dividend history.md', f'{P} › Dividend', '3 Dividend history by year', edit=lambda b: b.replace("in each stock's note under PSE stocks", 'in the "<stock> dividends" notes in this folder'))
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
cal = collections.defaultdict(list); NAME = {s: n for v in SECT.values() for s, n in v}
for sym, ev in byS.items():
    rec = [e for e in ev if e['ex'] >= '2023-01-01' and not e['special']]
    ms = sorted({int(e['ex'][5:7]) for e in rec})
    for m in ms: cal[m].append(sym)
note(f'{P} › Dividend', '2 Dividend calendar (ex-date months)', ['pse', 'dividend', 'calendar'], '''**Dividend calendar — in which months each stock usually goes ex-dividend**
- Based on regular cash dividends with ex-dates 2023 → 2026 (specials left out)
- Why it matters: a stock bought after its ex-date pays nothing until the next one; the PSE plan keeps a stock while it is in the top 40 so it can still collect

''' + '\n'.join(f'- **{MON[m - 1]}** ({len(v)}): ' + ', '.join(sorted(v)) for m, v in sorted(cal.items())))
for sym, ev in sorted(byS.items()):
    ev = sorted(ev, key=lambda e: e['ex']); y = collections.defaultdict(list)
    for e in ev: y[int(e['ex'][:4])].append(e)
    ye = YE.get(sym, {}); lines = []
    for yr in sorted(y):
        tot = sum(e['amt'] for e in y[yr]); yl = f' = {tot / ye[yr] * 100:.1f}% of year-end close ₱{ye[yr]:g}' if ye.get(yr) else ''
        lines.append(f'\n**{yr}** — {len(y[yr])} payment(s), total ₱{tot:.10g}{yl}')
        for e in y[yr]:
            dd = dt.date.fromisoformat(e['ex']); lines.append(f"- {dd.strftime('%d %b %Y')}: ₱{e['amt']:.10g}" + (' special' if e['special'] else ' regular') + (f" ({e['note']})" if e.get('note') else '') + (' · PSE Edge list' if e.get('src') == 'PSE Edge' else ''))
    yrs_paid = sorted(y); last12 = sum(e['amt'] for e in ev if e['ex'] > (dt.date(2026, 11, 9) - dt.timedelta(days=365)).isoformat() and e['ex'] <= '2026-11-09')
    px = (ye.get(2026) or (ye[max(ye)] if ye else None))
    months = sorted({int(e['ex'][5:7]) for e in ev if e['ex'] >= '2023-01-01' and not e['special']})
    head = [f'**{sym} dividends — {NAME.get(sym, DIR.get(sym, {}).get("name", sym))}**',
            f'- Sector: {DIR.get(sym, {}).get("sector", "–")}' + (f' › {DIR[sym]["sub"]}' if DIR.get(sym, {}).get('sub') else ''),
            f'- Cash dividends on record: {len(ev)} payments, {yrs_paid[0]} → {yrs_paid[-1]} · paid in {len(yrs_paid)} of {2026 - max(2013, yrs_paid[0]) + 1} years since {max(2013, yrs_paid[0])}',
            f'- Last 12 months: ₱{last12:.10g}' + (f' = {last12 / px * 100:.1f}% of the last close ₱{px:g}' if px else ''),
            f'- Usual ex-date months (regular, 2023 →): ' + (', '.join(MON[m - 1] for m in months) or '–'),
            '- Amounts are pesos per share as declared (before the 10% tax); dollar/CAD dividends converted at that day\'s ECB rate', '', '**Every payment (ex-date)**']
    note(f'{P} › Dividend', f'{sym} dividends', ['pse', 'dividend', sym.lower()], '\n'.join(head) + '\n'.join(lines) + '''

**Sources**
- PSE Quarterly Dividend Reports 4Q2013 → 3Q2025 (documents.pse.com.ph) · PSE Edge dividends list (Oct 2025 → 2026)''')

# ============================================================ Crypto
move('Trading/Crypto/1 Crypto plan.md', f'{C} › Strategy', edit=lambda b: b.replace('at most 8 coins', 'at most 8 coins\n- No profit target: a winning coin is held until the trailing stop is hit, so a coin that runs 3× or 5× is kept the whole way up'))
move('Trading/Crypto/2 Crypto strategies ranked.md', f'{C} › Strategy')
cl = J('2026-11-09-crypto-long-results.json'); cc = J('2026-11-09-crypto-combos.json'); qf = J('2026-11-09-quality-filter-test.json')
dca = cl['BTC'].pop('DCA ₱1 every month since Jan 2011 (no selling)', None)
note(f'{C} › Strategy', 'Bitcoin strategies (all versions)', ['crypto', 'strategy', 'btc'], '''**Bitcoin only — every version tested (Jul 2010 → Nov 2026)**
- Prices: Coin Metrics + Bitstamp (2010 → 2017) and Binance (2017 → 2026); fees 0.30% per trade before 2017, 0.15% after
- Early years are huge (Bitcoin from $0.06), so judge mainly on 2022 → 2026
''' + (f"- Saving ₱1 every month since Jan 2011 (never selling): paid ₱{dca['paid']}, worth ₱{dca['value_now']:,} now ({dca['multiple']:,}×)\n" if dca else '') + '\n' +
     '\n\n'.join(variant(k, v) for k, v in cl['BTC'].items()))
note(f'{C} › Strategy', 'Swing, momentum and top-20 (all versions)', ['crypto', 'strategy'], '''**Strategies on the 20 most-traded coins (2018 → Nov 2026, Binance data)**
- Swing = buy when a coin closes above its highest close of the last 20 days; stop 2×ATR below that trails up; risk 0.5% of the book per trade; at most 8 coins

''' + '\n\n'.join(variant(k, v) for k, v in cl['TOP20'].items()))
note(f'{C} › Strategy', 'Swing quality filters (all Binance coins)', ['crypto', 'strategy'], '''**Trade only the best chances? Swing breakouts on ALL Binance coins**
- Same swing rule, with extra filters; 2018–2021 and the recent 2022 → Nov 2026 shown separately

''' + '\n\n'.join(f"**{k[2:]}**\n- 2018–2021: {v['2018-2021']['cagr']:+.1f}% a year · worst drop {v['2018-2021']['maxdd']}% · total {v['2018-2021']['total']:+.1f}%\n- 2022 → Nov 2026: {v['2022-Nov 2026']['cagr']:+.1f}% a year · worst drop {v['2022-Nov 2026']['maxdd']}% · total {v['2022-Nov 2026']['total']:+.1f}%\n- Trades since 2022: {v['trades_2022+']} · winners {v['win_%']}% · average result {v['avg_R']}R" for k, v in qf.items()))
note(f'{C} › Strategy', 'Swing + Bitcoin trend mixes (chosen)', ['crypto', 'strategy', 'core'], '''**Mixing swing with Bitcoin trend — how the chosen 70/30 mix was found**
- "BTC>100d" = hold Bitcoin only above its 100-day average · "vol40" = sized so swings stay near 40% a year

''' + '\n\n'.join(f"**{k}**" + (' — CHOSEN' if k == '30% BTC>100d vol40 + 70% swing' else '') + f"\n- {v['cagr']}% a year · worst drop {v['dd']}%\n- By period: " + ' · '.join(f"20{a} {b:+.1f}% a year (worst drop {c}%)" for a, b, c in v['periods']) + '\n- Year by year: ' + ' · '.join(f'{y} {x:+d}%' for y, x in v['years'].items()) for k, v in cc.items()))
for fn in sorted(glob.glob(f'{OLD}/Crypto/Crypto coins/*.md')):
    sym = os.path.basename(fn)[:-3]; note(f'{C} › Coins', sym, ['crypto', 'coin', sym.lower()], oldmd(fn[len(OLD) + 1:]))
move('Trading/Crypto/3 Bitcoin monthly prices 2010-2026.md', f'{C} › Coins', '0 Bitcoin month by month 2010-2026')
move('Trading/Crypto/4 Binance coins A-L.md', f'{C} › Coins', '0 All Binance coins A-L')
move('Trading/Crypto/5 Binance coins M-Z.md', f'{C} › Coins', '0 All Binance coins M-Z')

# ============================================================ Forex
fl = J('2026-11-09-fx-copy-long-results.json')
move('Trading/Forex and Gold/1 Forex and gold plan.md', f'{F} › Strategy')
move('Trading/Forex and Gold/2 Forex strategies ranked.md', f'{F} › Strategy')
FXHOW = {'Carry': 'earn the interest gap: own high-rate currencies, borrow low-rate ones', 'Trend': 'follow each currency\'s direction', 'Momentum': 'own the strongest, short the weakest', 'Hold': 'own all 10 against the dollar'}
note(f'{F} › Strategy', 'Forex strategies (all versions)', ['forex', 'strategy'], '''**Forex — every strategy tested (2000 → Oct 2026)**
- 10 currencies vs the US dollar (EUR, JPY, GBP, CHF, CAD, AUD, NZD, SEK, NOK, MXN); daily ECB/FRED rates; 3-month interest rates (OECD); no leverage; 0.03% per trade

''' + '\n\n'.join(variant(k, v, next((h for w, h in FXHOW.items() if k.startswith(w)), '')) for k, v in fl['FX'].items()))
note(f'{F} › Strategy', 'Gold strategies (all versions)', ['gold', 'strategy'], '''**Gold — tests (2000 → Oct 2026)**
- Gold futures (Yahoo GC=F) and CFTC weekly positions in gold
- Gold trend used in the plan (hold only above the 200-day average, sized to 12% swings): about 6.3% a year, worst drop −34% (2014 → 2026 test inside MAX-MASTER-3)

''' + '\n\n'.join(variant(k, v) for k, v in fl['GOLD'].items()))
for fn in sorted(glob.glob(f'{OLD}/Forex/Currencies/*.md')):
    t = os.path.basename(fn)[:-3]; nt = re.sub(r' vs USD (2000|2003)-2026', ' vs US dollar', t).replace('PHP peso', 'PHP Philippine peso')
    note(f'{F} › Currency', nt, ['forex', 'currency', t.split()[0].lower()], oldmd(fn[len(OLD) + 1:]))
move('Trading/Forex and Gold/3 Gold by year 2000-2026.md', f'{F} › Currency', 'XAU Gold vs US dollar')

# ============================================================ Copy trading
hl = J('2026-11-08-copytrading-hl-results.json')
move('Trading/Copy trading/1 Copy trading verdict.md', f'{K} › Strategy')
move('Trading/Copy trading/2 Copy strategies ranked.md', f'{K} › Strategy')
def hlv(k, v):
    s = hl['_split'].get({'Copy everyone (average active trader)': 'all'}.get(k) or re.sub(r'Copy top-(\d+) (?:by )?(\w+).*', lambda m: (('steady' if m.group(2) == 'steady' else m.group(2)) + '-' + m.group(1)), k), {})
    out = [f'**{k}**', f"- {v['months']} months · {v['per_year_%']:+.1f}% a year · total {v['total_%']:+.1f}% · green months {v['win_months_%']}% · worst month {v['worst_month_%']}% · worst drop {v['max_drop_%']}% · Sharpe {v['sharpe']}"]
    for per, x in s.items():
        if x: out.append(f"- {per}: {x['per_year_%']:+.1f}% a year · total {x['total_%']:+.1f}% · green months {x['win_months_%']}% · worst drop {x['max_drop_%']}%")
    return '\n'.join(out)
note(f'{K} › Strategy', 'Copy real traders on Hyperliquid (all versions)', ['copy-trading', 'strategy'], f'''**Copying real traders — honest test on Hyperliquid (Mar 2023 → Oct 2026)**
- {hl['_note']['accounts']:,} of the most active accounts, {hl['_note']['trader_months']:,} trader-months; accounts that blew up are included
- At each month-end pick traders using ONLY their past record, then measure the NEXT month; {hl['_note']['drag_per_month_%']}% a month copy delay cost
- r30/r90/r180 = best return in the last 30/90/180 days (what app leaderboards show) · pnl90 = biggest profit in 90 days · sharpe6 = smoothest last 6 months · steady = ≥4 of 6 green months, positive 90 days, ≥$100k account
- Median trader month: {hl['_median_trader_month_%']}% · positive trader-months: {hl['_share_of_traders_positive_month_%']}%
- Note: 2023–2024 was a crypto boom; 2025 → 2026 shows what happened after

''' + '\n\n'.join(hlv(k, v) for k, v in hl.items() if not k.startswith('_') and v))
note(f'{K} › Strategy', 'Copy or fade big traders via CFTC (all versions)', ['copy-trading', 'strategy', 'forex'], '''**Copy or do the opposite of big trader groups (CFTC weekly positions, 2000 → Oct 2026)**
- The only 20+ year record of what big groups hold: speculators, hedgers (big companies), hedge funds and asset managers, in the 10 currencies
- "Level" = follow their net position · "change vs 13-wk avg" = follow their recent change

''' + '\n\n'.join(variant(k, v) for k, v in fl['COPY'].items()))
# platforms: one note per platform — facts from the platforms' own help pages (checked 9 Nov 2026) and the sourced platform note
pl = oldmd('Copy trading/Copy trading platforms.md'); src = pl[pl.index('**Sources**'):]
PH = '- In the Philippines: the SEC warned on 4 Aug 2025 that OKX, Bybit, MEXC, KuCoin, Bitget, Phemex, CoinEx, BitMart, Poloniex and Kraken operate without registration; Binance and Bybit apps left Google Play PH in Feb/Mar 2026, OKX by Jul 2026; NTC told PLDT, Smart and Globe to block flagged exchange sites (late 2025)'
PLATS = {
 'eToro CopyTrader': ['Type: stocks, ETFs, crypto and CFDs; copy "Popular Investors" (thousands to choose from)', 'Minimum to copy one trader: $200; each copied position at least $1; copy up to 100 traders at once',
   'Fee for copying: none extra ("no additional charge"); you pay the normal spreads and fees', 'You can set a copy stop loss, add or remove money, or pause a copy', 'Users: millions in over 75 countries; CopyTrader trademark 2012',
   'Licences: CySEC #109/10 (EU), FCA FRN 583263 (UK), ASIC AFSL 491139 (Australia), FSA Seychelles SD076, ADGM FSRA 220073', 'Crypto trades have no MiFID-style protection; copying is not investment advice',
   'Public long records: eToro shows each Popular Investor\'s monthly returns since they joined — the longest public copy records outside crypto (not downloadable, so Max could not test them)', 'Source: https://www.etoro.com/trading/copytrader/'],
 'ZuluTrade': ['Type: forex/CFD signal copying through partner brokers; founded 2007, beta 2008', 'Accounts (DailyForex review): Profit Sharing account $30 a month + 25% of profits above a benchmark; Classic account paid through wider spreads; minimum deposit set by the broker',
   'ZuluGuard: automatically stops copying a trader whose behaviour suddenly changes', 'Licences: EU portfolio-management licence 2015 (Hellenic Capital Market Commission 2/540/17-2-2010); Japan (Kanto Financial Bureau); US CFTC-registered IB/CTA',
   'Owner: Finvasia since Dec 2021; dropped profit-share fees for followers in 2022 (Wikipedia)', 'Source: https://www.dailyforex.com/forex-brokers/zulutrade-review · https://en.wikipedia.org/wiki/ZuluTrade'],
 'Binance copy trading': ['Type: crypto futures copy trading (2023) and spot copy trading (Apr 2024)', 'Profit share to lead traders: standard 10%; badges allow 0–15% (Cadet), 0–20% (Champion), 0–30% (Master, Legend)',
   'Lead trader badge needs e.g. Cadet: ≥1,000 USDT, ≥200 copiers, ≥15 days running, ≥10,000 USDT average copied money; Legend: ≥20,000 USDT, ≥800 copiers, ≥3M USDT', PH, 'Source: https://www.binance.com/en/support/faq/3160c961b2734d1cbb5342d1e86c6cdb'],
 'Bybit copy trading': ['Type: crypto futures (USDT perpetual) and spot copy trading', 'Profit share by Master Trader rank: Cadet 10%, Bronze 10%, Silver 12%, Gold 15%',
   'Profit counted Saturday 00:00 → Friday 23:59 UTC, settled Monday 03:00 UTC; paid only if your net result that week is positive (otherwise refunded)', PH, 'Source: https://www.bybit.com/en/help-center/article/Copy-Trading-Profit-Sharing-Explained'],
 'OKX copy trading': ['Type: crypto futures and spot copy trading', 'Profit share up to 30% depending on the lead trader\'s level (example: 10% at Level 2); lead traders may change it 3 times a month',
   'Settled weekly every Monday 00:00 (UTC+8) since 10 Sep 2023, on net profit after fees; only when no copied position is still open', PH, 'Source: https://www.okx.com/help-center/11664907789325'],
 'Bitget copy trading': ['Type: crypto futures, spot and bot copy trading; one of the largest crypto copy platforms', 'Elite trader profit share: Bronze/Silver 10%, Gold 12%, Platinum 14%, Extraordinary 15%, Legend 20% (maximums)',
   'Profit share paid daily at 12:00 AM (UTC+8), only on profitable orders', 'Leaderboard needs ≥100 USDT and at least one closed elite trade', PH, 'Source: https://www.bitget.com/asia/support/articles/12560603777069'],
 'MetaQuotes MQL5 Signals': ['Type: copy MetaTrader 4/5 signal providers (mostly forex) straight into your own broker account', 'Provider sets a monthly fee; MetaQuotes keeps 20%, the provider gets the rest after the period ends',
   'Paid in advance for the whole period; a cancelled subscription is not refunded', 'Copying works only while your MetaTrader is running and connected (or on a hosted terminal)', 'Source: https://www.mql5.com/en/signals/rules'],
 'Hyperliquid': ['Type: on-chain crypto perpetuals exchange; every account\'s trades and profit are public → the only place with full, checkable trader records (2023 →)',
   'Vaults (built-in copying): the vault leader gets 10% of profits; you can withdraw after 1 day (user vaults) or 4 days (HLP, the exchange\'s own vault)', 'Records checked by Max: 1,500 of the most active accounts — see Copy trading › Traders',
   'Source: https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/vaults/for-vault-depositors'],
 'Invo': ['Type: copy-trading app on top of Hyperliquid perpetuals', 'Fees: taker 0.0768%, maker rebate 0.048%; copied traders get 15% of the fees their copiers generate (paid for activity, not for winning)',
   'KuCoin research: about 400,000 wallets on Invo and 5 similar apps lost about $280M; for BTC trades fees exceeded users\' gains', 'Source: https://www.invoapp.com/guides/fees · https://www.kucoin.com/blog/hyperliquid-retail-traders-280-million-losses'],
 'Tradency Mirror Trader': ['Type: early automatic system (about 2005) to copy a forex strategy\'s trades through brokers', 'Source: https://en.wikipedia.org/wiki/Copy_trading'],
 'FxPro SuperTrader': ['Type: forex strategy copying at FxPro; closed in 2017', 'Many brokers closed copy services after regulators cleaned up scams', 'Source: https://en.wikipedia.org/wiki/Copy_trading']}
for title, facts in PLATS.items():
    note(f'{K} › Platform', title, ['copy-trading', 'platform'], f'**{title}**\n' + '\n'.join('- ' + f.lstrip('- ') for f in facts))
rr = pl[pl.index('**Rules and research**'):pl.index('**Sources**')]
note(f'{K} › Platform', '0 Rules, research and risks', ['copy-trading', 'platform'], rr + '\n' + src)

# ---- traders: every month of every tested Hyperliquid account
H = f'{S}/dl/hl'; lb = {r['ethAddress'].lower(): r for r in json.load(open(f'{H}/leaderboard.json'))['leaderboardRows']}
ME = pd.date_range('2023-02-28', '2026-10-31', freq='ME'); TR = []
def at(s, t): s = s[s.index <= t]; return s.iat[-1] if len(s) else np.nan
for fn in glob.glob(f'{H}/p_*.json'):
    d = json.load(open(fn)); a = os.path.basename(fn)[2:-5].lower()
    if not d.get('pnlHistory') or len(d['pnlHistory']) < 5: continue
    pn = pd.Series({pd.Timestamp(t, unit='ms'): float(v) for t, v in d['pnlHistory']}).sort_index(); av = pd.Series({pd.Timestamp(t, unit='ms'): float(v) for t, v in d['accountValueHistory']}).sort_index()
    pn = pn[~pn.index.duplicated()]; av = av[~av.index.duplicated()]; mo = {}
    for i in range(len(ME) - 1):
        t, t2 = ME[i], ME[i + 1]
        if t < pn.index.min(): continue
        v = at(av, t)
        if not v or v < 10000: continue
        dp = at(pn, t2) - at(pn, t); mo[t2.strftime('%Y-%m')] = (max(dp / max(v, at(av, t2) - dp), -1.0), dp, v)
    if len(mo) < 3: continue
    r = pd.Series({k: x[0] for k, x in mo.items()}); eq = (1 + r.clip(-1, 1)).cumprod()
    L = lb.get(a, {}); wp = dict(L.get('windowPerformances', []))
    TR.append({'a': a, 'name': L.get('displayName'), 'months': len(r), 'green': (r > 0).mean() * 100, 'total': (eq.iat[-1] - 1) * 100, 'peryear': (eq.iat[-1] ** (12 / len(r)) - 1) * 100 if eq.iat[-1] > 0 else -100,
               'worst': r.min() * 100, 'best': r.max() * 100, 'dd': (eq / eq.cummax() - 1).min() * 100, 'av': float(L.get('accountValue') or at(av, av.index.max())), 'pnl_all': float(wp.get('allTime', {}).get('pnl', at(pn, pn.index.max()))),
               'pnl_month': float(wp.get('month', {}).get('pnl', 0) or 0), 'vlm': float(wp.get('allTime', {}).get('vlm', 0) or 0), 'mo': mo, 'start': pn.index.min().date()})
TR.sort(key=lambda x: -x['pnl_all'])
def short(a): return a[:6] + '…' + a[-4:]
def money(x): a = abs(x); return ('−' if x < 0 else '') + ('$' + (f'{a / 1e9:.2f}B' if a >= 999.5e6 else f'{a / 1e6:.1f}M' if a >= 999.5e3 else f'{a / 1e3:.0f}K' if a >= 1e3 else f'{a:.0f}'))
steady = sorted([x for x in TR if x['months'] >= 12 and x['total'] > 0 and x['dd'] > -50], key=lambda x: (-x['green'], -x['peryear']))[:40]
top = TR[:30]; worst = sorted(TR, key=lambda x: x['pnl_all'])[:10]
pick = {x['a']: x for x in steady + top + worst}
def tname(x): return 'Trader ' + short(x['a']) + (f" ({x['name']})" if x['name'] else '')
note(f'{K} › Traders', '0 All traders tested (table)', ['copy-trading', 'traders'], f'''**All {len(TR):,} Hyperliquid traders with at least 3 months of record (Mar 2023 → Oct 2026)**
- Sorted by all-time profit · month returns use the larger of start balance or start + deposits as capital (so deposits don't look like profit)
- Account value and all-time profit/volume from the Hyperliquid leaderboard ({dt.date.fromtimestamp(os.path.getmtime(f'{H}/leaderboard.json')).isoformat()})
- Own note in this folder: the 40 steadiest (≥12 months, never down 50%), the 30 biggest earners and the 10 biggest losers
- Of these traders, {sum(1 for x in TR if x['total'] > 0) / len(TR) * 100:.0f}% grew their money over their whole record; {sum(1 for x in TR if x['dd'] <= -50) / len(TR) * 100:.0f}% fell 50% or more at some point

| Trader | Months | Green months | Per year | Worst drop | Worst month | Account now | All-time profit |
|---|---|---|---|---|---|---|---|
''' + '\n'.join(f"| {short(x['a'])}{'*' if x['a'] in pick else ''} | {x['months']} | {x['green']:.0f}% | {x['peryear']:+.0f}% | {x['dd']:.0f}% | {x['worst']:.0f}% | {money(x['av'])} | {money(x['pnl_all'])} |" for x in TR) + '\n\n* = has its own note')
for x in pick.values():
    why = ('steadiest traders' if x in steady else '') + (' · biggest earners' if x in top else '') + (' · biggest losers' if x in worst else '')
    rows = '\n'.join(f"- {k}: {r * 100:+.1f}% ({money(dp)} on {money(v)} at month start)" for k, (r, dp, v) in x['mo'].items())
    note(f'{K} › Traders', tname(x), ['copy-trading', 'trader'], f'''**{tname(x)}**
- Address: {x['a']} (public on Hyperliquid)
- In this folder because: one of the {why.strip(' ·')}
- Record from {x['start']} · {x['months']} months counted · green months {x['green']:.0f}%
- {x['peryear']:+.1f}% a year · total {x['total']:+.1f}% · worst drop {x['dd']:.1f}% · best month {x['best']:+.1f}% · worst month {x['worst']:+.1f}%
- Account value {money(x['av'])} · all-time profit {money(x['pnl_all'])} · last month {money(x['pnl_month'])} · all-time volume {money(x['vlm'])}
- A good past record did not predict the next months on average — see Copy trading › Strategy

**Month by month (return, profit on capital)**
{rows}

**Source**
- api.hyperliquid.xyz (portfolio history and leaderboard)''')

# ============================================================ Investments (the ₱100,000 plan, 9 Nov 2026)
sys.path.insert(0, '/home/claude/max-mobile/trader/invest'); import invest_notes
for title, (tags, body) in invest_notes.NOTES.items(): note('Investments', title, tags, body)
# ============================================================ write vault, bundle, zip
import shutil; shutil.rmtree(OUT, ignore_errors=True)
for (cat, title), t in NOTES.items():
    fp = f'{OUT}/' + '/'.join(cat.split(' › ')) + f'/{title.replace("/", "-")}.md'; os.makedirs(os.path.dirname(fp), exist_ok=True); open(fp, 'w').write(t)
def inline(t):
    t = html.escape(html.unescape(t), quote=False); t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t); t = re.sub(r'(https?://[^\s<·)]+)', r'<a href="\1">\1</a>', t); return t
def md2html(md):
    out = []; lines = md.split('\n'); i = 0
    while i < len(lines):
        l = lines[i]
        if not l.strip(): i += 1; continue
        if re.match(r'^\s*\|.*\|\s*$', l):
            rows = []
            while i < len(lines) and re.match(r'^\s*\|.*\|\s*$', lines[i]): rows.append(lines[i]); i += 1
            cells = lambda r: [c.strip() for c in r.strip().strip('|').split('|')]; body = [r for r in rows if not re.match(r'^\s*\|?\s*:?-{2,}', r)]
            out.append('<table>' + ''.join('<tr>' + ''.join((f'<th>{inline(c)}</th>' if k == 0 else f'<td>{inline(c)}</td>') for c in cells(r)) + '</tr>' for k, r in enumerate(body)) + '</table>'); continue
        if re.match(r'^\s*-\s+', l):
            items = []
            while i < len(lines) and re.match(r'^\s*-\s+', lines[i]): items.append(re.sub(r'^\s*-\s+', '', lines[i])); i += 1
            out.append('<ul>' + ''.join(f'<li>{inline(x)}</li>' for x in items) + '</ul>'); continue
        out.append(f'<p>{inline(l.strip())}</p>'); i += 1
    return ''.join(out)
bundle = []
for (cat, title), t in NOTES.items():
    fm = re.match(r'^---\ntags: \[(.*?)\]\n---\n', t); tags = [x.strip() for x in fm.group(1).split(',')]
    nid = 'tn2-' + hashlib.sha1((cat + '|' + title).encode()).hexdigest()[:16]
    bundle.append({'id': nid, 'title': title, 'category': cat, 'tags': tags[:10], 'body': md2html(t[fm.end():].strip())})
json.dump(bundle, open(f'{S}/trading_notes_v2.json', 'w'), ensure_ascii=False)
with zipfile.ZipFile(f'{S}/Max-Trading-notes-v2.zip', 'w', zipfile.ZIP_DEFLATED) as zf:
    for (cat, title), t in NOTES.items(): zf.writestr('Max Trading/' + '/'.join(cat.split(' › ')) + f'/{title.replace("/", "-")}.md', t)
cnt = collections.Counter(c for c, _ in NOTES)
print(len(NOTES), 'notes;', sum(len(b['body']) for b in bundle), 'html chars'); [print(f'  {c}: {n}') for c, n in sorted(cnt.items())]
