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

**Paper plan since 11 Nov 2026 (Mark): 5 categories × ₱50,000 = ₱250,000**
- PSE: pse_dividend ₱50k (got +₱10k cash; nothing sold) · Forex: gold_trend ₱30k + fx_carry ₱20k (carry + 6-month trend, 9 currencies, monthly) · Crypto: crypto_swing ₱35k + btc_trend ₱15k · Copy: copy_steady ₱50k (top-10 steady Hyperliquid wallets, monthly, −20% stop per trader, 0.5%/month copy cost) · US: us_etf ₱50k (50% SPY trend + 50% top-4 of 8 ETFs by 6-month gain above 200-day, monthly)
- Weekly GitHub job .github/workflows/live-data.yml (trader/live/build_live.py) writes live/fx-rates.json and live/copy-steady.json to the trader-data branch; Max reads them
- US ETF test: trader/research/2026-11-11-etf-results.json; copy/forex tests: trader/research (8–9 Nov)
- Virtual investments: setting max_invest_paper, 4 × ₱100k (MP2, HYSA, bonds, time deposits), rules in VBOOK (worker.js), shown on the Investments screen

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

## Notes Max researches and fixes himself (18l, 11 Nov 2026)
- `/api/note-draft` {topic, topics} → Gemini + google_search writes a note in `NOTE_FORMAT` (FOLDER/TITLE/---NOTE---), converted by `mdToNoteHtml`. App intent `new_note` with a topic → `draftNote()`; blank editor only if research fails or `max_note_research` is off.
- `/api/note-improve` {note, instruction} → researched edit; refused (422) if the result is under 60% of the old note's length. App intent `improve_note` ("update/edit/improve/expand my X note …") → `improveNote()`, keeps the last 5 bodies in `n.history`; `undo_note_change` restores.
- Nightly fact-check (`notesDailyCheck`, 8 notes, 6,000-char parts): verdict wrong/update + issues with exact `find`/`replace` + web sources → `applyNoteFixes`, old body in `max_note_versions` (last 10 per note), check marked `fixed`. Never changes a note without sources. `/api/notes/undo-fix` {id} restores; the app shows "✓ Max corrected this note" with an Undo button.
- Attachments auto-file (`autoFileAttachment`): same-subject note (same title, or same folder + ≥60% title words) gets an "Update <date>" section, else a new note. "Discard" undoes (`lastFiled`). Setting `max_autofile` false turns it off.
- Meaning search: notes over ~3,200 chars also get section vectors (`vecChunks`, ≤24 × ~1,500 chars); score = best of note and sections. Index version `V.ver = 2` re-indexes once.
- Phone app auto-deploy: the last workflow step unzips max-app.zip (never site/_src) and runs `wrangler pages deploy --project-name max-app`. Needs "Cloudflare Pages: Edit" on CLOUDFLARE_API_TOKEN or a PAGES_API_TOKEN secret; it only warns if missing.

## Offline brain (18m app, 11 Nov 2026)
- `searchSections(q)` — BM25-style search over note sections (split at bold headings / h1-4 / hr, ≤~1,500 chars), max 2 sections per note. Used by `offlineAnswer(q)` (now async) whenever the phone is offline or the chat call fails with a network error.
- Offline brain: `web-llm.js` (= @mlc-ai/web-llm 0.2.88, Apache-2.0, self-contained ESM, loaded only on demand) runs `gemma-4-E2B-it-q4f16_1-MLC` (q4f32 if the GPU lacks shader-f16), 2.8 GB from huggingface.co/mlc-ai + wasm from raw.githubusercontent.com. State in localStorage `max_offline_brain`. Chrome's built-in `LanguageModel` (Prompt API) is used if available and Gemma isn't downloaded.
- Commands: "download offline brain" (+ "anyway" on mobile data), "offline brain status", "remove offline brain"; button in Notes ⋯ menu.
- sw.js v4: only deletes old `max-app-*` caches (never `webllm/*` model caches); serves `web-llm.js` cache-first from `max-offline-lib`.
- Tested: e2e43 with a stand-in engine; the real library loads in Chromium. A real model run needs Mark's phone (WebGPU) — not tested here.
