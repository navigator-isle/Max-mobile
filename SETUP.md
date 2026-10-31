**Max — setup notes (updated 30 Oct 2026)**

**How updates work now**
- Every change on GitHub (`main`) is tested automatically: 612 checks covering the backend, voice commands and phone screens.
- The backend deploys to Cloudflare only if all tests pass. The website updates through GitHub Pages.
- Nothing is pasted by hand anymore.

**Brain**
- **Order:** Gemini Flash first, then Flash-Lite, then two free backups: **Groq** (needs the secret `GROQ_API_KEY`) and **Cloudflare Workers AI** (already on; no key needed).
- **What the backups can't do:** they only answer text. Reading photos, PDFs or videos and web research still need Gemini, and Max says so when Gemini's daily limit is used up.
- **Groq key (free):** console.groq.com → sign in with Google → **API Keys** → **Create API Key**. Add it in Cloudflare → max-ai-backend → **Settings** → **Variables and Secrets** as **Secret** `GROQ_API_KEY`.
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

**📈 Markets: stocks, crypto, currencies**
- **Things to say:**
  - **Prices:** "How much is Bitcoin?", "how much is SM?", "ETH price today"
  - **Watchlist:** "Add SM to my watchlist as blue chip" (tiers: blue chip, middle, speculative), "remove ETH from my watchlist", "show my watchlist" (prices plus a 30-day chart for each)
  - **Charts:** "Chart Bitcoin for 3 months" (also 7 days, 30 days, 1 year)
  - **Currencies:** "Show prices in pesos, dollars and euros" sets the equivalents shown. The first currency is the main one.
  - **Conversion:** "How much is 100 dollars in pesos?", "convert 0.5 bitcoin to pesos"
  - **Alerts:** "Tell me if Bitcoin goes below 5 million pesos", "my price alerts". Alerts are checked while Max is open, every 15 minutes, and in your briefing.
- **Where the prices come from:**
  - **Crypto:** CoinGecko, live
  - **PSE stocks:** PSE Edge, delayed or end of day. Max says which. If PSE Edge is down, he uses a web search and says so.
  - **Currencies:** ECB reference rates, updated once a day
- **Limits:** Max reports prices only. He never buys or sells and doesn't give buy or sell advice.

**👥 Max's crew**
- **How it works:** talk to Max as always. To give a job to one crew member, say their name first, for example "secretary, brief me". Open the crew screen from the menu with **👥 Crew**.
- **📋 Secretary:**
  - **Deadlines:** finds them in your notes and saved files (certificates, renewals, exams, sign-off). Say "what's expiring?" or "any deadlines this month?".
  - **Briefing:** say "brief me" for your schedule (when Google is connected), deadlines, what's waiting for you, your sites, visitors, sales and the watch list.
  - **Greeting:** the first time you open Max each day, he greets you with what's due.
- **🔎 Researcher:**
  - **Research:** "researcher, look up …"
  - **Watched topics:** "keep an eye on MARPOL Annex VI updates". He checks each topic weekly; "check my watched topics" checks now. (Your "watchlist" is for stocks and crypto.)
  - **Findings:** they wait in the research inbox ("what did the researcher find?") until you approve them.
  - **Fact-checks:** "fact check my ballast note"
- **🗂 Librarian:**
  - **Library report:** say "librarian" or "how many notes do I have".
  - **Duplicates:** "find duplicate notes", then "merge them". Merging keeps the text of both notes.
  - **Filing:** "organize my notes"
- **🧠 Skills you teach Max:**
  - **Teach one:** "new skill port arrival: when I say arriving at a port, list its pilot rules and my pre-arrival checklist". After that, "arriving at Busan" uses that playbook.
  - **Manage them:** "show my skills", "forget skill port arrival". Skills are saved as notes under **Max › Skills**, so they sync and back up.
- **Limits:** the crew can't publish, spend money, or change any website or DNS. Research goes into your notes only after you approve it.

**📎 Send Max anything**
- **How:** tap 📎 at the top.
  - **Photo, file, video or recording:** pick it from your phone.
  - **A link:** paste a website or YouTube address and tap **Read**.
