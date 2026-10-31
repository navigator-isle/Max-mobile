**Max — setup notes (updated 30 Oct 2026)**

**How updates work now**
- Every change on GitHub (`main`) is tested automatically: 420 checks covering the backend, voice commands and phone screens.
- The backend deploys to Cloudflare only if all tests pass. The website updates through GitHub Pages.
- Nothing is pasted by hand anymore.

**Brain**
- Gemini Flash first, Flash-Lite as automatic backup.
- If a `GEMINI_MODEL` variable exists in Cloudflare, it forces that model. Delete it to use Flash.
- Optional Claude: add a Cloudflare secret `ANTHROPIC_API_KEY`. Max then uses Claude Haiku for conversation and falls back to Gemini. To use Sonnet, add a text variable `CLAUDE_MODEL` set to `claude-sonnet-5-5`.

**Your projects**
- **Max knows your apps:** Max, Passage Planner, Quick Draft Calculator, Hobby Isle, Officer Checklist, SeaLex, Deck Board Reviewer, Voyage Abstract, PH Money Scanner and Sulit o Hindi. Add or remove them in ⚙ Settings → My projects.
- **Things to say:**
  - "Open SeaLex"
  - "Are my apps up?"
  - "What passage plans do I have?"
  - "On Hobby Isle, add a Pokémon menu"
  - "Any requests for Hobby Isle?"
  - "Publish pull request 13 on Hobby Isle", then "yes, merge it"
- **Can't be checked or changed from outside:** apps that live inside Claude open with your Claude account. Their change requests are saved in your notes under Projects.

**📎 Send Max a file**
- **How:** tap 📎 at the top, then pick a photo, screenshot, PDF or text file.
- **What Max does:**
  - Reads it and says what it is, plus the key deadline
  - Shows the key facts, dates and amounts on screen
- **Then say:**
  - "When does it expire?" or any other question about the file
  - "Save it" to file it in your notes under the right topic, with the full text
  - "Discard it" to throw it away
- **Rules:** nothing is saved until you say so. Word and Excel files: save them as PDF first. Up to about 19 MB.
- **Cost:** free on Gemini Flash.

**Display screen**
- **What it does:** say "show me … on the screen" or "display …". Max checks your notes first and shows them. If your notes have nothing, he looks it up on the web.
- **Saving:** web findings go into your notes only after you say "approve".
- **Things to say:**
  - "Show me SOLAS chapter II-2 on the screen"
  - "Display my Gundam list"
  - "Search the web too" (while something is on the screen)
  - "Search about the BWM D-2 standard and add it to my notes"

**Projects overview**
- **Things to say:**
  - "How many projects do I have?"
  - "How are my projects doing?"
  - "What's missing on Hobby Isle?"
- **In the menu:** hold the circle, then tap **▦ Overview**.
- **What each project's card shows:**
  - Whether it's online
  - Visitors and sales
  - Notes about it
  - What's missing, for example no GitHub repo, no visitor tracking, change requests waiting, no sales logged, or living inside Claude where Max can't manage it

**Dashboard: visitors and sales**
- **Where:** the Projects screen shows tiles at the top for visitors today, sales this month and sites up. Each project card shows its own numbers.
- **Things to say:**
  - "How many visitors on Hobby Isle today?"
  - "How are my sites doing?"
  - "Log 4.20 dollars Amazon sales for Hobby Isle"
  - "How much did I earn this month?"
- **Sales log:** Amazon doesn't let personal accounts pull sales automatically, so you tell Max what you earned. Each entry is saved as a note under **Projects › Sales log**, so it syncs and backs up like any note.

**Connect visitor numbers (one-time, about 3 minutes)**
- **Create the key:** Cloudflare → your photo (top right) → **My Profile** → **API Tokens** → **Create Token** → **Create Custom Token**
  - **Name:** `Max analytics`
  - **Permissions:** **Account** · **Account Analytics** · **Read** (nothing else)
  - **Account Resources:** your account
  - **Continue to summary** → **Create Token**, then copy the key
- **Give it to Max:** Cloudflare → **Workers & Pages** → **max-ai-backend** → **Settings** → **Variables and Secrets** → **Add**
  - **Type:** **Secret**
  - **Name:** `CF_ANALYTICS_TOKEN`
  - **Value:** the key
- **What it allows:** this key can only read visitor counts. It can't change any site, DNS or setting.
- **Needs:** the site must have Cloudflare **Web Analytics** turned on. If Hobby Isle shows 0 visitors all the time, it isn't on yet; turning it on is your choice, and Max doesn't change it.
- **Other sites:** to track another site, tick **Show visitor numbers** when you add it in Settings → My projects.

**Optional: let Max send change requests to GitHub (about 5 minutes)**
- **Create the key:** github.com → your photo → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
  - **Name:** `Max` · **Expiration:** 1 year
  - **Repository access:** **Only select repositories** → `Max-mobile`, `hobbyisle`, `navigator-isle.github.io`
  - **Permissions:** **Issues** read and write · **Pull requests** read and write · **Contents** read and write
  - **Generate**, then copy the key
- **Give it to Max:** Cloudflare → **max-ai-backend** → **Settings** → **Variables and Secrets**
  - **Secret** `GITHUB_TOKEN` = the key
  - **Text** `MAX_GITHUB_REPOS` = `navigator-isle/Max-mobile,navigator-isle/hobbyisle,navigator-isle/navigator-isle.github.io`
- **What Max can then do:** file change requests as GitHub issues, list them along with any ready fixes, and publish a fix only after you say "yes, merge it" and its tests have passed. He never touches domains, DNS or account settings.

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
