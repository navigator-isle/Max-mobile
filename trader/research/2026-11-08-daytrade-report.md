---
tags: [trading, day-trading, research, paper-trading, max]
---
**Trading agent report — day trading in 3 markets (8 Nov 2026)**
Done by Claude acting as Max's Trading agent. Paper money only — not buy/sell advice.

**Verdict in one line**
- No day-trading strategy is solidly profitable after real costs in any of the 3 markets. One crypto setup works only with very low fees; forex is about break-even; PSE day trading loses because costs are too high.

**Data used**
- Crypto: Bitcoin 1-minute prices (Bitstamp) 2018 → 8 Nov 2026, grouped into 15-minute bars
- Forex: EURUSD, GBPUSD, USDJPY, AUDUSD hourly 2012 → Mar 2022; EURUSD 15-min Mar → Sep 2026; 7 majors daily 2000 → 30 Oct 2026
- PSE: 21 blue chips every 30 min, 25 Sep → 6 Nov 2026 (only 6 weeks); daily archive 2009 → Mar 2021

**Rules (honest testing)**
- Every trade opens and closes the same day
- Real costs: crypto 0.24% round trip (Binance spot 0.1% fee each side + slippage); forex ~1 pip; PSE ~0.9% (COL fees, sales tax, spread)
- Settings picked on older years only; judged on later, unseen years

**Crypto — Bitcoin (judged 2024 → Nov 2026)**
- Opening-range breakout (buy when price breaks the first 2 hours' high; only on days after BTC closed above its 50-day average; stop half the range below): −38% with normal spot fees
- Same strategy, lower fees: 0.04% → +60% · 0.08% → +33% · 0.10% → +21% · 0.14% → 0% · 0.20% → −25%
  - By year at 0.10%: 2024 +20%, 2025 +5%, 2026 −5% (fading)
- Intraday momentum (first 9 hours up → hold to midnight): −36%
- Hourly RSI(2) dip-buy: −51%
- **Verdict:** only the breakout has an edge, and fees decide everything. With normal Binance spot fees it loses. Not solid.

**Forex (judged 2019 → Mar 2022, plus EURUSD 2026)**
- London breakout (break of the Asian-session range, both directions): 4 pairs together +2% over 3 years (break-even); EURUSD 2026 +1.5%
- London breakout with daily trend filter: −34% (worse)
- Asian-session mean reversion (fade big moves at night): 4 pairs together +2%; AUDUSD alone +6.4% (could be luck)
- Daily forex strategies (trend, momentum, breakout, pullbacks; 7 majors, 2018 → Oct 2026): best +3% total (RSI2) — none worth trading
- **Verdict:** no reliable edge after costs. Forex majors behave almost randomly at these speeds.

**PSE (6 weeks of 30-minute prices, 21 blue chips)**
- Intraday momentum (up >0.5% by 11:00 → hold to close): +5.7% BEFORE costs, −74% after costs
- Morning-high breakout: −18% before costs, −95% after
- Swing 2–5 days (RSI2 / Bollinger) on 13 blue chips 2018 → 2021: −15% / −24%
- **Verdict:** PSE day trading cannot beat ~0.9% round-trip costs. Only 6 weeks of intraday data — too short to prove anything either way.

**What Max does now (paper)**
- Crypto main strategy stays **MAX-COMBINED-1** (daily, not day trading): +86% on 2022 → Nov 2026 vs −4% buy & hold
- Probation books (paper only, prove forward before trusting):
  - BTC opening-range breakout — tracked at both 0.24% and 0.10% costs
  - AUDUSD Asian-session mean reversion — needs live hourly FX prices (not reachable now)
  - PSE intraday momentum — keep collecting 30-min data; re-test after 6 months
- Today: BTC is below its 50-day average → the breakout's trend filter is OFF → no day trades

**What would make day trading viable**
- Lower crypto fees: maker/limit orders or a fee tier ≤0.10% round trip — check your exchange's fee schedule before any real use
- More intraday data (PSE 6+ months, fresh forex hourly)

**Sources**
- Opening-range breakout study (Zarattini & Aziz, "Can Day Trading Really Be Profitable?"): https://papers.ssrn.com/abstract=4416622
- Intraday momentum (Gao, Han, Li, Zhou, JFE 2018): https://econpapers.repec.org/RePEc:eee:jfinec:v:129:y:2018:i:2:p:394-414
- Connors RSI(2): https://www.luxalgo.com/library/concept/rsi-2/
- COL Financial fees: https://colfinancial.freshdesk.com/support/solutions/articles/6000073098-what-are-the-fees-charged-for-executing-trades-buy-and-sell-
- Data: BTC 1-min https://github.com/ff137/bitstamp-btcusd-minute-data · FX hourly https://github.com/ejtraderLabs/historical-data · EURUSD 15-min 2026 https://github.com/getdata-finance/eurusd-15m-ohlcv-forex-historical-data · FX daily (FRED) https://github.com/datasets/exchange-rates · PSE 30-min https://github.com/zhameersheraz/ph-stocks · PSE archive https://github.com/carlo01092/pse
