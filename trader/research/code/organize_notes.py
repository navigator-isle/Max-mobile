# Re-organizes Max's trading notes into a clear, numbered structure (built from the same data and result files).
#   Trading/            1 Start here · 2 My plan · 3 Paper trading · 4 Words used
#   Trading › PSE/      1 PSE plan · 2 PSE strategies ranked · 3 Dividend yields now · 4 PSEi by year · 5 Dividend history   (+ PSE stocks › sector, unchanged)
#   Trading › Crypto/   1 Crypto plan · 2 Crypto strategies ranked · 3 Bitcoin monthly prices · 4–5 Binance coin lists   (+ Crypto coins, unchanged)
#   Trading › Forex and Gold/  1 Forex and gold plan · 2 Forex strategies ranked · 3 Gold by year   (+ Currencies)
#   Trading › Copy trading/    1 Copy trading verdict · 2 Copy strategies ranked · 3 Platforms
#   Trading › Reference/       Fees 2026 · Market events by year
import json, os, re, shutil, glob, zipfile
S = '/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'; RES = '/home/claude/max-mobile/trader/research'
OLD = f'{S}/MaxTrading/Trading'; NEW = f'{S}/MaxTrading2'; T = 'Trading'
J = lambda f: json.load(open(f'{RES}/{f}'))
NOTES = {}
def note(folder, title, tags, body): NOTES[f'{folder}/{title}.md'] = f'---\ntags: [{", ".join(["trading"] + tags)}]\n---\n' + body.strip() + '\n'
def old(path):
    t = open(f'{OLD}/{path}').read(); return re.sub(r'^---\n.*?\n---\n', '', t, flags=re.S).strip()
def strip_title(t): return re.sub(r'^\*\*[^\n]*\*\*\n', '', t, count=1)
def pc(x): return '–' if x is None else f'{x:+.1f}%' if isinstance(x, (int, float)) else str(x)
def verdict(name, yr, dd, chosen=False, recent=None):
    if chosen: return '✅ chosen'
    if yr is None or yr <= 1 or (recent is not None and recent < 0): return '❌ avoid'
    if dd is not None and dd < -45: return '⚠️ big drops'
    if yr < 4: return '👎 weak'
    if yr >= 7 and dd is not None and dd > -30: return '👍 good'
    return '🆗 ok'
def table(rows, extra=None):
    h = '| # | Strategy | Per year | Worst drop | ' + (extra + ' | ' if extra else '') + 'Verdict |\n|---|---|---|---|' + ('---|' if extra else '') + '---|\n'
    return h + '\n'.join(f'| {i} | {n} | {pc(y)} | {pc(d)} | ' + (f'{e} | ' if extra else '') + f'{v} |' for i, (n, y, d, e, v) in enumerate(rows, 1))

