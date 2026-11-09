# Converts Max's core trading notes (vault group 1, minus the two long Binance lists) into server seed notes (HTML), and writes the memory facts.
import glob, os, json, re, html
S='/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/MaxTrading'
def inline(t):
    t=html.escape(t,quote=False); t=re.sub(r'\*\*(.+?)\*\*',r'<b>\1</b>',t); t=re.sub(r'(https?://[^\s<·)]+)',r'<a href="\1">\1</a>',t); return t
def md2html(md):
    out=[]; lines=md.split('\n'); i=0
    while i<len(lines):
        l=lines[i]
        if not l.strip(): i+=1; continue
        if re.match(r'^\s*\|.*\|\s*$',l):
            rows=[]
            while i<len(lines) and re.match(r'^\s*\|.*\|\s*$',lines[i]): rows.append(lines[i]); i+=1
            cells=lambda r:[c.strip() for c in r.strip().strip('|').split('|')]
            body=[r for r in rows if not re.match(r'^\s*\|?\s*:?-{2,}',r)]
            out.append('<table>'+''.join('<tr>'+''.join((f'<th>{inline(c)}</th>' if k==0 else f'<td>{inline(c)}</td>') for c in cells(r))+'</tr>' for k,r in enumerate(body))+'</table>'); continue
        if re.match(r'^\s*-\s+',l):
            items=[]
            while i<len(lines) and re.match(r'^\s*-\s+',lines[i]): items.append(re.sub(r'^\s*-\s+','',lines[i])); i+=1
            out.append('<ul>'+''.join(f'<li>{inline(x)}</li>' for x in items)+'</ul>'); continue
        out.append(f'<p>{inline(l.strip())}</p>'); i+=1
    return ''.join(out)
seeds=[]
for f in sorted(glob.glob(f'{S}/Trading/**/*.md',recursive=True)):
    rel=os.path.relpath(f,S); parts=rel.split('/')
    if 'PSE stocks' in parts or 'Crypto coins' in parts or 'Binance coins list' in parts[-1]: continue
    t=open(f).read(); fm=re.match(r'^---\ntags: \[(.*?)\]\n---\n',t); tags=[x.strip() for x in fm.group(1).split(',')] if fm else []; body=t[fm.end():] if fm else t
    title=parts[-1][:-3]; cat=' › '.join(parts[:-1])
    if re.search(r'overview|best to worst',title,re.I): tags=tags+['core']
    sid='note-trading-'+re.sub(r'[^a-z0-9]+','-',title.lower()).strip('-')[:40]
    seeds.append({'id':sid,'v':1,'title':title,'category':cat,'tags':list(dict.fromkeys(tags))[:10],'body':md2html(body.strip())})
json.dump(seeds,open(f'{S}/../seed_trading.json','w'),ensure_ascii=False)
print(len(seeds),sum(len(s['body']) for s in seeds),[s['title'] for s in seeds][:30])
