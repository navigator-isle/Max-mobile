# Compact snapshot of the paper-trading state for Max's home screen (sent inside the Sunday email, read by Max's server).
# Usage: python3 snapshot.py state.json > snapshot.json      (prints the base64 block with --block)
import json, sys, base64, datetime as dt
PLAN = {"pse_dividend": 0.40, "crypto_swing": 0.21, "btc_trend": 0.09, "gold_trend": 0.30}
KIND = {"pse_dividend": "pse", "crypto_swing": "crypto", "crypto_momentum": "crypto", "btc_trend": "crypto", "gold_trend": "gold"}
def snap(S):
    books = []
    for k, B in S["books"].items():
        v = B["hist"][-1][1] if B.get("hist") else B.get("equity", B.get("start"))
        pos = []
        for p in B.get("positions", []):
            if "addr" in p: pos.append({"sym": "trader " + p["addr"][:8] + "…", "kind": "copy", "chg": round(p.get("last_r", 0) * 100, 2)})
            elif "shares" in p: pos.append({"sym": p["sym"], "kind": "pse", "qty": p["shares"], "ep": round(p["ep"], 6), "entry": p["entry"], "hi": round(p.get("hi", p["ep"]), 6), "divs": round(p.get("divs", 0), 2)})
            else: pos.append({"sym": p["sym"], "kind": KIND.get(k, "crypto"), "qty": p["qty"], "ep": round(p["ep"], 8), "entry": p["entry"], "stop": round(p.get("stop", 0), 8)})
        pend = [{"sym": o.get("sym", ""), "side": o.get("side", ""), "amount": o.get("php"), "why": str(o.get("why", ""))[:140]} for o in B.get("pending", []) if o.get("sym")]
        tr = [{"sym": t["sym"], "entry": t.get("entry"), "exit": t.get("exit"), "ep": t.get("ep"), "xp": t.get("xp"), "pnl": t.get("pnl"), "reason": str(t.get("reason", ""))[:120]} for t in B.get("trades", [])[-8:]]
        books.append({"key": k, "name": B["name"], "status": B["status"], "weight": PLAN.get(k, 0) if B["status"] == "main" else 0, "ccy": B["ccy"], "start": round(B["start"], 2),
                      "cash": round(B.get("cash", 0), 2), "value": round(v, 2), "since": round((v / B["start"] - 1) * 100, 2), "positions": pos, "pending": pend[:25], "trades": tr,
                      "closed": len(B.get("trades", [])), "wins": sum(1 for t in B.get("trades", []) if t.get("pnl", 0) > 0), "nextRebalance": B.get("next_rebalance")})
    for k in PLAN:   # MAX-MASTER-3 books that open at the next run
        if k not in S["books"]: books.append({"key": k, "name": {"btc_trend": "Bitcoin trend (above 100-day avg)", "gold_trend": "Gold trend (above 200-day avg)"}.get(k, k), "status": "main", "weight": PLAN[k], "ccy": "USDT", "start": None, "cash": None, "value": None, "since": 0, "positions": [], "pending": [], "trades": [], "closed": 0, "wins": 0, "note": "opens at the next Sunday run"})
    sm = S.get("summary", {})
    return {"v": 1, "asOf": S.get("last_run"), "opened": S.get("opened"), "weeks": sm.get("weeks"), "usdphp": sm.get("bench", {}).get("usdphp"), "plan": PLAN,
            "combinedSince": round(sum(PLAN[b["key"]] * (b["since"] or 0) for b in books if b["key"] in PLAN), 2), "bench": sm.get("bench", {}),
            "events": [f"{e.get('date') or e.get('run')} {e['book']}: {e['kind']} — {e['text'][:160]}" for e in S.get("events", [])[-12:]], "books": books}
if __name__ == "__main__":
    d = json.load(open(sys.argv[1])); S = json.loads(d["state"]) if isinstance(d.get("state"), str) else d.get("state", d)
    out = snap(S)
    if "--block" in sys.argv: print("MAX-PAPER-DATA-BEGIN " + base64.b64encode(json.dumps(out, separators=(",", ":")).encode()).decode() + " MAX-PAPER-DATA-END")
    else: print(json.dumps(out, ensure_ascii=False, indent=1))