# ---------------------------------------------------------------- Trading (top)
mm = J('2026-11-09-new-master-candidates.json'); A = mm['A: 40 PSE / 30 crypto / 30 gold trend (vol-sized)']
yrs = ' · '.join(f'{y} {v:+.0f}%' for y, v in A['years'].items())
note(T, '1 Start here', ['core'], f'''**Start here — Max's trading notes**
- Paper trading only (pretend money). Max never places real trades and gives no buy/sell advice.
- Everything here comes from real downloaded prices and tested strategies, with fees included.

**How the notes are arranged**
- **2 My plan** — the one combined plan Max follows (MAX-MASTER-3)
- **3 Paper trading** — where the pretend trades run and when the report comes
- **4 Words used** — simple meaning of trading words (trailing stop, yield, drop…)
- **PSE** — 1 plan · 2 strategies ranked · 3 dividend yields now · 4 PSEi by year · 5 dividend history · PSE stocks (one note per stock)
- **Crypto** — 1 plan · 2 strategies ranked · 3 Bitcoin monthly prices · 4–5 all Binance coins · Crypto coins (one note per coin)
- **Forex and Gold** — 1 plan · 2 forex strategies ranked · 3 gold by year · Currencies (one note per currency, incl. peso)
- **Copy trading** — 1 verdict · 2 strategies ranked · 3 platforms
- **Reference** — fees 2026 · market events by year

**The answer in one minute**
- Best plan found: 40% PSE dividend stocks + 30% crypto (trend rules) + 30% gold (trend rules)
- Tested 2014 → Oct 2026: about {A["per_year_%"]}% a year, worst drop {A["worst_drop_%"]}%
- Forex and copy trading: no lasting profit in 26 years of tests → watch only
- Verdict signs in the rankings: ✅ chosen · 👍 good (steady) · 🆗 ok · 👎 weak (under 4% a year) · ⚠️ big drops (over 45%) · ❌ avoid (loses money)''')
note(T, '2 My plan MAX-MASTER-3', ['core', 'strategy'], f'''**My plan — MAX-MASTER-3 (from 9 Nov 2026)**

**The four parts**
- **40% PSE dividend stocks** — the 20 highest dividend payers; see PSE › 1 PSE plan
- **21% crypto swing** — buy strong coins breaking out, only when Bitcoin is healthy; see Crypto › 1 Crypto plan
- **9% Bitcoin trend** — hold Bitcoin only in an uptrend
- **30% gold trend** — hold gold only in an uptrend; see Forex and Gold › 1 plan

**Why this mix**
- The three parts rarely move together, so when one falls the others often hold up
- Each part has a rule that cuts losses (trailing stop or "only in an uptrend")

**Tested results (2014 → Oct 2026, fees included)**
- About {A["per_year_%"]}% a year · worst drop {A["worst_drop_%"]}% · worst month {A["worst_month_%"]}%
- First half 2014–2019: {A["2014-2019"]}% a year · second half 2020–2026: {A["2020-2026"]}% a year
- By year: {yrs}

**Not used (watch only)**
- Forex and copy trading: no lasting edge in 26 years of tests
- Crypto momentum and copying "hot" traders: lost money in tests

**Limits**
- Past results don't guarantee the future; crypto and gold are in US dollars, PSE in pesos''')
note(T, '3 Paper trading', ['paper'], '''**Paper trading — how it runs**
- Started 8 Nov 2026 with pretend money: ₱100,000 per strategy
- Runs every Sunday on the dashboard: https://claude.ai/artifact/25fnUcKASedJmKSZBRbW9H
- Report by email every Sunday 5:57 pm Manila, every buy and sell explained (signal, price, stop, risk, result)
- Trades fill at the next day's closing price with real fees (COL for PSE, Binance for crypto)

**Main books (count in the plan)**
- PSE dividend top-20 · Crypto swing · Bitcoin trend · Gold trend

**Watch-only books (to confirm they fail live)**
- Forex fade big traders · Copy steady traders · Copy hot traders · Crypto momentum rotation

**When to judge**
- Too early before about 12 weeks; a full year with dividends is better''')
note(T, '4 Words used', ['glossary'], '''**Words used in the trading notes**
- **Paper trading** — trading with pretend money to test a strategy
- **Per year** — average growth each year (compound)
- **Worst drop** — biggest fall from a high point before recovering (also called drawdown)
- **Dividend yield** — cash dividends of the last 12 months ÷ today's price
- **Ex-date** — buy before this date to get the dividend
- **Rebalance** — re-check the list and sell/buy to match the rules
- **Board lot** — the minimum number of shares you can buy on the PSE
- **Trailing stop** — a sell level that moves up as the price rises and never goes down; it locks in profit
- **ATR** — the average daily price move; a 2×ATR stop sits two "normal days" below the price
- **Breakout** — the price closes above its highest close of the last 20 days
- **Uptrend filter** — only trade when the price is above its 50-, 100- or 200-day average
- **R** — profit or loss compared with the amount risked (+2R = won twice the risk)
- **Momentum** — buying what went up most recently
- **Carry** — earning the interest gap between two currencies
- **Fade** — doing the opposite of a group of traders
- **Sharpe** — return compared with how bumpy the ride was (higher = smoother)''')

