**HANDOFF — Max and Mark's projects (updated 8 Nov 2026)**
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

**Where things live now (GitHub account navigator-isle SUSPENDED 7 Nov 2026)**
- Max phone app → Cloudflare Pages: https://max-app-axv.pages.dev (zip upload from phone)
- Max backend → Cloudflare Worker `max-ai-backend`: https://max-ai-backend.mjgaly-mg.workers.dev (live version max-worker-2026-11-15h)
  - D1 database `max-memory` (binding MAX_MEMORY): notes, memory, settings, reports
  - ALLOWED_ORIGIN = https://max-app-axv.pages.dev
  - Hourly cron 45 * * * *: agents' weekly reports, Guard daily check, notes fact-check, seeding core notes
- Passage Planner website → Cloudflare Pages: https://passage-planner-6pm.pages.dev (privacy: /privacy.html — update in Play Console)
- Quick Draft Calculator → still on GitHub account draft-calculator (not suspended): draft-calculator.github.io/Draft-Calculator/ · spare copy zip ready for Pages project `quick-draft`
- Hobby Isle → hobbyisle.com on Cloudflare Pages (may be linked to suspended repo navigator-isle/hobbyisle → live, but no new deploys; no code copy here)
- Officer checklist app → Netlify (check whether linked to a GitHub repo)

**Not live yet (needs a laptop, or GitHub back)**
- Worker version max-worker-2026-11-16a+: serves app itself, weekly Gmail backup also attaches all code (max-code zip), /api/backup/code, new site addresses for Guard
- Deploy: `node build.mjs` then `npx wrangler deploy` (deploy.bat / deploy.sh; first time `wrangler login` in his browser)
- Phone-only updates: rebuild site → zip site/ without _src → he uploads to Pages project max-app ("Create deployment")

**Paused**
- Paper trader (GitHub Actions + trader-data branch) — paused until GitHub returns (his choice); history only on GitHub
- Passage Planner Android auto-builds / Play upload (GitHub Actions)
- Max's GitHub features (project code updates, build checks, trading ideas write)
- 4+ local commits not pushed (GitHub refuses) — push when account is restored

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

**Open next steps**
1. Upload latest max-app.zip (new site addresses + project-list migration) to Pages project max-app
2. Check Hobby Isle (Cloudflare → hobbyisle → Settings → Build: linked repo?) and Netlify officer-checklist site (linked repo?)
3. Update Passage Planner privacy URL in Play Console
4. When a laptop or GitHub is available: deploy the new Worker; push local commits; restart trader
5. Optional: "beyond the convention" (US/Philippine rules) for STCW and MLC notes
