**Max — setup notes (updated 30 Oct 2026)**

**How updates work now**
- Every change on GitHub (`main`) is tested automatically: 295 checks covering the backend, voice commands and phone screens.
- The backend deploys to Cloudflare only if all tests pass. The website updates through GitHub Pages.
- Nothing is pasted by hand anymore.

**Brain**
- Gemini Flash first, Flash-Lite as automatic backup.
- If a `GEMINI_MODEL` variable exists in Cloudflare, it forces that model. Delete it to use Flash.
- Optional Claude: add a Cloudflare secret `ANTHROPIC_API_KEY`. Max then uses Claude Haiku for conversation and falls back to Gemini. To use Sonnet, add a text variable `CLAUDE_MODEL` set to `claude-sonnet-5-5`.

**Google sign-in + Calendar + Tasks (one-time, about 10 minutes)**

**1. Create a Google Cloud project**
- Open console.cloud.google.com and sign in with your Gmail
- Tap the project picker at the top → **New project** → name it `Max` → **Create**, then select it

**2. Turn on the two APIs**
- Menu ☰ → **APIs & Services** → **Library**
- Search **Google Calendar API** → **Enable**
- Search **Google Tasks API** → **Enable**

**3. Set up the sign-in screen**
- Menu ☰ → **Google Auth Platform**, or **APIs & Services → OAuth consent screen** → **Get started**
- **App name:** `Max` · **Support email:** your Gmail
- **Audience:** **External** · **Contact email:** your Gmail → agree → **Create**
- **Audience** → **Publish app** → confirm. This keeps you signed in; in "Testing" mode Google signs you out every 7 days.

**4. Create the sign-in key**
- **Clients** (or **Credentials**) → **Create client**
- **Type:** **Web application** · **Name:** `Max`
- **Authorized redirect URIs** → **Add URI**, and enter exactly:
  `https://max-ai-backend.mjgaly-mg.workers.dev/auth/google/callback`
- **Create** → copy the **Client ID** and **Client secret**

**5. Give them to Max (Cloudflare)**
- Cloudflare → **max-ai-backend** → **Settings** → **Variables and Secrets** → **Add**:
  - **Secret** `GOOGLE_CLIENT_ID` = the Client ID
  - **Secret** `GOOGLE_CLIENT_SECRET` = the Client secret
  - **Text** `MAX_OWNER_EMAIL` = the Gmail address that may use Max
- Deploy if asked

**6. Sign in**
- Max → hold the circle → **Settings** → **Sign in with Google**
- Google will say "Google hasn't verified this app". That's normal for a personal app: tap **Advanced** → **Go to Max**
- Allow **Calendar** and **Tasks**, and you're returned to Max: "Signed in with Google ✓"

**After signing in**
- **Passcode:** no longer used. Each phone signs in with Google once.
- **Only your account:** only `MAX_OWNER_EMAIL` can sign in. Any other Google account is refused.
- **Settings:** has **Sign out** (this phone) and **Disconnect Google**, which brings the passcode back so you can never be locked out.

**Things to say**
- "What's on my schedule today / tomorrow / this week?"
- "Remind me Friday at 9 to renew my passport" adds a calendar event, and your phone notifies you at that time
- "Add buy safety shoes to my to-do list" adds it to Google Tasks
- "Undo" removes the last thing Max added

**Security**
- No keys are in these files
- Google keys stay in Cloudflare
- Max's Google access is stored encrypted in his database
- Sessions are stored only as hashes