# ---------------------------------------------------------------- PSE
pl1 = J('2026-11-09-pse-long-results.json'); pl2 = J('2026-11-09-pse-long-results-2.json'); pf = J('2026-11-08-pse-full-results.json')
def g(d, k): v = d[k]; return v['per_year_%'], v['worst_drop_%'], v.get('2020-2026_%/yr')
DIVS = [('Dividend top-20 · keep while in top-40 · 25% trailing stop', pl2, 'DJ buffer top-40 + trailing stop 25%', True),
        ('Dividend top-20 · 25% trailing stop', pl1, 'J  stop: sell if 25% below highest close', False),
        ('Dividend top-20 · 30% trailing stop', pl2, 'J3 A + trailing stop 30%', False),
        ('Dividend top-20 · 20% trailing stop', pl2, 'J2 A + trailing stop 20%', False),
        ('Dividend top-20 · re-check every 6 months', pl1, 'B  ... every 6 months', False),
        ('Dividend top-20 · re-check every 3 months (no stop)', pl1, 'A  Dividend top-20, rebalance every 3 months (current plan)', False),
        ('Dividend top-20 · sell if 20% below buy price', pl1, 'I  stop: sell if 20% below buy price', False),
        ('Dividend top-20 · keep while in top-40 (no stop)', pl1, 'D  buffer: buy top-20, keep while in top-40 (3 months)', False),
        ('Dividend top-20 · skip "trap" stocks', pl1, 'G  trap filter: skip if price −30% in a year or yield >15%', False),
        ('Dividend top-20 · re-check every 12 months', pl1, 'C  ... every 12 months', False),
        ('Dividend top-20 · keep while in top-60', pl1, 'E  buffer top-60', False),
        ('Dividend top-20 · regular dividends only', pl1, 'F  rank by REGULAR dividends only (no specials)', False),
        ('Dividend top-20 · must pay 2 years in a row', pl1, 'H  only stocks that paid in each of the last 2 years', False),
        ('Dividend top-10 · all filters', pl1, 'N  combo L, top-10 instead of 20', False),
        ('Dividend · all filters + stop', pl1, 'M  combo L + stop 25% below highest close', False),
        ('Dividend · all filters together', pl1, 'L  combo: regular divs + paid 2 yrs + trap filter + buffer 40', False),
        ('Dividend top-20 · sell when below 200-day average', pl1, 'K  stop: sell if below its 200-day average', False),
        ('50% dividend + 50% momentum', pl2, 'X  50% DJ dividend + 50% P2 momentum (2014–2026)', False),
        ('Hold all liquid stocks (the market)', pl1, 'Benchmark: hold all liquid stocks (dividends included)', False)]
rows = []
for n, d, k, ch in DIVS:
    y, dd, r = g(d, k); rows.append((n, y, dd, pc(r), verdict(n, y, dd, ch, r) if 'market' not in n else '— benchmark'))
rows = [rows[0]] + sorted([r for r in rows[1:] if 'benchmark' not in r[4]], key=lambda r: -(r[1] / max(10, abs(r[2])))) + [r for r in rows if 'benchmark' in r[4]]
PRICE = [('Momentum top-10 · only when market above 200-day avg', 'P2 Momentum top-10, only when market above 200-day avg (2003–2026)', pl1),
         ('Momentum top-10 · market filter · 15% trailing stop', 'P5 P2 + trailing stop 15% (2003–2026)', pl2),
         ('Momentum top-10 (every month)', 'P1 Momentum top-10 by 6-month return, monthly (2003–2026)', pl1),
         ('Momentum top-10 · market filter · 20% trailing stop', 'P4 P2 + trailing stop 20% (2003–2026)', pl2),
         ('Hold all liquid stocks (the market)', 'P3 Benchmark all liquid stocks (2003–2026)', pl1)]
prow = []
for n, k, d in PRICE:
    y, dd, r = g(d, k); prow.append((n, y, dd, pc(r), '— benchmark' if 'market)' in n else verdict(n, y, dd, False, r)))
