---
tags: [trading, swing-trading, research, paper-trading, max]
---
**Trading agent report — swing trading, 198 setups (8 Nov 2026)**
Done by Claude acting as Max's Trading agent. Paper money only — not financial advice; past results don't promise future results.

**What was tested**
- 11 entries × 3 trailing stops × with/without trend filter × 3 markets = **198 setups**
- Entries: Donchian breakout 20/55/100 days · MA cross 10/50, 20/100, 50/200 · RSI(2) pullback · reclaim of the 20-day MA in an uptrend · 52-week high · volatility-squeeze breakout · 60-day momentum turn
- Exit: trailing stop only (highest close since entry − 2, 3 or 4 × ATR; only moves up) → small losses, winners run
- Risk: each trade sized so a stop-out loses 1% of the account · max 8 positions · max 25% in one position · no leverage
- "Only trade when aligned": trend filter = BTC (crypto) / PSEi (PSE) above its 200-day average; forex trades only with its own 200-day trend
- Costs both sides: crypto 0.15% · PSE 0.55% · forex/gold ~1 pip
- Settings ranked on older years only; judged on unseen years (crypto 2022 → Nov 2026 · PSE 2017 → Mar 2021 · forex & gold 2019 → Mar 2022)

**Results on unseen years**
- **Crypto: 66 of 66 setups made money** · median +53% · breakouts with tight trailing stops are best
- **PSE: 4 of 66 made money** · median −21% · best +4% · no swing edge in Philippine blue chips 2017–2021
- **Forex & gold: 28 of 66 made money** · median −1% · best +13% (RSI2 pullback) · without leverage the moves are too small

**MAX-SWING-1 (crypto) — chosen by rule from older years**
- Rule: Donchian-20 breakout (close above the last 20 days' highest close), trailing stop 2–3 × ATR, run as 4 equal parts (2× and 3× ATR, with and without the BTC trend filter)
- 2022 → Nov 2026: **+98% total · 15% a year · biggest drop −34%** (buy & hold: −4%, drop −67%)
- Trades: 955 · wins only 36% · **average win +3.4R vs average loss −1.0R** · best trade +77R → exactly "few big wins, many small losses"
- By year: 2022 −18% · 2023 +44% · 2024 +91% · 2025 −4% · 2026 −8%
- Single best part (Donchian-20, 2×ATR, trend filter): +161%, drop −35% — shown for information; picking it now would be choosing after seeing the answer
- Risk per trade: 0.5% → +107%, drop −25% (best balance) · 1% → +161%, drop −35% · 2% → +142%, drop −38% (more risk didn't pay more)
- Double costs: still +136%

**Honest warnings**
- Survivorship: the 8 coins are survivors → real results somewhat lower
- Results lean on a few huge trends (2023–2024); flat or choppy years lose a little (2025–2026)
- Long losing streaks are normal: with 36% wins, 10+ losses in a row will happen
- Not tested: dividend capture (no PSE dividend history that overlaps the price data), FX carry (no interest-rate data), copy trading (no trader records)

**Main trading plan for Max (paper first)**
- Crypto: MAX-SWING-1 + MAX-COMBINED-1 side by side; risk 0.5% per trade to start
- PSE: no strategy passed — stay in research; collect fresh daily data (30-min feed running since Sep 2026)
- Forex & gold: probation only (RSI2 pullback with 2×ATR trail) — needs fresh daily data
- Review monthly; a strategy is dropped if it loses more than its worst back-test drop

**Paper signal now (data to 6 Nov 2026)**
- BTC $75,747 · above its 200-day average ($73,191) → trend filter ON
- No open trade: entry when BTC closes above **$84,023** (20-day high)
- Then: initial stop = entry − 2 × ATR (ATR ≈ $1,459 → stop ≈ $81,100) · trail it up as price rises · size so a stop-out loses 0.5–1% of the paper account
- Other coins: prices stop mid-October → no signals until fresh data

**Sources**
- Turtle / Donchian rules: https://www.stockopedia.com/content/turtle-trading-rules-trend-following-investing-based-on-20-55-day-highs-58024
- Trend following in crypto (a decade of evidence): https://ar5iv.labs.arxiv.org/html/2009.12155
- Momentum in crypto: https://www.journals.vu.lt/BATP/en/article/view/44540
- Connors RSI(2): https://www.luxalgo.com/library/concept/rsi-2/
- Data: https://github.com/coinmetrics/data · https://github.com/rcaljouw/btc-price-history · https://github.com/carlo01092/pse · https://github.com/ejtraderLabs/historical-data
