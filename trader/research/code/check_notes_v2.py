# Independent check of Max's trading notes: re-read the raw source files (not the builder's tables) and compare random numbers.
import json, glob, os, re, random, datetime as dt, subprocess
import pandas as pd
S = '/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'; V = f'{S}/MaxTrading3/Trading'
random.seed(7); ok = bad = 0; fails = []
def chk(cond, what):
    global ok, bad
    if cond: ok += 1
    else: bad += 1; fails.append(what)
def num(x): return float(x.replace(',', ''))
def close_enough(a, b, tol=0.006): return abs(a - b) <= tol * max(abs(b), 1e-9) + 0.006   # notes round to 4 significant digits
# 1) PSE year-end closes vs PSE Edge raw files (2015+)
notes = [f for f in glob.glob(f'{V}/PSE/Stocks/*.md') if not os.path.basename(f).startswith('0 ')]
for fn in random.sample(notes, 60):
    sym = os.path.basename(fn)[:-3]; raw = f'{S}/dl/pse/{sym}.json'
    if not os.path.exists(raw): continue
    d = json.load(open(raw)); s = pd.Series({dt.datetime.strptime(r['CHART_DATE'], '%b %d, %Y %H:%M:%S'): float(r['CLOSE']) for r in d})
    s = s[s > 0]
    for line in open(fn).read().splitlines():
        m = re.match(r'- (\d{4})\*?: ₱([\d,.]+) ', line)
        if m and int(m.group(1)) >= 2016:
            y = int(m.group(1)); sy = s[s.index.year == y]
            if len(sy): chk(close_enough(num(m.group(2)), sy.iloc[-1]), f'PSE {sym} {y} close note {m.group(2)} vs Edge {sy.iloc[-1]}')
# 2) dividends in notes vs the PSE report PDF text / PSE Edge list (raw)
pdf_txt = {os.path.basename(f): subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout for f in glob.glob(f'{S}/qd/*.pdf')}
edge = json.load(open(f'{S}/dl/edge_divs.json')); DIRN = {x['sym']: x['name'].lower().strip(' .') for x in json.load(open(f'{S}/dl/pse_dir.json'))}
dn = [f for f in glob.glob(f'{V}/PSE/Dividend/*dividends.md')]
checked = 0
for fn in random.sample(dn, 90):
    sym = os.path.basename(fn).replace(' dividends.md', '')
    items = re.findall(r'^- (\d{2} \w{3} \d{4}): ₱([\d.,e+-]+) (regular|special)(?: \((\w+) ([\d.]+) × ([\d.]+)\))?( · PSE Edge list)?', open(fn).read(), re.M)
    for d_, a_, kind, cur, fa, rate, src in random.sample(items, min(2, len(items))):
        day = dt.datetime.strptime(d_, '%d %b %Y').date(); amt = num(a_)
        if not src:
            keys = {day.strftime('%d-%b-%y'), day.strftime('%d-%b-%y').lstrip('0')}; key = '(?:' + '|'.join(keys) + ')'; amt_s = f'{amt:.10g}'
            hit = any(re.search(rf'\b{re.escape(sym)}\*?\b[^\n]*{key}', txt) and re.search(rf'\b{re.escape(sym)}\*?\b[^\n]*\b0*{re.escape(amt_s)}0*\b', txt) for txt in pdf_txt.values())
            chk(hit, f'DIV {sym} {day} ₱{amt} not found in any PSE report')
        else:
            rows = [r for r in edge if r[0].lower().strip(' .') == DIRN.get(sym) and r[4] == day.strftime('%b %d, %Y').replace(' 0', ' ')] + [r for r in edge if r[0].lower().strip(' .') == DIRN.get(sym) and r[4] == day.strftime('%b %d, %Y')]
            want = float(fa) if cur else amt
            chk(any(abs(float(m_) - want) < 1e-6 for r in rows for m_ in re.findall(r'(\d*\.?\d+)', r[3].replace(',', ''))) or (not cur and any('centavo' in r[3].lower() for r in rows)), f'DIV {sym} {day} {want} not in PSE Edge list rows {[r[3] for r in rows]}')
        checked += 1