- **What Max can read:**
  - Photos and screenshots
  - PDFs
  - **Word** (.docx), **Excel** (.xlsx) and **PowerPoint** (.pptx), opened on your phone
  - Text and CSV files
  - **Videos** and **voice recordings**, up to 95 MB
  - **Web pages** and **YouTube videos**
- **By voice:** "summarize www.imo.org/en/bwm", or "read hobbyisle dot com slash gundam".
- **What Max does:**
  - Says what it is and the key deadline
  - Shows the key facts, dates and amounts on screen
- **Then say:**
  - "When does it expire?" or any other question about it
  - "Save it" to file it in your notes with the full text (and the link for web pages)
  - "Discard it" to throw it away
- **Rules:** nothing is saved until you say so.
- **Old formats** (.doc, .xls, .ppt): save them as .docx / .xlsx / .pptx or PDF first.
- **Share to Max:** install Max on your phone. In Chrome, open the ⋮ menu, then **Add to Home screen** or **Install app**. After that, **Max** appears in Android's **Share** menu, so from any app (Files, Gallery, YouTube, Chrome) you can tap Share → Max.
- **Cost:** free on Gemini Flash. Videos are deleted from Gemini right after Max watches them.

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

**Google sign-in + Calendar + Tasks + Gmail (one-time, about 10 minutes)**

**1. Create a Google Cloud project**
- Open console.cloud.google.com and sign in with your Gmail
- Tap the project picker at the top → **New project** → name it `Max` → **Create**, then select it

**2. Turn on the two APIs**
- Menu ☰ → **APIs & Services** → **Library**
- Search **Google Calendar API** → **Enable**
- Search **Google Tasks API** → **Enable**
- Search **Gmail API** → **Enable**
- Optional, for later: **Google Drive API** and **People API**

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
- Allow **Calendar**, **Tasks** and **Gmail**, and you're returned to Max: "Signed in with Google ✓"

**After signing in**
- **Passcode:** no longer used. Each phone signs in with Google once.
- **Only your account:** only `MAX_OWNER_EMAIL` can sign in. Any other Google account is refused.
- **Settings:** has **Sign out** (this phone) and **Disconnect Google**, which brings the passcode back so you can never be locked out.

**Things to say**
- "What's on my schedule today / tomorrow / this week?"
- "Remind me Friday at 9 to renew my passport" adds a calendar event, and your phone notifies you at that time
- "Add buy safety shoes to my to-do list" adds it to Google Tasks
- "Undo" removes the last thing Max added, or reverses the last change
- "Move my dentist appointment to Friday 3pm", "rename my 10am meeting to Crew briefing", "remind me a day and an hour before the dentist". Max shows the change and does it after you say "yes".
- "Cancel my meeting tomorrow": Max asks "Delete …? Say yes". "Undo" puts it back.
- "Set an alarm for 5:30 tomorrow": a calendar alert that rings at that exact time. For a louder sound, set the Google Calendar app's notification sound.
- "Any important emails?" / "check my email from the agency"
- "Read number 1", then "reply that I confirm the joining date"
- "Make it shorter", then "yes, send it" (or tap **Send**). "Don't send it" deletes the draft.
- "Email Captain Reyes that I'll be there at 0800" (Max finds the address from past emails)
- "Archive number 2", "delete this email", "trash all emails from Shop", "mark all emails from the agency as read", "star it", "label this email as Contracts". Max always asks "yes?" first. "Undo" reverses it.

**Gmail rules**
- **Signed in before this update?** Open ⚙ Settings and tap **Update Google permissions** once, so Max can organize your email.
- **Access:** Max can read, draft, archive, label and move emails to Trash. Trash keeps them for 30 days. He can never delete an email permanently or change your Gmail settings.
- **Sending:** an email goes out only after you hear or see the draft and say "yes, send it" (or tap Send).
- **Instructions inside emails:** treated as text to report, never as orders to Max.

**Security**
- No keys are in these files
- Google keys stay in Cloudflare
- Max's Google access is stored encrypted in his database
- Sessions are stored only as hashes