short = {k: v['2021-Nov 2026 (unseen)'] for k, v in pf.items() if not k.startswith('_') and v.get('2021-Nov 2026 (unseen)')}
caps = [(k, v['cagr'], v['maxdd']) for k, v in short.items() if k.startswith('Dividend capture')]
others = [('Swing breakout + trailing stop', 'Swing breakout + ATR trailing stop'), ('Trend per stock (above its average)', 'Trend each stock (SMA)'), ('Low-volatility stocks', 'Low-volatility rotation'), ('RSI(2) dip buying', 'RSI(2) pullback')]
orow = [(n, short[k]['cagr'], short[k]['maxdd'], '', verdict(n, short[k]['cagr'], short[k]['maxdd'])) for n, k in others if k in short] + [('Dividend capture (buy before ex-date, sell after)', min(c[1] for c in caps), min(c[2] for c in caps), '', '❌ avoid')] if caps else []
note(f'{T}/PSE', '1 PSE plan', ['pse', 'core', 'strategy'], '''**PSE plan — high-dividend top 20**
- 40% of the total plan · paper ₱100,000 · COL fees

**Which stocks**
- All PSE stocks, price at least ₱1, at least ₱5M traded a day
- Paid cash dividends in the last 12 months of at least 3% of the price
- Rank by dividend yield → buy the top 20, about equal pesos each, whole board lots

**When to buy and sell**
- Buy at the next trading day's close after the list is made
- Every 3 months: re-check; keep a stock while it is still in the top 40 (so it can still pay its dividend); sell if it falls below 40
- Safety stop: sell if a stock closes 25% below its highest close since buying; the cash waits for the next re-check
- Dividends are added on the ex-date after 10% tax

**What Max does not do (tested, worse)**
- Dividend capture (buy before ex-date, sell after) — lost 27–48%
- Market filter on dividend stocks — cut returns
- Tighter stops (20%, 200-day average) — sold too often

**Tested (2014 → Nov 2026)**
- ''' + f'{rows[0][1]}% a year · worst drop {rows[0][2]}% (without the stop: {g(pl1, "A  Dividend top-20, rebalance every 3 months (current plan)")[1]}%)' + '''
- See 2 PSE strategies ranked for all other versions''')
note(f'{T}/PSE', '2 PSE strategies ranked', ['pse', 'strategy'], '''**PSE strategies ranked (best → worst)**
- Fees and 10% dividend tax included · trade at next close · delisted stocks included

**Dividend strategies (2014 → Nov 2026)**
''' + table(rows, 'Since 2020') + '''

**Price-only strategies (24 years, 2003 → Nov 2026)**
''' + table(prow, 'Since 2020') + '''

**Other strategies (2021 → Nov 2026 only)**
''' + table(orow) + '''

**Summary**
- Best: dividend top-20 with a 25% trailing stop and the top-40 buffer — steady, smallest drop
- Momentum earned more over 24 years but mostly in 2003–2013 and can drop 50–65%
- Day trading the PSE loses to fees (~0.9% per round trip)''')
note(f'{T}/PSE', '3 Dividend yields now', ['pse', 'dividend'], '**Dividend yields now (last 12 months)**\n' + strip_title(old('PSE/PSE dividend yields now (all paying stocks).md')))
note(f'{T}/PSE', '4 PSEi by year 2002-2026', ['pse', 'psei'], '**PSEi by year (year-end close)**\n' + strip_title(old('PSE/PSE market by year 2002-2026.md')))
note(f'{T}/PSE', '5 Dividend history', ['pse', 'dividend'], '**PSE dividend history**\n' + strip_title(old('PSE/PSE dividend history summary.md')))

