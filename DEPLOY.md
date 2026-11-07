**Max — deploy & rebuild without GitHub**

**Where Max lives**
- One Cloudflare Worker, `max-ai-backend`, serves BOTH the phone app and the backend
  - App: https://max-ai-backend.mjgaly-mg.workers.dev/
  - Health check: https://max-ai-backend.mjgaly-mg.workers.dev/health
- Data (notes, memory, settings, reports) lives in Cloudflare D1 `max-memory` — not on GitHub
- Secrets (GEMINI_API_KEY, MAX_PASSCODE, Google, Groq…) live only in Cloudflare → Worker → Settings. They are never in these files.

**Deploy (laptop, once Node.js is installed from https://nodejs.org)**
- Windows: unzip the code backup, double-click `deploy.bat`
- Mac/Linux: run `./deploy.sh`
- First time only: a browser opens → sign in to Cloudflare → Allow. Nobody types a key.
- What it does: `node build.mjs` (builds `site/` + private code copy) then `npx wrangler deploy`
- Check: open /health → `version` is the new one, `app: served by this Worker`

**Backups (automatic, no GitHub)**
- Every week Max emails Gmail: `max-backup-DATE.json` (notes, memories, settings) + `max-code-DATE.zip` (all code)
- Any time: Max → Guard/Notes ⋯ → "Download all of Max's code (.zip)"
- Restore data: Max → Notes ⋯ → "Restore from a Max backup" → choose the .json
- Rebuild code: unzip `max-code-*.zip` → deploy as above (D1 data and secrets are still in Cloudflare)

**If Cloudflare itself were lost (worst case)**
- Create a Worker named `max-ai-backend` and a D1 database `max-memory`; put the new database_id in `wrangler.jsonc`
- Add the secrets again in Cloudflare (you type them there yourself)
- Deploy, open the app, enter the passcode, then restore the latest `max-backup-*.json`

**GitHub (optional now)**
- `.github/workflows` still work if the GitHub account comes back; nothing in Max needs them
- Paper trader ran on GitHub Actions — paused while GitHub is down
