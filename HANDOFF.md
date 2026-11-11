**HANDOFF — Max and Mark's projects (updated 9 Nov 2026)**
Read this first in any new chat or session. Short on purpose; details are in SETUP.md and DEPLOY.md.

**Who**
- Mark Jun — seafarer (deck officer), Philippines (UTC+8). Works from a Samsung phone in Chrome; laptop only sometimes. Can't do manual dev work.
- Not a native English speaker — read his messages charitably.
- Max = his Jarvis-like secretary, second brain and second in command.

**Ground rules (always)**
- Preserve working features; don't rewrite everything
- Never expose the Gemini API key or any secret; never type or ask for passwords/keys (he enters them himself in Cloudflare)
- Risky actions need his clear "yes"
- Don't touch Hobby Isle's DNS or website settings
- Don't claim something works until it's tested
- Paper trading only; no real trades, no buy/sell advice
- Email: trash only, never permanent delete
- Backups go to his Gmail, never to a public repo

**Where things live now (GitHub account navigator-isle was suspended 7 Nov 2026; restored 10 Nov 2026 — pushes to main auto-deploy the Worker after tests)**
- Max phone app → Cloudflare Pages: https://max-app-axv.pages.dev (zip upload from phone)
- Max backend → Cloudflare Worker `max-ai-backend`: https://max-ai-backend.mjgaly-mg.workers.dev (live version max-worker-2026-11-15h)
  - D1 database `max-memory` (binding MAX_MEMORY): notes, memory, settings, reports
  - ALLOWED_ORIGIN = https://max-app-axv.pages.dev
  - Hourly cron 45 * * * *: agents' weekly reports, Guard daily check, notes fact-check, seeding core notes
- Passage Planner website → Cloudflare Pages: https://passage-planner-6pm.pages.dev (privacy: /privacy.html — update in Play Console)
- Quick Draft Calculator → still on GitHub account draft-calculator (not suspended): draft-calculator.github.io/Draft-Calculator/ · spare copy zip ready for Pages project `quick-draft`
- Hobby Isle → hobbyisle.com on Cloudflare Pages (may be linked to suspended repo navigator-isle/hobbyisle → live, but no new deploys; no code copy here)
- Phone app features since 8 Nov: My songs (own music, no ads), music pauses for the mic, Deal Finder (🛒)
- Officer checklist app → Netlify (check whether linked to a GitHub repo)

