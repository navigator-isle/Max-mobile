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
        # …except when the later report only ROUNDS the same amount (17.1657 → 17.17): then the more exact earlier figure stays
        dec=lambda x:len(x.split('.')[1]) if '.' in x else 0; dA=dec(amt.replace(',',''))
        dup=[k for k in ev if k[0]==code and abs(k[2]-a)<=0.03*max(a,k[2]) and abs((dt.date.fromisoformat(k[1])-exd).days)<=10]
        if any(ev[k].get('_dec',0)>dA and abs(round(k[2],dA)-a)<1e-9 for k in dup): continue
        for k in dup: del ev[k]
        ev[(code,str(exd),a)]={'sym':code,'ex':str(exd),'amt':a,'special':sp=='*','_dec':dA}; n+=1
    print(f.split('/')[-1],n)
E=sorted(({k_:v_ for k_,v_ in e.items() if k_!='_dec'} for e in ev.values()),key=lambda x:(x['ex'],x['sym']))
# PSE Edge list (real peso amounts) for ex-dates from Oct 2025; USD/CAD dividends converted at that day's rate (Yahoo Finance)
import pandas as pd, urllib.request
FXR={}
for c_ in ('USD','CAD'):   # ECB reference rates via Frankfurter (Yahoo's CAD/PHP history came back empty)
    try:
        r_=json.load(urllib.request.urlopen(urllib.request.Request(f'https://api.frankfurter.dev/v1/2025-01-01..?base={c_}&symbols=PHP',headers={'User-Agent':'Mozilla/5.0'}),timeout=60))
        FXR[c_]=pd.Series({pd.Timestamp(k):v['PHP'] for k,v in r_['rates'].items()}).sort_index()
    except Exception as e: print('fx',c_,e)
D_=json.load(open(f'{S}/dl/pse_dir.json')); byname={x['name'].lower().strip(' .'):x['sym'] for x in D_}
try:
    for r in json.load(open(f'{S}/dl/edge_divs.json')):
        if r[1].upper()!='COMMON' or r[2].lower()!='cash': continue
        txt=r[3].replace(',','')
        m=re.search(r'(?:php|p|₱|\$|usd|us\$|cad)\s*([\d]*\.?[\d]+)',txt,re.I) or (None if '%' in txt or '/100' in txt else re.search(r'([\d]*\.?[\d]+)',txt))
        if not m:   # amounts written in words, e.g. "Thirty Centavos"
            W={'one':1,'two':2,'three':3,'four':4,'five':5,'six':6,'seven':7,'eight':8,'nine':9,'ten':10,'eleven':11,'twelve':12,'thirteen':13,'fourteen':14,'fifteen':15,'sixteen':16,'seventeen':17,'eighteen':18,'nineteen':19,'twenty':20,'thirty':30,'forty':40,'fifty':50,'sixty':60,'seventy':70,'eighty':80,'ninety':90}
            wm=re.fullmatch(r'\s*((?:[a-z]+[\s-]*)+)centavos?\s*(per share)?\s*',txt.lower())
            if wm and all(w in W for w in re.findall(r'[a-z]+',wm.group(1))):
                m=re.match(r'(.*)',f"{sum(W[w] for w in re.findall(r'[a-z]+',wm.group(1)))/100:g}")
        cur='CAD' if ('CAD' in txt.upper() or 'C$' in txt.upper()) else ('USD' if ('$' in txt or 'USD' in txt.upper() or txt.upper().startswith('US')) else 'PHP')
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
