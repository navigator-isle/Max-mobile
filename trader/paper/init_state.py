import json,datetime as dt
from engine import new_book
S={"name":"MAX-MASTER-2 paper trading","opened":"2026-11-08","books":{}}
spec=[("crypto_swing","Crypto swing breakout + 2×ATR trail","main",0.30,"USDT"),("pse_dividend","PSE high-dividend top-20","main",0.30,"PHP"),
      ("fx_cot","Forex: fade big traders (CFTC)","main",0.25,"PHP"),("copy_steady","Copy steady traders (Hyperliquid)","main",0.15,"PHP"),
      ("crypto_momentum","Crypto momentum rotation (rejected — watch only)","watch",0,"USDT"),("copy_hot","Copy hot traders (rejected — watch only)","watch",0,"PHP")]
for k,n,st,w,c in spec:
    b=new_book(n,c, 100000/63.03 if c=="USDT" else 100000.0); b.update(status=st,weight=w,opened=S["opened"]); b["last_day"]="2026-11-06"; S["books"][k]=b
S["books"]["pse_dividend"]["last_day"]="2026-11-06"; S["books"]["fx_cot"]["last_day"]="2026-11-06"
json.dump(S,open("/tmp/claude-0/-home-claude/475bc296-85da-513e-85af-0f446c7ae090/scratchpad/paper_state.json","w"),indent=1)
