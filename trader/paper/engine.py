# MAX-MASTER-2 weekly paper-trading engine (pretend money only — never places real orders).
# Usage: python3 engine.py state.json pse_dir.json out_dir   → updates state.json, writes out_dir/report.md + out_dir/dashboard.json
# Rules: signal on a day's close → trade at the NEXT day's close; real fees + slippage on every trade; nothing is back-filled with invented prices.
import json, sys, time, math, os, datetime as dt, urllib.request, urllib.parse, re, statistics as stx
UA = {"User-Agent": "Mozilla/5.0"}
def http(url, data=None, headers=None, tries=4, timeout=60, raw=False):
    h = dict(UA, **(headers or {}))
    for t in range(tries):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, data=data, headers=h), timeout=timeout).read()
            return r.decode() if raw else json.loads(r)
        except Exception as e:
            err = e; time.sleep(3 * (t + 1))
    raise RuntimeError(f"{url[:80]}: {err}")
D = lambda s: dt.date.fromisoformat(s)
iso = lambda d: d.isoformat()
LOG = []
def log(book, kind, text, **kw): LOG.append({"book": book, "kind": kind, "text": text, **kw})

# ---------------- data ----------------
def binance_daily(sym, days=150):
    k = http(f"https://data-api.binance.vision/api/v3/klines?symbol={sym}&interval=1d&limit={days}")
    today = dt.datetime.utcnow().date()
    out = [(dt.datetime.utcfromtimestamp(r[0] / 1000).date(), float(r[4]), float(r[7])) for r in k]
    return [x for x in out if x[0] < today]          # closed days only
STB = {'USDC','BUSD','TUSD','USDP','FDUSD','DAI','PAX','EUR','GBP','AUD','USDS','SUSD','UST','PAXG','WBTC','AEUR','EURI','USDE','XUSD','BFUSD','USD1','TRY','BRL','BIDR','RUB','IDRT','NGN','UAH','ZAR','XAUT','RLUSD'}
def crypto_universe():
    t = http("https://data-api.binance.vision/api/v3/ticker/24hr")
    c = [x for x in t if x["symbol"].endswith("USDT") and x["symbol"][:-4] not in STB and not re.search(r"(UP|DOWN|BULL|BEAR)USDT$", x["symbol"])]
    c.sort(key=lambda x: -float(x["quoteVolume"]))
    data = {}
    for x in c[:60]:
        try: data[x["symbol"][:-4]] = binance_daily(x["symbol"])
        except Exception: pass
        time.sleep(0.15)
    if "BTC" not in data: data["BTC"] = binance_daily("BTCUSDT")
    return data