# ---------------------------------------------------------------- Crypto
cl = J('2026-11-09-crypto-long-results.json'); cc = J('2026-11-09-crypto-combos.json'); qf = J('2026-11-09-quality-filter-test.json')
crow = []
best = cc['30% BTC>100d vol40 + 70% swing']
crow.append(('70% swing + 30% Bitcoin trend', best['cagr'], best['dd'], pc(best['periods'][2][1]), '✅ chosen'))
names = {('TOP20', 'Swing + only when BTC above 50-day avg (CURRENT PLAN)'): 'Swing breakout · only when Bitcoin above 50-day avg',
         ('BTC', 'Above 100-day avg, sized to 40% volatility'): 'Bitcoin only above 100-day avg · sized',
         ('BTC', 'Hold only above 100-day average'): 'Bitcoin only above 100-day avg',
         ('BTC', 'Hold only above 50-day average'): 'Bitcoin only above 50-day avg',
         ('BTC', 'Hold only above 200-day average'): 'Bitcoin only above 200-day avg',
         ('BTC', '50-day above 200-day (golden cross)'): 'Bitcoin golden cross (50 > 200 days)',
         ('TOP20', 'Swing 3×ATR + BTC above 50-day avg'): 'Swing breakout · wider 3×ATR stop',
         ('TOP20', 'Swing: 20-day breakout + 2×ATR trail (no filter)'): 'Swing breakout · no Bitcoin filter',
         ('BTC', 'Breakout 55-day high + 3×ATR trailing stop'): 'Bitcoin 55-day breakout + trailing stop',
         ('BTC', 'Breakout 20-day high + 2×ATR trailing stop'): 'Bitcoin 20-day breakout + trailing stop',
         ('BTC', 'Buy & hold Bitcoin'): 'Buy and hold Bitcoin',
         ('TOP20', 'COMBO: 50% BTC above 100-day + 50% swing (filter)'): '50% Bitcoin trend + 50% swing',
         ('TOP20', 'Momentum: top-5 by 14-day return weekly, BTC>50-day'): 'Momentum: 5 strongest coins weekly',
         ('TOP20', 'Momentum: top-5 by 60-day return weekly, BTC>50-day'): 'Momentum: 5 strongest coins (60 days)',
         ('TOP20', 'Hold top-20 coins equally (monthly rebalance)'): 'Hold the top-20 coins'}
for (gk, k), n in names.items():
    v = cl[gk][k]; r = v['per_period_%/yr'].get('2022-Nov 2026'); crow.append((n, v['per_year_%'], v['worst_drop_%'], pc(r), verdict(n, r, v['worst_drop_%'], False, r)))   # crypto judged on 2022–2026
crow = [crow[0]] + sorted(crow[1:], key=lambda x: -((float(x[3].rstrip('%')) if x[3] != '–' else -99) / max(10, abs(x[2]))))
qrow = [(re.sub(r'^[A-F] ', '', k), v['2022-Nov 2026']['cagr'], v['2022-Nov 2026']['maxdd'], f"{v['trades_2022+']} trades", '✅ chosen' if k.startswith('C ') else verdict(k, v['2022-Nov 2026']['cagr'], v['2022-Nov 2026']['maxdd'])) for k, v in qf.items()]
qrow.sort(key=lambda x: -x[1])
note(f'{T}/Crypto', '1 Crypto plan', ['crypto', 'core', 'strategy'], '''**Crypto plan — swing + Bitcoin trend**
- 30% of the total plan (21% swing + 9% Bitcoin trend) · Binance fees

**Swing (70% of crypto)**
- Watch the 20 most-traded coins on Binance
- Buy when a coin closes above its highest close of the last 20 days (breakout)
- Only when Bitcoin is above its 50-day average (tested: more profit, fewer bad trades)
- Stop 2×ATR below; it trails up as the price rises; risk 0.5% of the book per trade; at most 8 coins

**Bitcoin trend (30% of crypto)**
- Hold Bitcoin only while it closes above its 100-day average; otherwise cash
- Size so the swings stay near 40% a year

**What Max does not do (tested, failed recently)**
- Momentum (buying the strongest coins weekly) — lost money 2022–2026
- Holding many coins — the top-20 lost about 10% a year 2022–2026
- Day trading Bitcoin — loses with normal spot fees

**Tested**
- ''' + f'70/30 mix: {best["cagr"]}% a year all years · {best["periods"][2][1]}% a year 2022–2026 · worst drop {best["dd"]}%' + '''
- Bitcoin only exists since 2009 (prices from Jul 2010); coins from 2013''')
note(f'{T}/Crypto', '2 Crypto strategies ranked', ['crypto', 'strategy'], '''**Crypto strategies ranked (best → worst, judged mainly on 2022–2026)**
- Early years show huge numbers (Bitcoin $0.30 → $126,000), so 2022–2026 matters most
- Fees: 0.30% per trade before 2017, 0.15% after

''' + table(crow, '2022–26') + '''

**Trade only the best chances? (all Binance coins, 2022 → Nov 2026)**
''' + table(qrow, 'Trades') + '''

**Summary**
- Swing with the Bitcoin filter made money in every period with the smallest drop
- Adding 30% Bitcoin trend helped a little and catches Bitcoin bull runs''')
note(f'{T}/Crypto', '3 Bitcoin monthly prices 2010-2026', ['crypto', 'btc'], '**Bitcoin month-end prices (USD)**\n' + strip_title(old('Crypto/Bitcoin monthly closes 2010-2026.md')))
note(f'{T}/Crypto', '4 Binance coins A-L', ['crypto', 'binance'], '**All Binance coins (A–L)**\n' + strip_title(old('Crypto/Binance coins list A-L.md')))
note(f'{T}/Crypto', '5 Binance coins M-Z', ['crypto', 'binance'], '**All Binance coins (M–Z)**\n' + strip_title(old('Crypto/Binance coins list M-Z.md')))