# 3) crypto year closes vs Binance raw
cn = [f for f in glob.glob(f'{V}/Crypto/Coins/*.md') if not os.path.basename(f).startswith('0 ')]
for fn in random.sample(cn, 40):
    sym = os.path.basename(fn)[:-3]; raw = f'{S}/dl/bin/{sym}USDT.json'
    if not os.path.exists(raw): continue
    d = json.load(open(raw)); s = pd.Series({pd.Timestamp(r[0], unit='ms'): r[4] for r in d})
    for line in open(fn).read().splitlines():
        m = re.match(r'- (\d{4}): \$([\d,.e+-]+) ', line)
        if m and int(m.group(1)) >= 2019:
            y = int(m.group(1)); sy = s[s.index.year == y]
            if len(sy) > 300 or (y == 2026 and len(sy)): chk(close_enough(num(m.group(2)), sy.iloc[-1], 0.01), f'CRYPTO {sym} {y} note {m.group(2)} vs Binance {sy.iloc[-1]}')
# 4) forex & gold vs raw
import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import universe as U
F = U.fx_all()
for c, nm, inv in [('EUR', 'Euro', False), ('JPY', 'Japan', True), ('GBP', 'United Kingdom', False), ('MXN', 'Mexico', True), ('CHF', 'Switzerland', True)]:
    t = open(f'{V}/Forex/Currency/{c} vs US dollar.md').read(); s = F[nm].dropna(); q = 1 / s if inv else s
    for line in t.splitlines():
        m = re.match(r'- (\d{4}): \S+ close ([\d,.]+) ', line)
        if m:
            y = int(m.group(1)); chk(close_enough(num(m.group(2)), q[q.index.year == y].iloc[-1], 0.002), f'FX {c} {y} {m.group(2)} vs {q[q.index.year==y].iloc[-1]}')
g = json.load(open(f'{S}/fx20/gold.json')); gs = pd.Series(g['c'], index=pd.to_datetime(g['t'], unit='s')).dropna()
for line in open(f'{V}/Forex/Currency/XAU Gold vs US dollar.md').read().splitlines():
    m = re.match(r'- (\d{4}): close \$([\d,.]+)/oz', line)
    if m: y = int(m.group(1)); chk(close_enough(num(m.group(2)), gs[gs.index.year == y].iloc[-1]), f'GOLD {y}')
# 5) PSEi year-end vs archive
p = json.load(open(f'{S}/data/pse/json/PSEI.json')); ps = pd.Series(p['c'], index=pd.to_datetime(p['t'], unit='s'))
for line in open(f'{V}/PSE/Stocks/0 PSEi index by year 2002-2026.md').read().splitlines():
    m = re.match(r'- (\d{4}).*?PSEi ([\d,.]+)', line)
    if m and int(m.group(1)) <= 2020: y = int(m.group(1)); chk(close_enough(num(m.group(2)), ps[ps.index.year == y].iloc[-1]), f'PSEi {y}')
# 6) strategy tables vs result files
pl = json.load(open('/home/claude/max-mobile/trader/research/2026-11-09-pse-long-results-2.json'))
t = open(f'{V}/PSE/Strategy/2 PSE strategies ranked.md').read() + open(f'{V}/PSE/Strategy/Dividend top-20 (all versions).md').read()
chk(f"per year {pl['DJ buffer top-40 + trailing stop 25%']['per_year_%']}%" in t and f"{pl['DJ buffer top-40 + trailing stop 25%']['worst_drop_%']}%" in t, 'PSE chosen strategy number')
# 7) traders: account value / all-time profit vs the raw leaderboard; month count vs raw history
lb = {r['ethAddress'].lower(): r for r in json.load(open(f'{S}/dl/hl/leaderboard.json'))['leaderboardRows']}
for fn in random.sample([f for f in glob.glob(f'{V}/Copy trading/Traders/Trader *.md')], 25):
    t = open(fn).read(); a = re.search(r'Address: (0x[0-9a-f]+)', t).group(1); L = lb[a]; wp = dict(L['windowPerformances'])
    m = re.search(r'all-time profit (−?)\$([\d.]+)([KMB]?)', t); v = float(m.group(2)) * {'': 1, 'K': 1e3, 'M': 1e6, 'B': 1e9}[m.group(3)] * (-1 if m.group(1) else 1)
    chk(abs(v - float(wp['allTime']['pnl'])) <= 0.051 * abs(float(wp['allTime']['pnl'])) + 1000, f'TRADER {a} pnl {v} vs {wp["allTime"]["pnl"]}')
print(f'checked {ok + bad}: {ok} correct, {bad} wrong'); [print(' -', f) for f in fails[:40]]
pass
json.dump({'checked': ok + bad, 'correct': ok, 'wrong': bad, 'fails': fails}, open(f'{S}/notes_check_v2.json', 'w'), indent=1)