**Updates without laptop or GitHub (from 9 Nov 2026)**
- One-tap updater: Worker `max-updater` (updater.js; secrets CF_API_TOKEN + UPDATE_PASS that Mark adds himself) installs `_update/worker.js` from max-app-axv.pages.dev after a SHA-256 check; the app (⚙ → Update Max's server) checks /health and calls /rollback if the new version fails
- Release = `node build.mjs` → max-app.zip (app + _update) → Mark uploads it to Pages project max-app → taps Install
- Phone steps: UPDATE-STEPS.md · Bundle max-worker-2026-11-17a: Shopping agent (#12), store-page prices for Deal Finder, 24 Trading seed notes + 24 chat memories, always-on typing box, Trading agent → dashboard

**Older plan (laptop deploy, kept for reference)**
- Worker version max-worker-2026-11-16a+: serves app itself, weekly Gmail backup also attaches all code (max-code zip), /api/backup/code, new site addresses for Guard
- Deploy: `node build.mjs` then `npx wrangler deploy` (deploy.bat / deploy.sh; first time `wrangler login` in his browser)
- Phone-only updates: rebuild site → zip site/ without _src → he uploads to Pages project max-app ("Create deployment")

**Rule: backup data sources (Mark, 11 Nov 2026)**
- Every outside data source needs backups so no job stops because one site is down. New live data → use firstOk() in worker.js (main source first, then backups; it reports which answered)
- Now: crypto candles CRYPTO_SOURCES (Binance, OKX, Coinbase, Kraken, KuCoin, Gate.io) · crypto price now cryptoSpotUsd (same 6) · USD/PHP usdPhp and fxRates (ECB/Frankfurter, ExchangeRate-API, currency-api) · past-day rate fxOnDate (Frankfurter, currency-api dated copy) · PSE bars: PSE Edge → saved bars (S.pseHist) → TradingView (finished days only, after 4 pm Manila) → Phisix (value only, never fills) · PSE price now: PSE Edge → TradingView → Phisix → web search
- No good free backup yet: PSE dividend list (PSE Edge only; last saved list is kept), 1-year forex history for notes (retries next day), investment rate pages (keep last data)

**Paused**
- Paper trading now: Claude's Sunday scheduled run + dashboard https://claude.ai/artifact/25fnUcKASedJmKSZBRbW9H (MAX-MASTER-3; engine and state in its database `paper/`); email to his Gmail
- Old GitHub Actions paper trader retired (workflow disabled 11 Nov 2026; Max's server paper engine is the only trader)
- Passage Planner Android auto-builds / Play upload (GitHub Actions)
- Max's GitHub features (project code updates, build checks, trading ideas write)
- All local commits pushed 10–11 Nov 2026 (18f, 18g live)

**Backups**
- Weekly Gmail: max-backup-DATE.json (data) — code zip added once new Worker is deployed
- Google Drive: Mark-Backup-Kit-2026-11-08.zip (Max, Passage Planner web + Android incl. Play upload key, Quick Draft, Obsidian notes) — PRIVATE
- GitHub appeal: support.github.com/contact/reinstatement (or /contact/cannot_sign_in)

**Max's brain & agents (summary)**
- Free models: Gemini chain (3.5/3.8 flash …) → Groq → Workers AI; hard questions → strongest free model; second-AI check
- 11 agents, one weekly email each: Notes & Attachments (priority #1), Researcher, Websites, Apps, Security/Guard, Trading (#2: PSE, crypto, forex — paper), Investments, Business, Music, Schedule, Email
- Core notes (tag `core`): SOLAS 1974, MARPOL 73/78, STCW 1978 (Maritime › IMO › Conventions), MLC 2006 (Maritime › ILO › Conventions) — regulation by regulation, sources checked; long notes sent to the AI by matching section

**Notes format he likes (Obsidian)**
- Bold headers, hyphen bullets, short maritime-specific key points, no filler
- What is → History → Applies to → chapters/regulations with key points, resolutions & dates → Key Point → Sources (checked date)

**Bundled update (built 9 Nov 2026, waiting for Mark to install with the steps in UPDATE-STEPS.md)**
- One-tap updater (small updater Worker + Cloudflare token he pastes himself) so future updates need no laptop/GitHub
- New Worker version (serves app, code in weekly Gmail backup), brain improvements (needs his examples + /health screenshot)
- Deal Finder as a full server agent (weekly email report, structured prices); app version already works via /api/research
- Permanent keyboard (always-visible text box) on Max's home screen
- Option 1 (his choice, free): teach Max Claude's working method — Deal Finder reads the store's own product page for the EXACT variant (Shopify /products/<handle>.json, JSON-LD), compares with the brand's current official price, gives link + time read for every price, flags anything not confirmed live. No paid Claude API for now.
- Import into Max's memory everything from Claude chats since 8 Nov — Claude acts as Max meanwhile (his standing instruction); see Claude memory /areas/max-secretary-app.md

**Open next steps**
1. Upload latest max-app.zip (new site addresses + project-list migration) to Pages project max-app
2. Check Hobby Isle (Cloudflare → hobbyisle → Settings → Build: linked repo?) and Netlify officer-checklist site (linked repo?)
3. Update Passage Planner privacy URL in Play Console
4. Done 11 Nov 2026: Worker deploys from GitHub; commits pushed; old trader stays retired (Max's own engine trades)
5. Optional: "beyond the convention" (US/Philippine rules) for STCW and MLC notes
