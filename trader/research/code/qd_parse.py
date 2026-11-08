# Parse PSE Quarterly Dividend Reports (4Q2013 → 1Q2022): every cash dividend with ex-date. '*' = special dividend.
import re, glob, subprocess, json, datetime as dt
S='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad'
pat=re.compile(r'(?<![A-Za-z0-9])([A-Z][A-Z0-9]{1,6})(\*?)\s+([\d,]*\.?\d+)\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})\s+(\d{1,2}-[A-Z][a-z]{2}-\d{2})')
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
        for k in [k for k in ev if k[0]==code and k[2]==a and abs((dt.date.fromisoformat(k[1])-exd).days)<=10]: del ev[k]
        ev[(code,str(exd),a)]={'sym':code,'ex':str(exd),'amt':a,'special':sp=='*'}; n+=1
    print(f.split('/')[-1],n)
E=sorted(ev.values(),key=lambda x:(x['ex'],x['sym']))
json.dump(E,open(f'{S}/qd/dividends_2013_2022.json','w'))
print('events',len(E),E[0]['ex'],E[-1]['ex'],'stocks',len({e['sym'] for e in E}))
print([e for e in E if e['sym']=='BDO'][:8])
