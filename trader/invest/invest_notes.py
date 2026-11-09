# Max's Investments notes (from the ₱100,000 plan doc, 9 Nov 2026). Used by organize_v2.py.
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from options import table
DOC = 'https://claude.ai/artifact/8vNCRUjsWiArZY7qYXHrdP'
NOTES = {}
NOTES['1 My investment plan (₱100,000, Nov 2026)'] = (['investments', 'plan', 'core'], f'''**My investment plan — ₱100,000 (made 9 Nov 2026)**
- Full plan with every option and source: {DOC}
- Examples worked out from rates checked 4–9 Nov 2026 — not personal financial advice; Mark decides

**Market now**
- Inflation 7.8% (October 2026); BSP rate 5.50% after a 0.50 hike in October, more possible in December
- Almost every safe option earns less than inflation; MP2 comes closest → keep fixed deposits short (6 months)

**Plan A — Safe (every peso protected): about ₱5,800 in year 1**
- First month: all ₱100,000 in Maya Savings new-user 15% promo (sign up + upgrade + deposit by 30 Nov 2026) → about +₱800
- ₱30,000 OwnBank savings 3.80% (emergency money, any day; upgrade account — basic stops at ₱50,000) → ₱912
- ₱30,000 Metrobank Online Time Deposit 6 months, up to 6% → ₱1,440
- ₱40,000 Pag-IBIG MP2, 7.12% (2025), tax-free, 5 years, compounded → ₱2,848

**Plan B — Safe + REITs: about ₱5,350 + REIT price change**
- ₱20,000 OwnBank · ₱20,000 Metrobank time deposit · ₱30,000 MP2 · ₱30,000 PSE REITs (AREIT, DDMPR, FILRT, MREIT; 5.3–6.9% yield)

**Plan C — Growth: about ₱7,350 on average (some years lose)**
- ₱15,000 OwnBank · ₱35,000 MP2 · ₱50,000 PSE dividend strategy (8.8% a year average 2014–2026, worst drop −23.5%) — only after the paper test proves itself

**Rules**
- Re-check every 6 months when the time deposit ends; move to the best rate
- Emergency money in more than one bank; e-wallet balances are not PDIC-insured
- Taxes: 20% on deposit interest and bond coupons; MP2 and SSS Pension Booster tax-free; PSE dividends 10%''')
NOTES['2 Investment options compared (Nov 2026)'] = (['investments', 'options'], '''**Investment options compared — best score first (rates checked 4–9 Nov 2026)**
- Score = 30% net return, 25% safety, 15% legitimacy, 10% reviews, 10% liquidity, 10% effort; "net" = what ₱100,000 earns in a year after tax

''' + table())
NOTES['3 Promos and what they really pay (Nov 2026)'] = (['investments', 'promos'], '''**Promos — what they really pay on ₱100,000**
- Maya Savings new users: 15% (3% base + 12% boost) on the first ₱100,000 for one calendar month → about ₱800 extra after tax; sign up, upgrade, deposit ≥ ₱1,000; ends 30 Nov 2026
- Maya existing users: 5% (₱250 spent) · 6% (₱1,000) · 7% (₱3,000 Easy Credit) · 8% (5 in-store card buys) · 10% (₱25,000 spent) · 12% (₱35,000) · 13–15% select users (loan, Maya Black card, payroll); monthly; first ₱100,000 only
- Maya Personal Goals: 4% / 4.5% / 5% / 6.5% / 8% on each ₱20,000 slice (about 5.6% on ₱100,000); nothing above ₱100,000 per goal; goals opened Oct–Dec 2026
- CIMB Earn More (also GCash GSave): up to about 4.15% only on new money added (up to ₱100,000 of balance growth); ends 31 Dec 2026
- GCash GFunds: ₱20–₱30 cashback or raffles only (e.g. IPONALO Jun–Jul 2026: ₱30 for a first ₱2,000 buy held 30 days) — not interest
- UNO 6% 3-month time deposit promo ended 31 May 2026; Tonik time deposits cut from 8% (Feb 2026) to up to 5% (Aug 2026)''')
NOTES['4 Investment warnings'] = (['investments', 'warnings'], '''**Investment warnings (Nov 2026)**
- More than about 8% a year with no risk is not real today; check every company on the SEC website first (SEC watchlist of Ponzi and unregistered schemes)
- SEC flagged 10 unregistered crypto exchanges (OKX, Bybit, MEXC, KuCoin, Bitget, Phemex, CoinEx, BitMart, Poloniex, Kraken) on 4 Aug 2025; Binance and Bybit apps left Google Play PH in Feb/Mar 2026
- PDIC covers bank deposits up to ₱1,000,000 per depositor per bank (since 15 Mar 2025); GCash and Maya wallet balances are NOT covered
- Maya users reported locked accounts and frozen funds (Aug 2025); the BSP investigated GCash over unauthorized deductions (2024) → keep emergency money in two banks
- VUL: high charges in early years; term insurance + MP2 is usually cheaper
- PERA: its 5% tax credit is worthless for tax-exempt seafarer income; money locked until 55
- Long-term bonds and bond funds lose value while rates rise (ATRAM bond funds 0–2% in the last year)''')