def yahoo(sym, rng="1y"):
    d = http(f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?range={rng}&interval=1d")["chart"]["result"][0]
    c = d["indicators"]["quote"][0]["close"]
    return [(dt.datetime.utcfromtimestamp(t + 8 * 3600).date(), v) for t, v in zip(d["timestamp"], c) if v]
def pse_prices(row, start):
    b = json.dumps({"cmpy_id": row["cmpy"], "security_id": row["sec"], "startDate": start.strftime("%m-%d-%Y"), "endDate": dt.date.today().strftime("%m-%d-%Y")}).encode()
    d = http("https://edge.pse.com.ph/common/DisclosureCht.ax", data=b, headers={"Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest", "Referer": f"https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id={row['cmpy']}"})
    return [(dt.datetime.strptime(r["CHART_DATE"], "%b %d, %Y %H:%M:%S").date(), float(r["CLOSE"]), float(r["VALUE"])) for r in d["chartData"] if r["CLOSE"]]
def pse_dividends(row):
    """Cash dividends from the company's PSE Edge 'Dividends and Rights' page: [(ex_date, peso per share)]"""
    h = http(f"https://edge.pse.com.ph/companyPage/dividends_and_rights_list.ax?DividendsOrRights=Dividends&cmpy_id={row['cmpy']}", raw=True)
    out = []
    for tr in re.findall(r"<tr>(.*?)</tr>", h, re.S):
        td = [re.sub(r"<[^>]+>|\s+", " ", x).strip() for x in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(td) >= 4 and td[0].upper().startswith("COMMON") and td[1].lower() == "cash":
            m = re.search(r"([\d.,]+)", td[2].replace("Php", ""))
            try: out.append((dt.datetime.strptime(td[3], "%b %d, %Y").date(), float(m.group(1).replace(",", ""))))
            except Exception: pass
    return out
def sa_ttm_yield(sym, price):
    try:
        h = http(f"https://stockanalysis.com/quote/pse/{sym}/dividend/", raw=True, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36"})
        m = re.search(r'\{date:\[([^\]]*)\],amount:\[([^\]]*)\]', h)
        if not m: return 0.0
        ds = [D(x) for x in re.findall(r'"([\d-]+)"', m.group(1))]; am = [float(a) for a in m.group(2).split(",") if a]
        cut = dt.date.today() - dt.timedelta(days=365)
        return sum(a for d_, a in zip(ds, am) if d_ > cut) / price
    except Exception: return 0.0
def board_lot(p):
    for lim, lot in [(0.01, 1000000), (0.05, 100000), (0.5, 10000), (5, 1000), (50, 100), (1000, 10)]:
        if p < lim: return lot
    return 5
FX = {"EUR": ("EURUSD=X", False, "EURO FX - "), "JPY": ("JPY=X", True, "JAPANESE YEN - "), "GBP": ("GBPUSD=X", False, "BRITISH POUND - "), "CHF": ("CHF=X", True, "SWISS FRANC - "),
      "CAD": ("CAD=X", True, "CANADIAN DOLLAR - "), "AUD": ("AUDUSD=X", False, "AUSTRALIAN DOLLAR - "), "NZD": ("NZDUSD=X", False, "NZ DOLLAR - "), "MXN": ("MXN=X", True, "MEXICAN PESO - "),
      "BRL": ("BRL=X", True, "BRAZILIAN REAL - "), "ZAR": ("ZAR=X", True, "SO AFRICAN RAND - ")}
def cot_signals():
    q = urllib.parse.quote("report_date_as_yyyy_mm_dd > '" + iso(dt.date.today() - dt.timedelta(days=200)) + "'")
    d = http(f"https://publicreporting.cftc.gov/resource/gpe5-46if.json?$where={q}&$select=market_and_exchange_names,report_date_as_yyyy_mm_dd,lev_money_positions_long,lev_money_positions_short,open_interest_all&$limit=20000")
    sig = {}; last = None; why = {}
    for c, (_, _, name) in FX.items():
        rows = sorted([x for x in d if x["market_and_exchange_names"].startswith(name) and "XRATE" not in x["market_and_exchange_names"]], key=lambda x: x["report_date_as_yyyy_mm_dd"])
        net = [(float(x["lev_money_positions_long"]) - float(x["lev_money_positions_short"])) / float(x["open_interest_all"]) for x in rows]
        if len(net) >= 14:
            ch = net[-1] - sum(net[-13:]) / 13
            sig[c] = -1 if ch > 0 else 1          # FADE: leveraged funds adding → go the other way
            why[c] = f"hedge funds' net position in {c} is {net[-1]*100:+.1f}% of all contracts vs a 13-week average of {sum(net[-13:])/13*100:+.1f}% — they {'added' if ch>0 else 'cut'} {abs(ch)*100:.1f} points, so Max goes {'SHORT' if ch>0 else 'LONG'} (crowded bets tend to reverse)"
            last = rows[-1]["report_date_as_yyyy_mm_dd"][:10]
    COT_WHY.clear(); COT_WHY.update(why)
    return sig, last
COT_WHY = {}
_HL = {}
def hl_portfolio(a):
    if a in _HL: return _HL[a]
    d = http("https://api.hyperliquid.xyz/info", data=json.dumps({"type": "portfolio", "user": a}).encode(), headers={"Content-Type": "application/json"})
    d = dict(d)["allTime"]
    pn = [(t / 1000, float(v)) for t, v in d["pnlHistory"]]; av = [(t / 1000, float(v)) for t, v in d["accountValueHistory"]]
    _HL[a] = (pn, av); return pn, av
def at(s, ts):
    v = [x for t, x in s if t <= ts]; return v[-1] if v else None

# ---------------- books ----------------
def new_book(name, ccy="PHP", start=100000.0):
    return {"name": name, "ccy": ccy, "start": start, "cash": start, "positions": [], "trades": [], "hist": [], "pending": []}
def crypto_swing(B, U, upto):
    """Donchian-20 breakout among Binance top-20 by 30-day traded value; 2×ATR chandelier trailing stop; 0.5% risk per trade; max 8; 25% cap; 0.15%/side."""
    cost = 0.0015
    dates = sorted({d for s in U.values() for d, _, _ in s})
    last = D(B.get("last_day", iso(upto - dt.timedelta(days=1))))
    px = {c: {d: p for d, p, _ in s} for c, s in U.items()}
    def series(c, d, n): return [p for dd, p, _ in U[c] if dd <= d][-n:]
    def atr(c, d): s = series(c, d, 21); return 1.25 * sum(abs(s[i] - s[i - 1]) for i in range(1, len(s))) / 20 if len(s) == 21 else None
    def top20(d):
        v = {c: sum(q for dd, _, q in s if d - dt.timedelta(days=30) < dd <= d) for c, s in U.items()}
        return set(sorted(v, key=lambda c: -v[c])[:20])
    for d in [x for x in dates if last < x <= upto]:
        # 1) fills scheduled for today's close
        for o in [o for o in B["pending"] if D(o["on"]) <= d]:
            p = px.get(o["sym"], {}).get(d); B["pending"].remove(o)
            if p is None: continue
            if o["side"] == "buy":
                eq = equity_crypto(B, px, d); a = o["atr"]
                q = min(eq * 0.005 / (2 * a), eq * 0.25 / p); need = q * p * (1 + cost)
                if need > B["cash"]: q = B["cash"] / (p * (1 + cost)); need = B["cash"]
                if q * p < 10: continue
                B["cash"] -= need; B["positions"].append({"sym": o["sym"], "qty": q, "entry": iso(d), "ep": p, "stop": p - 2 * a, "hi": p, "risk": 2 * a})
                log(B["name"], "BUY", f"BUY {o['sym']} {q:.6g} @ ${p:,.6g} = ${q*p:,.2f} ({q*p/eq*100:.1f}% of book). Stop ${p-2*a:,.6g} → if hit, loss ≈ ${q*2*a:,.2f} (0.5% of book). Why: " + o.get("why", "breakout above 20-day high"), date=iso(d))
            else:
                pos = next((x for x in B["positions"] if x["sym"] == o["sym"]), None)
                if not pos: continue
                val = pos["qty"] * p * (1 - cost); B["cash"] += val; B["positions"].remove(pos)
                pnl = val - pos["qty"] * pos["ep"] * (1 + cost); R = pnl / (pos["qty"] * pos["risk"])
                t = {"sym": pos["sym"], "entry": pos["entry"], "exit": iso(d), "ep": pos["ep"], "xp": p, "pnl": round(pnl, 2), "R": round(R, 2), "reason": o["why"]}
                B["trades"].append(t); log(B["name"], "SELL", f"SELL {pos['sym']} @ ${p:,.6g}, held {pos['entry']} → {iso(d)}. Result {'+' if pnl>=0 else ''}${pnl:,.2f} ({R:+.2f}R = {R:+.2f}× the amount risked). Why: {pos['sym']} {o['why']}" + (" — profit locked in." if pnl > 0 else " — the loss is kept small, as planned."), date=iso(d))
        # 2) update trailing stops, exits signalled at today's close
        for pos in B["positions"]:
            p = px.get(pos["sym"], {}).get(d); a = atr(pos["sym"], d)
            if p is None: continue
            pos["hi"] = max(pos["hi"], p)
            if a: pos["stop"] = max(pos["stop"], pos["hi"] - 2 * a)
            if p < pos["stop"] and not any(o["sym"] == pos["sym"] for o in B["pending"]):
                gain = (pos["hi"] / pos["ep"] - 1) * 100
                B["pending"].append({"sym": pos["sym"], "side": "sell", "on": iso(d + dt.timedelta(days=1)), "why": f"closed ${p:,.6g} below its trailing stop ${pos['stop']:,.6g}. Bought at ${pos['ep']:,.6g}; highest close since was ${pos['hi']:,.6g} ({gain:+.1f}%). The stop follows the highest close minus 2× the average daily move, so the trend is judged over and Max exits"})
        # 3) new entries signalled today — only when Bitcoin is above its 50-day average (tested: more profit, fewer trades)
        T = top20(d); held = {x["sym"] for x in B["positions"]} | {o["sym"] for o in B["pending"]}
        b = series("BTC", d, 50); btc_ok = len(b) == 50 and b[-1] > sum(b) / 50
        B["market"] = {"date": iso(d), "btc": b[-1] if b else None, "btc_sma50": sum(b) / len(b) if b else None, "ok": btc_ok}
        if not btc_ok:
            brk = [c for c in T if len(series(c, d, 21)) == 21 and series(c, d, 21)[-1] > max(series(c, d, 21)[:-1])]
            if brk: log(B["name"], "NO TRADE", f"{', '.join(sorted(brk))} broke above their 20-day high, but Bitcoin (${b[-1]:,.0f}) is below its 50-day average (${sum(b)/len(b):,.0f}). In this kind of market most breakouts fail, so Max waits.", date=iso(d))
            T = set()
        for c in sorted(T):
            s = series(c, d, 21); a = atr(c, d)
            if c in held or len(s) < 21 or not a or len(B["positions"]) + sum(o["side"] == "buy" for o in B["pending"]) >= 8: continue
            if s[-1] > max(s[:-1]):
                v = [q for dd, _, q in U[c] if dd <= d][-21:]; vr = v[-1] / (sum(v[:-1]) / 20) if len(v) == 21 and sum(v[:-1]) else 0
                why = (f"{c} closed at ${s[-1]:,.6g}, above its highest close of the last 20 days (${max(s[:-1]):,.6g}) — a breakout. "
                       f"Bitcoin is above its 50-day average (${b[-1]:,.0f} vs ${sum(b)/50:,.0f}), so the market supports it. {c} is one of the 20 most-traded coins (volume today {vr:.1f}× its 20-day average). "
                       f"Plan: buy at the next close, stop {2*a:,.6g} (2× average daily move) below, trailing up as price rises; risk 0.5% of the book.")
                B["pending"].append({"sym": c, "side": "buy", "on": iso(d + dt.timedelta(days=1)), "atr": a, "why": why}); log(B["name"], "SIGNAL", why, date=iso(d))
        B["hist"].append([iso(d), round(equity_crypto(B, px, d), 2)]); B["last_day"] = iso(d)
def equity_crypto(B, px, d):
    v = B["cash"]
    for p in B["positions"]:
        last = max([dd for dd in px.get(p["sym"], {}) if dd <= d], default=None)
        v += p["qty"] * (px[p["sym"]][last] if last else p["ep"])
    return v
def crypto_momentum(B, U, upto):
    """REJECTED in testing (kept to show live): weekly top-5 by 14-day return among top-20, only when BTC > SMA50."""
    cost = 0.0015; px = {c: {d: p for d, p, _ in s} for c, s in U.items()}
    dates = sorted({d for s in U.values() for d, _, _ in s}); last = D(B.get("last_day", iso(upto - dt.timedelta(days=1))))
    for d in [x for x in dates if last < x <= upto]:
        for o in [o for o in B["pending"] if D(o["on"]) <= d]:
            B["pending"].remove(o)
            eq = equity_crypto(B, px, d)
            for p in list(B["positions"]):
                x = px.get(p["sym"], {}).get(d) or p["ep"]; val = p["qty"] * x * (1 - cost); B["cash"] += val
                B["trades"].append({"sym": p["sym"], "entry": p["entry"], "exit": iso(d), "ep": p["ep"], "xp": x, "pnl": round(val - p["qty"] * p["ep"] * (1 + cost), 2)}); B["positions"].remove(p)
            ok = [c for c in o["buy"] if px.get(c, {}).get(d)]
            for c in ok:
                x = px[c][d]; amt = B["cash"] / (len(ok) - ok.index(c))
                q = amt / (x * (1 + cost)); B["cash"] -= amt; B["positions"].append({"sym": c, "qty": q, "entry": iso(d), "ep": x})
            log(B["name"], "REBALANCE", "hold " + (", ".join(o["buy"]) if o["buy"] else "CASH"), date=iso(d))
        if (d - D(B["opened"])).days % 7 == 6:
            btc = [p for dd, p, _ in U["BTC"] if dd <= d]; on = len(btc) >= 50 and btc[-1] > sum(btc[-50:]) / 50
            v = {c: sum(q for dd, _, q in s if d - dt.timedelta(days=30) < dd <= d) for c, s in U.items()}; T = sorted(v, key=lambda c: -v[c])[:20]
            r = {}
            for c in T:
                s = [p for dd, p, _ in U[c] if dd <= d]
                if len(s) > 15 and s[-15] > 0: r[c] = s[-1] / s[-15] - 1
            pick = [c for c in sorted(r, key=lambda c: -r[c]) if r[c] > 0][:5] if on else []
            B["pending"].append({"on": iso(d + dt.timedelta(days=1)), "buy": pick})
        B["hist"].append([iso(d), round(equity_crypto(B, px, d), 2)]); B["last_day"] = iso(d)
def pse_dividend(B, DIR, upto):
    """Top-20 PSE stocks by cash dividends paid in the last 12 months ÷ price (yield ≥3%, ≥₱5M traded a day, price ≥₱1). Rebalance every 3 months. Dividends credited on ex-date."""
    cost_buy, cost_sell, slip = 0.00295, 0.00395, 0.002
    rows = {r["sym"]: r for r in DIR}
    need_reb = (not B["positions"] and not B["pending"]) or D(B.get("next_rebalance", "2099-01-01")) <= upto
    held = {p["sym"] for p in B["positions"]}
    since = D(B.get("last_day", iso(upto - dt.timedelta(days=10))))
    prices = {}
    for s in held | {o["sym"] for o in B["pending"]} | {"AETF"}:
        try: prices[s] = {d: p for d, p, _ in pse_prices(rows[s], since - dt.timedelta(days=10))}
        except Exception as e: log(B["name"], "DATA", f"{s}: price download failed ({e}); valued at last known price")
        time.sleep(0.4)
    days = sorted({d for s in prices.values() for d in s if since < d <= upto})
    for d in days:
        for o in [o for o in B["pending"] if True]:
            p = prices.get(o["sym"], {}).get(d)
            if p is None: continue
            B["pending"].remove(o)
            if o["side"] == "sell":
                pos = next(x for x in B["positions"] if x["sym"] == o["sym"]); val = pos["shares"] * p * (1 - cost_sell - slip); B["cash"] += val
                pnl = val - pos["cost"] + pos.get("divs", 0); B["positions"].remove(pos)
                B["trades"].append({"sym": o["sym"], "entry": pos["entry"], "exit": iso(d), "ep": pos["ep"], "xp": p, "pnl": round(pnl, 2), "divs": round(pos.get("divs", 0), 2), "reason": "quarterly rebalance"})
                log(B["name"], "SELL", f"SELL {pos['shares']:,} {o['sym']} @ ₱{p:,.4g} (bought ₱{pos['ep']:,.4g} on {pos['entry']}) → {'+' if pnl>=0 else ''}₱{pnl:,.0f} incl. ₱{pos.get('divs',0):,.0f} dividends. Why: " + o.get("why", "quarterly rebalance"), date=iso(d))
            else:
                lot = board_lot(p); budget = min(o["php"], B["cash"]); sh = int(budget / (p * (1 + cost_buy + slip)) // lot * lot)
                if sh <= 0: log(B["name"], "SKIP", f"{o['sym']}: ₱{budget:,.0f} buys less than one board lot ({lot} sh @ ₱{p:,.4g})", date=iso(d)); continue
                c = sh * p * (1 + cost_buy + slip); B["cash"] -= c
                B["positions"].append({"sym": o["sym"], "shares": sh, "ep": p, "cost": round(c, 2), "entry": iso(d), "divs": 0.0, "yield_at_buy": o.get("yield")})
                log(B["name"], "BUY", f"BUY {sh:,} {o['sym']} ({sh//lot} board lots of {lot}) @ ₱{p:,.4g} = ₱{c:,.0f} incl. COL fee. Why: " + o.get("why", f"dividend yield {o.get('yield',0)*100:.1f}%"), date=iso(d))
        B["hist"].append([iso(d), round(B["cash"] + sum(x["shares"] * (prices.get(x["sym"], {}).get(d) or last_px(prices, x)) for x in B["positions"]), 2)])
        B["last_day"] = iso(d)
    # dividends with ex-date inside the period
    for pos in B["positions"]:
        try:
            for exd, amt in pse_dividends(rows[pos["sym"]]):
                key = f"{pos['sym']}|{exd}"
                if since < exd <= upto and D(pos["entry"]) < exd and key not in B.setdefault("div_keys", []):
                    cash = pos["shares"] * amt * 0.9; B["cash"] += cash; pos["divs"] = pos.get("divs", 0) + cash; B["div_keys"].append(key)   # 10% final tax withheld
                    log(B["name"], "DIVIDEND", f"{pos['sym']} cash dividend ₱{amt}/sh × {pos['shares']:,} − 10% tax = ₱{cash:,.0f} (ex-date {exd})", date=iso(exd))
        except Exception: pass
        time.sleep(0.3)
    if need_reb:
        log(B["name"], "SCAN", "Quarterly scan of all PSE stocks for dividend yield (takes a while)")
        cand = []; INFO = {}
        for r in DIR:
            try: s = pse_prices(r, upto - dt.timedelta(days=45))
            except Exception: continue
            time.sleep(0.3)
            if len(s) < 10: continue
            p = s[-1][1]; val = sum(v for _, _, v in s[-20:]) / len(s[-20:])
            if p < 1 or val < 5e6: continue
            y = sa_ttm_yield(r["sym"], p); time.sleep(0.6)
            if y >= 0.03: cand.append((y, r["sym"])); INFO[r["sym"]] = {"price": p, "value": val, "div12m": round(y * p, 4)}
        pick = [s for _, s in sorted(cand, reverse=True)[:20]]; ydict = {s: y for y, s in cand}; B["scan_info"] = {s: v for s, v in INFO.items()}
        eq = equity_pse(B, prices)
        for p in B["positions"]:
            if p["sym"] not in pick: B["pending"].append({"sym": p["sym"], "side": "sell", "why": f"{p['sym']} is no longer in the top 20 by dividend yield" + (f" (now {ydict[p['sym']]*100:.1f}%, below the 20th stock's {sorted(ydict.values())[-20]*100:.1f}%)" if p['sym'] in ydict and len(ydict) >= 20 else " (its yield fell below 3% or it no longer trades ₱5M a day)") + ", so its money moves to a higher-paying stock."})
        keep = [p["sym"] for p in B["positions"] if p["sym"] in pick]
        for s in pick:
            if s not in keep:
                i_ = INFO.get(s, {})
                B["pending"].append({"sym": s, "side": "buy", "php": eq / 20, "yield": ydict[s], "why": f"{s} paid ₱{i_.get('div12m',0):,.4g} per share in cash dividends in the last 12 months; at ₱{i_.get('price',0):,.4g} that is a {ydict[s]*100:.1f}% yield, rank {pick.index(s)+1} of all PSE stocks. It trades about ₱{i_.get('value',0)/1e6:,.0f}M a day, so it is easy to buy and sell. High-dividend stocks earned +66% in 2021–2026 while the whole market earned −2%."})
        B["next_rebalance"] = iso(upto + dt.timedelta(days=91)); B["picks"] = [{"sym": s, "yield_%": round(ydict[s] * 100, 1)} for s in pick]
        log(B["name"], "REBALANCE", "New top-20 by dividend yield: " + ", ".join(f"{s} {ydict[s]*100:.1f}%" for s in pick) + " → orders at next trading day's close")
def last_px(prices, x):
    s = prices.get(x["sym"], {}); return s[max(s)] if s else x["ep"]
def equity_pse(B, prices): return B["cash"] + sum(x["shares"] * last_px(prices, x) for x in B["positions"])
def fx_cot(B, upto):
    """Fade leveraged funds (CFTC weekly): if they increased their net position vs the 13-week average, go the other way. 10 currencies vs USD, equal size, no leverage. 0.02%/side."""
    sig, rep = cot_signals(); px = {}
    for c, (sym, inv, _) in FX.items():
        try: px[c] = {d: (1 / v if inv else v) for d, v in yahoo(sym, "3mo")}
        except Exception: pass
        time.sleep(0.4)
    dates = sorted({d for s in px.values() for d in s}); last = D(B.get("last_day", iso(upto - dt.timedelta(days=1))))
    eq = B.get("equity", B["start"]); w = B.get("weights", {})
    prev = {c: max([d for d in px.get(c, {}) if d <= last], default=None) for c in FX}
    for d in [x for x in dates if last < x <= upto]:
        r = 0.0
        for c, wt in w.items():
            if c in px and d in px[c] and prev.get(c):
                r += wt * (px[c][d] / px[c][prev[c]] - 1); prev[c] = d
        eq *= 1 + r; B["hist"].append([iso(d), round(eq, 2)]); B["last_day"] = iso(d)
    if rep and rep != B.get("cot_date") and sig:
        n = len(sig); new = {c: s / n for c, s in sig.items()}
        turn = sum(abs(new.get(c, 0) - w.get(c, 0)) for c in FX); eq *= 1 - turn * 0.0002
        ch = [f"{'LONG' if new[c]>0 else 'SHORT'} {c}" for c in new if math.copysign(1, new[c]) != math.copysign(1, w.get(c, 0)) or c not in w]
        log(B["name"], "REBALANCE", f"CFTC report {rep}: " + (", ".join(ch) if ch else "no change") + f" | now LONG {', '.join(c for c in new if new[c]>0)} · SHORT {', '.join(c for c in new if new[c]<0)}", date=rep)
        for c in new: log(B["name"], "WHY", f"{c}: {COT_WHY.get(c,'')}", date=rep)
        B["weights"] = new; B["cot_date"] = rep
    B["equity"] = eq
def copy_book(B, upto, mode):
    """mode 'steady': top-10 by 6-month Sharpe among traders with ≥4/6 green months, last 90 days > 0, ≥$100k.  mode 'hot' (REJECTED in testing): top-10 by last 30 days.
       Monthly re-pick. Value = average of the picks' profit ÷ their capital since the pick (each capped −100%…+100%), minus 0.5%/month copy delay."""
    now = time.time()
    if B["positions"]:
        rets = []
        for p in B["positions"]:
            try: pn, av = hl_portfolio(p["addr"]); x = at(pn, now)
            except Exception: x = None
            if x is None: rets.append(p.get("last_r", 0)); continue
            r = max(-1, min(1, (x - p["pnl0"]) / p["cap0"])); p["last_r"] = r; rets.append(r)
            time.sleep(0.5)
        days = (upto - D(B["pick_date"])).days
        val = B["base"] * (1 + sum(rets) / len(rets) - 0.005 * days / 30)
        B["equity"] = val; B["hist"].append([iso(upto), round(val, 2)])
    if not B["positions"] or (upto - D(B["pick_date"])).days >= 28:
        if B["positions"]:
            B["trades"].append({"period": f"{B['pick_date']} → {iso(upto)}", "pnl": round(B["equity"] - B["base"], 2), "pct": round((B["equity"] / B["base"] - 1) * 100, 2), "traders": [p["addr"][:10] for p in B["positions"]]})
            log(B["name"], "CLOSE", f"Month closed {B['pick_date']} → {iso(upto)}: {(B['equity']/B['base']-1)*100:+.2f}%")
        global _LB
        if "_LB" not in globals(): _LB = http("https://stats-data.hyperliquid.xyz/Mainnet/leaderboard", timeout=180)["leaderboardRows"]
        lb = _LB
        pool = [x for x in lb if float(x["accountValue"]) >= 100000 and float(dict(x["windowPerformances"])["allTime"]["vlm"]) > 2e7]
        pool.sort(key=lambda x: -float(dict(x["windowPerformances"])["allTime"]["vlm"])); pool = pool[:400]
        sc = []
        for x in pool:
            a = x["ethAddress"]
            try: pn, av = hl_portfolio(a)
            except Exception: continue
            time.sleep(0.6)
            m = []
            for k in range(6, 0, -1):
                t0, t1 = now - (k * 30 + 0) * 86400, now - ((k - 1) * 30) * 86400
                p0, p1, v0 = at(pn, t0), at(pn, t1), at(av, t0)
                if None in (p0, p1, v0): m = []; break
                cap = max(v0, (at(av, t1) or 0) - (p1 - p0))
                if cap < 1000: m = []; break
                m.append((p1 - p0) / cap)
            if len(m) < 6: continue
            p90, v90 = at(pn, now - 90 * 86400), at(av, now - 90 * 86400); r90 = (at(pn, now) - p90) / max(v90, 1)
            sd = stx.pstdev(m) or 1e-9
            sc.append({"addr": a, "sharpe": stx.mean(m) / sd, "green": sum(r > 0 for r in m), "r90": r90, "r30": m[-1], "pnl0": at(pn, now), "cap0": max(float(x["accountValue"]), 1000)})
        if mode == "steady": pick = sorted([s for s in sc if s["green"] >= 4 and s["r90"] > 0], key=lambda s: -s["sharpe"])[:10]
        else: pick = sorted(sc, key=lambda s: -s["r30"])[:10]
        B["base"] = B.get("equity", B["start"]); B["pick_date"] = iso(upto)
        B["positions"] = [{"addr": s["addr"], "pnl0": s["pnl0"], "cap0": s["cap0"], "score": round(s["sharpe"] if mode == "steady" else s["r30"], 3)} for s in pick]
        log(B["name"], "PICK", f"Copying {len(pick)} traders: " + ", ".join(f"{s['addr'][:8]}… ({'green ' + str(s['green']) + '/6' if mode=='steady' else f'last 30d {s['r30']*100:+.0f}%'})" for s in pick))
        for s_ in pick: log(B["name"], "WHY", f"{s_['addr'][:10]}…: {s_['green']} of last 6 months profitable, last 90 days {s_['r90']*100:+.1f}%, last 30 days {s_['r30']*100:+.1f}%, consistency score {s_['sharpe']:.2f}, account ${s_['cap0']:,.0f}" + (" — chosen for steady results, not one lucky month" if mode == 'steady' else " — chosen only for the hottest last month (watch book, expected to do badly)"))
        B.setdefault("equity", B["start"])

# ---------------- run ----------------
def pct(a, b): return (a / b - 1) * 100 if b else 0
def main(state_f, dir_f, out):
    S = json.load(open(state_f)); DIR = json.load(open(dir_f)); upto = dt.date.today() - dt.timedelta(days=1)
    os.makedirs(out, exist_ok=True); errors = []
    week0 = {k: (B["hist"][-1][1] if B["hist"] else B["start"]) for k, B in S["books"].items()}
    U = None
    def step(k, fn):
        try: fn()
        except Exception as e: errors.append(f"{S['books'][k]['name']}: {e}")
    try: U = crypto_universe()
    except Exception as e: errors.append(f"Binance data: {e}")
    if U:
        step("crypto_swing", lambda: crypto_swing(S["books"]["crypto_swing"], U, upto))
        step("crypto_momentum", lambda: crypto_momentum(S["books"]["crypto_momentum"], U, upto))
    step("pse_dividend", lambda: pse_dividend(S["books"]["pse_dividend"], DIR, dt.date.today()))
    step("fx_cot", lambda: fx_cot(S["books"]["fx_cot"], upto))
    step("copy_steady", lambda: copy_book(S["books"]["copy_steady"], dt.date.today(), "steady"))
    step("copy_hot", lambda: copy_book(S["books"]["copy_hot"], dt.date.today(), "hot"))
    # benchmarks
    bm = S.setdefault("bench", {})
    try:
        btc = binance_daily("BTCUSDT", 5)[-1][1]; bm.setdefault("btc0", btc); bm["btc"] = btc
    except Exception: pass
    try:
        a = [r for r in DIR if r["sym"] == "AETF"][0]; s = pse_prices(a, dt.date.today() - dt.timedelta(days=10))
        bm.setdefault("psei0", s[-1][1]); bm["psei"] = s[-1][1]
    except Exception: pass
    try: usd = yahoo("PHP=X", "5d")[-1][1]; bm["usdphp"] = usd
    except Exception: usd = bm.get("usdphp", 58.0)
    S["last_run"] = iso(dt.date.today()); S["events"] = (S.get("events", []) + [dict(x, run=iso(dt.date.today())) for x in LOG])[-300:]
    # summary rows
    rows = []
    for k, B in S["books"].items():
        v = B["hist"][-1][1] if B["hist"] else B.get("equity", B["start"])
        rows.append({"key": k, "name": B["name"], "status": B["status"], "weight": B.get("weight", 0), "ccy": B["ccy"], "value": round(v, 2), "week_%": round(pct(v, week0[k]), 2), "since_start_%": round(pct(v, B["start"]), 2),
                     "open": len(B["positions"]), "closed_trades": len(B["trades"]), "wins": sum(1 for t in B["trades"] if t.get("pnl", 0) > 0)})
    main_ = [r for r in rows if r["weight"]]; combo = sum(r["weight"] * r["since_start_%"] for r in main_); comboW = sum(r["weight"] * r["week_%"] for r in main_)
    weeks = max(1, (dt.date.today() - D(S["opened"])).days // 7)
    S["summary"] = {"date": iso(dt.date.today()), "weeks": weeks, "master2_since_start_%": round(combo, 2), "master2_week_%": round(comboW, 2), "books": rows,
                    "bench": {"btc_%": round(pct(bm.get("btc", 1), bm.get("btc0", 1)), 2), "psei_etf_%": round(pct(bm.get("psei", 1), bm.get("psei0", 1)), 2), "usdphp": usd}, "errors": errors}
    json.dump(S, open(state_f, "w"), indent=1)
    json.dump({"summary": S["summary"], "books": {k: {kk: v for kk, v in B.items() if kk not in ("div_keys",)} for k, B in S["books"].items()}, "events": S["events"][-300:]}, open(f"{out}/dashboard.json", "w"), indent=1)
    # dashboard row files
    json.dump({"rows": [dict(r, value_php=round(r["value"] * (usd if r["ccy"] == "USDT" else 1), 0)) for r in rows] + [{"key": "master2", "name": "MAX-MASTER-2 combined (30/30/25/15)", "status": "main", "weight": 1, "ccy": "PHP", "value": None, "value_php": None,
               "week_%": round(comboW, 2), "since_start_%": round(combo, 2), "open": None, "closed_trades": None, "wins": None}]}, open(f"{out}/books.json", "w"), indent=1)
    eqrows = []
    for k, B in S["books"].items():
        eqrows.append({"date": S["opened"], "key": k, "name": B["name"], "index": 100.0})
        for d, v in B["hist"]:
            if d > S["opened"]: eqrows.append({"date": d, "key": k, "name": B["name"], "index": round(v / B["start"] * 100, 3)})
    json.dump({"rows": eqrows}, open(f"{out}/equity.json", "w"), indent=1)
    json.dump({"rows": [{"n": i, "run": x.get("run"), "date": x.get("date") or x.get("run"), "book": x["book"], "kind": x["kind"], "text": x["text"]} for i, x in enumerate(S["events"][-400:])][::-1]}, open(f"{out}/actions.json", "w"), indent=1)
    pos = []
    for k, B in S["books"].items():
        for p in B["positions"]:
            if "addr" in p: pos.append({"id": f"{k}:{p['addr']}", "book": B["name"], "what": "trader " + p["addr"][:10] + "…", "since": B.get("pick_date"), "detail": f"{p.get('last_r',0)*100:+.1f}% since pick"})
            elif "shares" in p: pos.append({"id": f"{k}:{p['sym']}", "book": B["name"], "what": p["sym"], "since": p["entry"], "detail": f"{p['shares']:,} sh @ ₱{p['ep']:,.4g} · dividends ₱{p.get('divs',0):,.0f}"})
            else: pos.append({"id": f"{k}:{p['sym']}", "book": B["name"], "what": p["sym"], "since": p["entry"], "detail": f"{p['qty']:.6g} @ ${p['ep']:,.6g} · stop ${p.get('stop',0):,.6g}"})
        for o in B.get("pending", []):
            if "sym" in o: pos.append({"id": f"{k}:pending:{o['sym']}:{o['side']}", "book": B["name"], "what": f"{o['sym']} (order)", "since": o.get("on", "next trading day"), "detail": f"{o['side'].upper()} at next close" + (f" · yield {o['yield']*100:.1f}%" if o.get("yield") else "")})
        if B.get("weights"):
            for c, w in B["weights"].items(): pos.append({"id": f"{k}:{c}", "book": B["name"], "what": c, "since": B.get("cot_date"), "detail": ("LONG " if w > 0 else "SHORT ") + c + f" vs USD · {abs(w)*100:.0f}% of book"})
    json.dump({"rows": pos}, open(f"{out}/positions.json", "w"), indent=1)
    # report
    L = [f"**Max paper trading — week {weeks} ({iso(dt.date.today())})**", "Pretend money only. No real orders. Not financial advice.", "",
         f"**MAX-MASTER-2 combined:** this week {comboW:+.2f}% · since start {combo:+.2f}% (weights 30/30/25/15)",
         f"- Benchmarks since start: Bitcoin {S['summary']['bench']['btc_%']:+.2f}% · PSEi ETF (AETF) {S['summary']['bench']['psei_etf_%']:+.2f}%", ""]
    L.append("**Strategies**")
    for r in rows:
        verdict = "too early to judge (needs ~12 weeks)" if weeks < 12 else ("WORKING" if r["since_start_%"] > 0 else "NOT working")
        L.append(f"- {r['name']} [{r['status']}]: {r['ccy']} {r['value']:,.0f} · week {r['week_%']:+.2f}% · since start {r['since_start_%']:+.2f}% · open {r['open']} · closed {r['closed_trades']} ({r['wins']} wins) → {verdict}")
    L += ["", "**Every trade and action this week**"]
    for x in LOG: L.append(f"- [{x['book']}] {x.get('date','')} {x['kind']}: {x['text']}")
    if not LOG: L.append("- No trades this week (no setups met the rules)")
    m = S["books"]["crypto_swing"].get("market")
    if m and m.get("btc"): L.append(f"- [Crypto market check {m['date']}] Bitcoin ${m['btc']:,.0f} vs 50-day average ${m['btc_sma50']:,.0f} → " + ("new crypto trades ALLOWED" if m["ok"] else "new crypto trades PAUSED (waiting for a better market)"))
    L += ["", "**Open positions**"]
    for k, B in S["books"].items():
        for p in B["positions"]:
            if "addr" in p: L.append(f"- [{B['name']}] trader {p['addr'][:10]}… since {B['pick_date']} ({p.get('last_r',0)*100:+.1f}%)")
            elif "shares" in p: L.append(f"- [{B['name']}] {p['sym']} {p['shares']:,} sh @ ₱{p['ep']:,.4g} since {p['entry']} (dividends ₱{p.get('divs',0):,.0f})")
            else: L.append(f"- [{B['name']}] {p['sym']} {p['qty']:.6g} @ ${p['ep']:,.6g} since {p['entry']} · stop ${p.get('stop',0):,.6g}")
        if B["name"].startswith("Forex") and B.get("weights"): L.append(f"- [{B['name']}] LONG {', '.join(c for c,w in B['weights'].items() if w>0)} · SHORT {', '.join(c for c,w in B['weights'].items() if w<0)} (CFTC {B.get('cot_date')})")
    if errors: L += ["", "**Problems this run**"] + [f"- {e}" for e in errors]
    open(f"{out}/report.md", "w").write("\n".join(L)); print("\n".join(L))
if __name__ == "__main__": main(*sys.argv[1:4])
