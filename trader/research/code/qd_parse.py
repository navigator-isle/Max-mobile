# Parse PSE Quarterly Dividend Reports (4Q2013 → 1Q2022): every cash dividend with ex-date. '*' = special dividend.
import re, glob, subprocess, json, datetime as dt
S='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'
pat=re.compile(r'(?<![A-Za-z0-9])([A-Z][A-Z0-9]{1,6})(\*?)\s+([\d,]*\.?\d+)\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})\s+(?:Circ|C\d{4,})')   # only the declaration table (it carries PSE's circular number)
ev={}
order=lambda f:(int(f.split('/')[-1][2:6]),int(f.split('/')[-1][0]))
for f in sorted(glob.glob(f'{S}/qd/*.pdf'),key=order):
    t=subprocess.run(['pdftotext','-layout',f,'-'],capture_output=True,text=True).stdout
    n=0
    for m in pat.finditer(t):
        code,sp,amt,decl,ex=m.groups()
        if code in ('Total','TOTAL'): continue
        try: exd=dt.datetime.strptime(ex,'%d-%b-%y').date(); a=float(amt.replace(',',''))
        except Exception: continue
        # same stock + same amount within 10 days = the same dividend listed again (later report wins: corrections)
        for k in [k for k in ev if k[0]==code and abs(k[2]-a)<=0.03*max(a,k[2]) and abs((dt.date.fromisoformat(k[1])-exd).days)<=10]: del ev[k]
        ev[(code,str(exd),a)]={'sym':code,'ex':str(exd),'amt':a,'special':sp=='*'}; n+=1
    print(f.split('/')[-1],n)
E=sorted(ev.values(),key=lambda x:(x['ex'],x['sym']))
# PSE Edge list (real peso amounts) for ex-dates from Oct 2025; USD/CAD dividends converted at that day's rate (Yahoo Finance)
import pandas as pd, urllib.request
FXR={}
for c_,y_ in (('USD','PHP=X'),('CAD','CADPHP=X')):
    try:
        r_=json.load(urllib.request.urlopen(urllib.request.Request(f'https://query1.finance.yahoo.com/v8/finance/chart/{y_}?range=5y&interval=1d',headers={'User-Agent':'Mozilla/5.0'}),timeout=60))['chart']['result'][0]
        FXR[c_]=pd.Series(r_['indicators']['quote'][0]['close'],index=pd.to_datetime(r_['timestamp'],unit='s').normalize()).dropna()
    except Exception as e: print('fx',c_,e)
D_=json.load(open(f'{S}/dl/pse_dir.json')); byname={x['name'].lower().strip(' .'):x['sym'] for x in D_}
try:
    for r in json.load(open('/tmp/edge_divs.json')):
        if r[1].upper()!='COMMON' or r[2].lower()!='cash': continue
        txt=r[3]; m=re.search(r'([\d]*\.?[\d]+)',txt.replace(',',''))
        cur='USD' if ('$' in txt or 'USD' in txt.upper() or txt.upper().startswith('US')) else ('CAD' if 'CAD' in txt.upper() else 'PHP')
        try: exd=dt.datetime.strptime(r[4],'%b %d, %Y').date()
        except Exception: continue
        sym=byname.get(r[0].lower().strip(' .'))
        if not m or not sym or str(exd)<'2025-10-01': continue
        amt=float(m.group(1)); note=''
        if cur!='PHP':
            rate=FXR[cur].asof(pd.Timestamp(exd)) if cur in FXR else None
            if rate is None or rate!=rate: continue
            note=f'{cur} {amt:g} × {rate:.3f}'; amt=round(amt*rate,4)
        E.append({'sym':sym,'ex':str(exd),'amt':amt,'special':'special' in txt.lower(),'src':'PSE Edge','note':note})
except FileNotFoundError: print('no edge list')
E=sorted({(e['sym'],e['ex'],e['amt']):e for e in E}.values(),key=lambda x:(x['ex'],x['sym']))
E=[e for e in E if e['ex']<'2025-10-01' or e.get('src')=='PSE Edge']
json.dump(E,open(f'{S}/qd/dividends_2013_2026.json','w'))
print('events',len(E),E[0]['ex'],E[-1]['ex'],'stocks',len({e['sym'] for e in E}))
print([e for e in E if e['sym']=='BDO'][:8])
