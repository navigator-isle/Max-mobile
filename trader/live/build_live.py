# Weekly data job for Max's paper trading (runs on GitHub Actions, writes small JSON files that Max's server reads).
#  1) fx-rates.json   — 3-month interest rates per currency (OECD via FRED) for the forex carry book
#  2) copy-steady.json — the 10 "steady" Hyperliquid traders to paper-copy (rule tested in trader/research, 8 Nov 2026):
#     ≥4 of the last 6 months green, last 90 days positive, account ≥ $100k, ranked by return/volatility of the last 6 months.
# Paper trading only. Nothing here places an order.
import json, sys, time, datetime as dt, urllib.request, urllib.error, csv, io, statistics as st
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
UA = {"User-Agent": "Max-paper-trader/1.0 (github.com/navigator-isle/Max-mobile)"}
def get(url, data=None, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=json.dumps(data).encode() if data is not None else None, headers={**UA, **({"Content-Type": "application/json"} if data is not None else {})})
            with urllib.request.urlopen(req, timeout=120) as r: return r.read()
        except Exception as e:
            if i == tries - 1: raise
            time.sleep(3 * (i + 1))
now = dt.datetime.now(dt.timezone.utc)
# ---------- 1) interest rates ----------
FRED = {"USD": "US", "EUR": "EZ", "JPY": "JP", "GBP": "GB", "CHF": "CH", "CAD": "CA", "AUD": "AU", "NZD": "NZ", "MXN": "MX", "ZAR": "ZA"}
rates, src = {}, {}
for ccy, cc in FRED.items():
    sid = f"IR3TIB01{cc}M156N"
    try:
        rows = list(csv.reader(io.StringIO(get(f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={sid}").decode())))[1:]
        vals = [(d, float(v)) for d, v in rows if v not in (".", "")]
        if vals: rates[ccy] = {"rate": vals[-1][1], "month": vals[-1][0][:7]}; src[ccy] = sid
    except Exception as e:
        print("rate failed", ccy, e)
json.dump({"asOf": now.strftime("%Y-%m-%d"), "source": "OECD 3-month interbank rates via FRED (fred.stlouisfed.org), series " + ", ".join(src.values()), "rates": rates}, open(f"{OUT}/fx-rates.json", "w"), indent=1)
print("rates", {k: v["rate"] for k, v in rates.items()})
# ---------- 2) steady traders ----------
lb = json.loads(get("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard"))["leaderboardRows"]
def perf(r, w):
    for k, v in r["windowPerformances"]:
        if k == w: return v
    return {}
cand = []
for r in lb:
    av = float(r["accountValue"] or 0); m = perf(r, "month"); a = perf(r, "allTime")
    if av < 100_000 or float(a.get("vlm") or 0) < 20_000_000: continue
    if float(m.get("pnl") or 0) <= 0 or float(a.get("pnl") or 0) <= 0: continue
    if float(m.get("vlm") or 0) > av * 300: continue          # turnover >300× a month looks like a market maker (can't be copied)
    cand.append((float(a.get("vlm") or 0), r["ethAddress"], av))
cand = [c for c in sorted(cand, reverse=True)[:400]]
print("candidates", len(cand))
def month_ends(n):
    out, d = [], now.date().replace(day=1) - dt.timedelta(days=1)
    for _ in range(n): out.append(dt.datetime(d.year, d.month, d.day, 23, 59, tzinfo=dt.timezone.utc)); d = d.replace(day=1) - dt.timedelta(days=1)
    return sorted(out)
ME = month_ends(7) + [now]
def at(series, t):
    ms = t.timestamp() * 1000; v = None
    for x, y in series:
        if x <= ms: v = y
        else: break
    return v
picked = []
for i, (vlm, addr, av) in enumerate(cand):
    try: p = json.loads(get("https://api.hyperliquid.xyz/info", {"type": "portfolio", "user": addr}))
    except Exception as e: print("portfolio failed", addr, e); continue
    W = dict(p) if isinstance(p, list) else {}
    al = W.get("allTime") or {}
    pn = [(int(t), float(v)) for t, v in al.get("pnlHistory") or []]; avh = [(int(t), float(v)) for t, v in al.get("accountValueHistory") or []]
    if len(pn) < 5 or pn[0][0] > ME[0].timestamp() * 1000: continue           # needs 7 months of history
    rets = []
    for a, b in zip(ME[:-1], ME[1:]):
        p0, p1, v0, v1 = at(pn, a), at(pn, b), at(avh, a), at(avh, b)
        if p0 is None or p1 is None or not v0: rets.append(None); continue
        dp = p1 - p0; cap = max(v0, (v1 or 0) - dp); rets.append(max(-1.0, dp / cap) if cap > 1000 else None)
    last6 = [x for x in rets[-7:-1] if x is not None]
    if len(last6) < 6: continue
    t90 = now - dt.timedelta(days=90); p90, v90 = at(pn, t90), at(avh, t90)
    r90 = (pn[-1][1] - p90) / max(v90, avh[-1][1] - (pn[-1][1] - p90)) if p90 is not None and v90 else None
    pos6 = sum(1 for x in last6 if x > 0) / 6; sd = st.pstdev(last6)
    sharpe6 = (st.mean(last6) / sd) if sd > 0 else 0
    if pos6 >= 4 / 6 and (r90 or 0) > 0 and avh[-1][1] >= 100_000:
        picked.append({"addr": addr, "accountValue": round(avh[-1][1]), "r90Pct": round(r90 * 100, 1), "greenMonths": f"{int(round(pos6 * 6))}/6", "sharpe6": round(sharpe6, 2),
                       "monthsPct": [round(x * 100, 1) for x in last6], "thisMonthPct": round(rets[-1] * 100, 1) if rets[-1] is not None else None})
    time.sleep(0.25)
picked.sort(key=lambda x: -x["sharpe6"])
json.dump({"asOf": now.strftime("%Y-%m-%d"), "rule": "≥4 of the last 6 months green, last 90 days positive, account ≥ $100,000; top 10 by (average month ÷ its swings) over 6 months; very high-turnover accounts (likely market makers) left out",
           "tested": "Copy top-10 steady: +81% a year on unseen 2025 → Oct 2026 (worst month −13.7%, worst drop −30.7%) after a 0.5%/month copy cost; survivor bias likely — treat as unproven",
           "source": "Hyperliquid public leaderboard and api.hyperliquid.xyz portfolio", "checked": len(cand), "passed": len(picked), "traders": picked[:10]}, open(f"{OUT}/copy-steady.json", "w"), indent=1)
print("steady traders", len(picked), [x["addr"][:10] for x in picked[:10]])