# ---------------------------------------------------------------- Forex and Gold
fl = J('2026-11-09-fx-copy-long-results.json')
frow = sorted([(k, v['per_year_%'], v['worst_drop_%'], ' / '.join(f'{x:+.1f}' for x in v['periods_%/yr'].values()), '— benchmark' if k.startswith('Hold all') else verdict(k, v['per_year_%'], v['worst_drop_%'])) for k, v in fl['FX'].items()], key=lambda r: -r[1])
G = fl['GOLD']['Hold gold']
note(f'{T}/Forex and Gold', '1 Forex and gold plan', ['forex', 'gold', 'core', 'strategy'], '''**Forex and gold plan**

**Forex — watch only**
- 26 years of tests (2000–2026, 10 currencies, interest included): no strategy kept a profit
- Results between −1.9% and +0.8% a year, and they flip between periods
- Forex makes money only with leverage, which multiplies losses too → not used
- A watch-only paper book (fade big traders) keeps running to confirm

**Gold trend — 30% of the total plan**
- Hold gold only while it closes above its 200-day average; otherwise cash
- Size so the swings stay near 12% a year
- ''' + f'Holding gold 2000–2026: {G["per_year_%"]}% a year, worst drop {G["worst_drop_%"]}%' + '''
- With the trend rule: about 6.3% a year, worst drop −34% — smaller drops, and it moves differently from stocks and crypto''')
note(f'{T}/Forex and Gold', '2 Forex strategies ranked', ['forex', 'strategy'], '''**Forex strategies ranked (2000 → Oct 2026)**
- Columns "2000-08 / 2009-16 / 2017-26" = per year in each period
- No leverage · interest gap included · 0.03% per trade

''' + table(frow, '2000-08 / 2009-16 / 2017-26') + '''

**Summary**
- None earns money over the long run → forex is watch only''')
note(f'{T}/Forex and Gold', '3 Gold by year 2000-2026', ['gold'], '**Gold by year (USD per ounce)**\n' + strip_title(old('Forex/Gold 2000-2026.md')))

# ---------------------------------------------------------------- Copy trading
hl = J('2026-11-08-copytrading-hl-results.json')
hrow = sorted([(k.replace('Copy ', 'Copy ').replace('by r30', 'best last 30 days').replace('by r90', 'best last 90 days').replace('by r180', 'best last 180 days').replace('by pnl90', 'biggest profit 90 days').replace('by sharpe6', 'smoothest 6 months'),
                v['per_year_%'], v['max_drop_%'], f"{v['win_months_%']}% green months", '❌ avoid' if v['per_year_%'] <= 0 else ('⚠️ short record' if 'steady' in k else verdict(k, v['per_year_%'], v['max_drop_%']))) for k, v in hl.items() if not k.startswith('_') and v], key=lambda r: -r[1])
