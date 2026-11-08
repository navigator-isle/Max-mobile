---
tags: [trading, research, paper-trading, max]
---
**Trading agent report — strategy research & tests (8 Nov 2026)**
Done by Claude acting as Max's Trading agent. Paper money only — no real trades, not buy/sell advice.

**Data used**
- Crypto: BTC, ETH, BNB, XRP, ADA, DOGE, LINK, LTC daily closes (Coin Metrics archive + daily top-100 snapshots; BTC from Bitstamp to 6 Nov 2026)
- PSE: 13 blue chips (AC, ALI, BDO, BPI, GLO, ICT, JFC, MBT, MER, SM, SMPH, TEL, URC) — public archive only to 12 Mar 2021
- Forex: no reachable data → not tested
- Copy trading: no public trader records reachable → not tested yet

**How tested (honest rules)**
- Signal on today's close, trade at the NEXT close (no look-ahead)
- Costs on every trade: crypto 0.15%/side (fee + slippage), PSE 0.55%/side (COL fees, sales tax, slippage)
- Settings chosen ONLY on older years (crypto 2016–2021, PSE 2009–2017); judged on unseen years (crypto 2022–Nov 2026, PSE 2018–Mar 2021)
- Combined strategy picked by rule from the older years only — no peeking at 2022+

**Strategies tested (sources below)**
- SMA trend (price above moving average)
- Moving-average cross (fast above slow)
- Time-series momentum (positive return over N days)
- Donchian / Turtle breakout (new N-day high in, M-day low out)
- Connors RSI(2) pullback (RSI2 < 5/10 above SMA200, exit above SMA5)
- Bollinger band pullback
- Cross-sectional momentum rotation (top coins by recent return, weekly, with BTC trend filter)
- Volatility targeting overlay

**Crypto results on unseen years (2022 → Nov 2026)**
- Buy & hold: −3.9% total · biggest drop −67%
- Donchian 20/10: +42% · drop −36%
- SMA50 trend: +35% · drop −44%
- Momentum rotation (top 3, 14-day, BTC>SMA50): +188% · drop −48% (best, but one strategy alone is risky)
- RSI(2) pullback: +25% · drop only −6% (steadiest; good diversifier — to be proven forward, not added after the fact)
- **MAX-COMBINED-1 (Donchian + rotation + SMA, equal thirds): +86% · CAGR 13.6% · drop −39% · Sharpe 0.54**
- Stress tests: double costs +59%; one extra day delay +47%; both +26% — still positive, edge is thin but real
- Year by year (combined vs buy & hold): 2022 −21% vs −62% · 2023 +33% vs +90% · 2024 +109% vs +122% · 2025 −5% vs −24% · 2026 −11% vs −23%
- Pattern: loses less in bad years, gives up part of the best rallies

**PSE results (2018 → Mar 2021, a falling market)**
- Buy & hold blue chips: −6.6% · drop −42%
- All trend strategies lost money (SMA200 −30%, momentum −39%)
- Only pullback strategies were slightly positive: Bollinger +6.4% (drop −5%), RSI(2) +0.8%
- Verdict: no proven edge for PSE yet; data is old (2021) — need fresh PSE prices before trusting anything

**Warnings**
- Survivorship bias: the 8 coins are ones that survived to 2026 — real results would be somewhat worse
- 2016–2021 crypto numbers are huge because of the bull market — ignore them; only the 2022+ results count
- Past results don't promise future results

**Copy trading (plan, untested)**
- Add as a 4th sleeve when public trader records are reachable (Binance/Bybit/OKX lead traders or on-chain DEX traders)
- Only copy a trader's trade when MAX-COMBINED-1's BTC trend filter agrees; fixed small size; copy at the delayed price with fees
- Weekly: Copy vs Combined vs Copy+Filter → keep / watch / drop

**Paper trade started (8 Nov 2026)**
- Account: ₱100,000 pretend money, crypto, MAX-COMBINED-1
- Signal: BTC $75,747 (6 Nov) is below SMA50 $81,976 and broke its 10-day low → **100% cash, no trade**
- Next buy triggers: BTC close above $84,023 (20-day high) or above SMA50 (~$81,976) with positive 14-day momentum
- Other coins: data stops mid-October → held at 0 until fresh prices

**For Max at the next update**
- Import ledger `trader/research/2026-11-08-paper-ledger.json` as the crypto paper account's start
- Add MAX-COMBINED-1 as a strategy book; keep RSI(2) as a separate "candidate" book to prove forward
- PSE: re-run with fresh prices; until then paper-test only Bollinger/RSI(2)
- Re-run this research monthly; code in `trader/research/code/`

**Sources**
- Time-series & cross-sectional momentum in crypto: https://www.journals.vu.lt/BATP/en/article/view/44540
- A decade of trend following in crypto: https://ar5iv.labs.arxiv.org/html/2009.12155
- Common risk factors in crypto (Liu, Tsyvinski, Wu): https://cowles.yale.edu/sites/default/files/2022-10/LiuTsyvinskiWu2019%20COMMON%20RISK%20FACTORS.pdf
- Connors RSI(2) rules: https://www.luxalgo.com/library/concept/rsi-2/
- Turtle / Donchian 20–55 rules: https://www.stockopedia.com/content/turtle-trading-rules-trend-following-investing-based-on-20-55-day-highs-58024
- COL Financial fees: https://colfinancial.freshdesk.com/support/solutions/articles/6000073098-what-are-the-fees-charged-for-executing-trades-buy-and-sell-
- Data: Coin Metrics https://github.com/coinmetrics/data · BTC Bitstamp https://github.com/rcaljouw/btc-price-history · top-100 snapshots https://github.com/UrvishAhir1/daily-crypto-tracker-dataset · PSE archive https://github.com/carlo01092/pse
