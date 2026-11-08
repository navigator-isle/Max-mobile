# Independent check of Max's trading notes: re-read the raw source files (not the builder's tables) and compare random numbers.
import json, glob, os, re, random, datetime as dt, subprocess
import pandas as pd
S = '/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'; V = f'{S}/MaxTrading/Trading'
random.seed(7); ok = bad = 0; fails = []
def chk(cond, what):
    global ok, bad
    if cond: ok += 1
    else: bad += 1; fails.append(what)
def num(x): return float(x.replace(',', ''))
def close_enough(a, b, tol=0.006): return abs(a - b) <= tol * max(abs(b), 1e-9) + 0.006   # notes round to 4 significant digits
# 1) PSE year-end closes vs PSE Edge raw files (2015+)
notes = glob.glob(f'{V}/PSE/PSE stocks/*/*.md')
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
# 2) dividends in notes vs the PSE report PDF text / PSE Edge list
pdf_txt = {os.path.basename(f): subprocess.run(['pdftotext', '-layout', f, '-'], capture_output=True, text=True).stdout for f in glob.glob(f'{S}/qd/*.pdf')}
edge = json.load(open(f'{S}/dl/edge_divs.json'))
checked = 0
for fn in random.sample(notes, 120):
    sym = os.path.basename(fn)[:-3]; t = open(fn).read()
    for line in t.splitlines():
        m = re.match(r'- (\d{4})\*?: .* div ₱[\d,.]+ \([\d.]+%\): (.*)$', line)
        if not m or checked >= 80: continue
        y = int(m.group(1))
        for item in m.group(2).split(', ')[:2]:
            mm = re.match(r'(\d{2})([A-Z][a-z]{2}) ([\d.,]+)', item)
            if not mm: continue
            day = dt.datetime.strptime(f'{mm.group(1)}{mm.group(2)}{y}', '%d%b%Y').date(); amt = num(mm.group(3))
            if day < dt.date(2025, 10, 1):
                key = day.strftime('%d-%b-%y'); hit = any(re.search(rf'\b{re.escape(sym)}\*?\s+[\d,]*\.?\d*\s+\S+\s+{key}', txt) and f'{amt:g}' in txt for txt in pdf_txt.values())
                hit = hit or any(re.search(rf'\b{re.escape(sym)}\*?\s+0*{re.escape(f"{amt:g}")}0*\s+\d{{1,2}}-[A-Z][a-z]{{2}}-\d{{2}}\s+{key}', txt) for txt in pdf_txt.values())
                chk(hit, f'DIV {sym} {day} ₱{amt} not found in any PSE report')
            else:
                hit = any(day.strftime('%b %d, %Y') == r[4] for r in edge if sym in r[0] or True and r[1].upper() == 'COMMON')
                chk(hit, f'DIV {sym} {day} not found in PSE Edge list')
            checked += 1
# 3) crypto year closes vs Binance raw
cn = glob.glob(f'{V}/Crypto/Crypto coins/*.md')
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
    t = open(f'{V}/Forex/Currencies/{c} vs USD 2000-2026.md').read(); s = F[nm].dropna(); q = 1 / s if inv else s
    for line in t.splitlines():
        m = re.match(r'- (\d{4}): \S+ close ([\d,.]+) ', line)
        if m:
            y = int(m.group(1)); chk(close_enough(num(m.group(2)), q[q.index.year == y].iloc[-1], 0.002), f'FX {c} {y} {m.group(2)} vs {q[q.index.year==y].iloc[-1]}')
g = json.load(open(f'{S}/fx20/gold.json')); gs = pd.Series(g['c'], index=pd.to_datetime(g['t'], unit='s')).dropna()
for line in open(f'{V}/Forex/Gold 2000-2026.md').read().splitlines():
    m = re.match(r'- (\d{4}): close \$([\d,.]+)/oz', line)
    if m: y = int(m.group(1)); chk(close_enough(num(m.group(2)), gs[gs.index.year == y].iloc[-1]), f'GOLD {y}')
# 5) PSEi year-end vs archive
p = json.load(open(f'{S}/data/pse/json/PSEI.json')); ps = pd.Series(p['c'], index=pd.to_datetime(p['t'], unit='s'))
for line in open(f'{V}/PSE/PSE market by year 2002-2026.md').read().splitlines():
    m = re.match(r'- (\d{4}).*?PSEi ([\d,.]+)', line)
    if m and int(m.group(1)) <= 2020: y = int(m.group(1)); chk(close_enough(num(m.group(2)), ps[ps.index.year == y].iloc[-1]), f'PSEi {y}')
# 6) strategy tables vs result files
pl = json.load(open('/home/claude/max-mobile/trader/research/2026-11-09-pse-long-results-2.json'))
t = open(f'{V}/PSE/PSE strategies best to worst.md').read()
chk(f"{pl['DJ buffer top-40 + trailing stop 25%']['per_year_%']}%/yr" in t, 'PSE chosen strategy number')
print(f'checked {ok + bad}: {ok} correct, {bad} wrong'); [print(' -', f) for f in fails[:40]]
json.dump({'checked': ok + bad, 'correct': ok, 'wrong': bad, 'fails': fails}, open(f'{S}/notes_check.json', 'w'), indent=1)