crow2 = sorted([(k, v['per_year_%'], v['worst_drop_%'], ' / '.join(f'{x:+.1f}' for x in v['periods_%/yr'].values()), verdict(k, v['per_year_%'], v['worst_drop_%'])) for k, v in {**fl['COPY'], **{k: v for k, v in fl['GOLD'].items() if k != 'Hold gold'}}.items()], key=lambda r: -r[1])
note(f'{T}/Copy trading', '1 Copy trading verdict', ['copy-trading', 'core', 'strategy'], f'''**Copy trading — verdict: watch only**
- Real copy-trader records exist only on Hyperliquid (the exchange Invo copies), from 2023
- For 20+ years: tested copying or opposing big traders through CFTC weekly positions (1998–2026) → no lasting edge

**What the tests showed**
- Median trader month: {hl["_median_trader_month_%"]}% · only {hl["_share_of_traders_positive_month_%"]}% of trader-months were positive
- Copying the "hottest" traders (best last 30–90 days, what app leaderboards show) lost 45–97%
- Copying "steady" traders made money, but the record is only about 3 years and biased toward survivors

**Max's rule**
- Paper only, small, steady traders with long low-turnover records; never leverage
- Two watch-only paper books run live: copy steady traders, copy hot traders''')
note(f'{T}/Copy trading', '2 Copy strategies ranked', ['copy-trading', 'strategy'], '''**Copy strategies ranked**

**Hyperliquid traders (Mar 2023 → Oct 2026)**
''' + table(hrow, 'Green months') + '''

**Copy or oppose big traders via CFTC (2000 → Oct 2026)**
- Columns = per year in 2000-08 / 2009-16 / 2017-26
''' + table(crow2, '2000-08 / 2009-16 / 2017-26'))
note(f'{T}/Copy trading', '3 Platforms', ['copy-trading', 'platforms'], '**Copy trading platforms**\n' + strip_title(old('Copy trading/Copy trading platforms.md')))

# ---------------------------------------------------------------- Reference
note(f'{T}/Reference', 'Fees 2026', ['fees'], old('Trading fees 2026.md'))
ev = old('Market events 2003-2026 (PH and global).md')
lines = [l for l in ev.splitlines() if re.match(r'- \d{4}-', l)]; src = ev[ev.index('**Sources**'):]
by = {}
for l in lines:
    m = re.match(r'- (\d{4})-(\d\d)-(\d\d) \[(\w+)\] (.*?) → next 30 days: (.*)', l)
    if m: by.setdefault(m.group(1), []).append(f"- {m.group(3)}/{m.group(2)} {'🇵🇭' if m.group(4) == 'PH' else '₿' if m.group(4) == 'Crypto' else '🌍'} {m.group(5)} → 30 days: {m.group(6)}")
evb = '\n\n'.join(f'**{y}**\n' + '\n'.join(v) for y, v in sorted(by.items()))
note(f'{T}/Reference', 'Market events by year 2003-2026', ['events'], '**Market events by year**\n- 🇵🇭 Philippines · 🌍 global · ₿ crypto\n- After each event: how much the PSEi, Bitcoin and gold moved in the next 30 days\n\n' + evb + '\n\n' + src)
# currencies (moved)
for f in sorted(glob.glob(f'{OLD}/Forex/Currencies/*.md')):
    t = os.path.basename(f)[:-3]; nt = t.replace(' vs USD 2000-2026', ' vs US dollar').replace('PHP peso vs USD 2003-2026', 'PHP peso vs US dollar')
    note(f'{T}/Forex and Gold/Currencies', nt, ['forex'], old(f'Forex/Currencies/{t}.md'))

# write vault: new group 1 + unchanged stock and coin folders
shutil.rmtree(NEW, ignore_errors=True)
for p, t in NOTES.items():
    fp = f'{NEW}/{p}'; os.makedirs(os.path.dirname(fp), exist_ok=True); open(fp, 'w').write(t)
z = f'{S}/Max-Trading-1-Overview-plans-and-rankings.zip'
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
    for p, t in NOTES.items(): zf.writestr('Max Trading/' + p, t)
OLD_TITLES = ['00 Trading overview MAX-MASTER-3', 'Copy trading platforms', 'Copy trading strategies best to worst', 'Binance coins list A-L', 'Binance coins list M-Z', 'Bitcoin monthly closes 2010-2026',
              'Crypto strategies best to worst', 'Forex strategies best to worst', 'Gold 2000-2026', 'Market events 2003-2026 (PH and global)', 'PSE dividend history summary',
              'PSE dividend yields now (all paying stocks)', 'PSE market by year 2002-2026', 'PSE strategies best to worst', 'Trading fees 2026'] + [os.path.basename(f)[:-3] for f in glob.glob(f'{OLD}/Forex/Currencies/*.md')]
json.dump(OLD_TITLES, open(f'{S}/old_trading_titles.json', 'w'))
print(len(NOTES), 'notes;', sum(len(t) for t in NOTES.values()), 'chars;', sorted(NOTES)[:40])
