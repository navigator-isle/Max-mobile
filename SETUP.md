**Max — setup notes (updated 30 Oct 2026)**

**How updates work now**
- Every change on GitHub (`main`) is tested automatically: 685 checks covering the backend, voice commands and phone screens.
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

**🧠 Teaching Max (skills, learning, search by meaning)**
- Skills = how Max does things. Open a note with steps (e.g. your AMOS monthly report) and say "make this a skill" — or send a file/link that teaches a procedure and tap "Learn … as a skill". Max shows the skill (when to use it, numbered steps, rules) and saves it after your yes, in Max › Skills (edit it like any note)
- When your question matches a skill, Max follows it exactly and starts his answer with its name. Only matching skills are sent in full, so many skills don't crowd out your notes
- "Walk me through the AMOS monthly report": one step at a time on screen and out loud — "next", "back", "repeat", "step 5", "stop". Works for skills and any note with numbered steps
- Correct a skill by voice: "improve the AMOS monthly report skill: step 4 should be …" — Max shows the change and the old version, and saves after your yes
- "Learn this" after sending a file or link: saves a detailed study note (sections, key facts, terms, why it matters, the source and date) and suggests a skill if it teaches a procedure. On an open note it studies and files it
- Search by meaning: Max indexes your notes with Google's free embedding model (small fingerprints kept on your phone), so questions find the right notes even with different words; up to 8 notes per question
- Librarian: "check my notes for conflicts" finds notes that disagree (e.g. 200 nm vs 50 nm) and regulation notes not updated in 2+ years

**🏢 Departments (say "show my departments")**
- 📱 Apps & Play Store — release manager (test builds), store listing editor, review reader. Passage Planner is on Play; Quick Draft Calculator is website-only for now
- 🌐 Websites & affiliate — webmaster (up/down, visitors, sales log), security & SEO checker ("check Hobby Isle security": https, security headers, title/description, sitemap, broken links, picture alt text, affiliate disclosure — score out of 100), SEO researcher ("SEO ideas for Hobby Isle": live web search of what people look for, competitors, quick wins), content writer ("write a review of the RG Hi-Nu", "write a post about …": title, meta description, URL, keywords, photo ideas with alt text and file names, facts to double-check). Drafts are never published by Max — save them or send them to the website as a change request. Pictures: send a photo with 📎 and ask for alt text. Comments: not connected yet (say where comments are kept)
- 📈 Trading desk — paper trader, strategy researcher, market watcher (pretend money only; forex = prices and conversions)
- 🗂 Notes & research — librarian, researcher
- 📅 Schedule & reminders — secretary, routines
- 🎯 Training & coaching — six coaches and the skills you taught Max
- **The brain picks the desk.** Every question goes first to a quick router that picks the desk that should answer (📱 Apps desk, 🌐 Website team, 📈 Trading desk, 🗂 Librarian, 📅 Secretary, 🎯 Coach, or Max himself for anything else). That desk answers with its own rules and its own live data — the Trading desk reads the paper accounts directly, the Website team is told never to invent reviews. The answer shows a small label with the desk's name. A follow-up ("why?", "and the second one?") stays with the same desk for 10 minutes. The router adds no extra AI call, so it costs nothing and adds no delay; every action still works from any desk
- 🎵 **Music desk** — say "play Ben&Ben", "play some chill music", "patugtugin mo ang OPM love songs", or just "I need something to focus to". Songs come from YouTube and play in a small player at the bottom (YouTube's rules say it must stay visible); "play jazz radio" plays an internet radio station instead, which keeps going with the screen off. Say pause, play, next song, louder, softer, "what song is this", or "stop the music" — or use the buttons. The music turns down by itself while Max listens or talks. Buttons open the same search in YouTube Music or Spotify. If YouTube doesn't answer, Max plays radio instead
- 🛡 **Guard** — every morning at 6:45 am (Philippine time) it checks each site (up, speed, still on https; a full security & SEO check for Hobby Isle), every GitHub build from the last day, the paper trader (ran recently? risk breaker?), Max's brain key, the Google connection and the failures in the activity log. It emails you only when something NEW is wrong (no daily repeats). Every Sunday it sends an all-clear summary plus a backup of your notes, memory and settings as a .json attachment — to your own Gmail, never to GitHub (the Max-mobile repository is public). Passwords, keys and sign-ins are never in the backup. Ask "is everything OK?", "check everything now" or "back up my notes". To restore: Notes → ⋯ → "Restore from a Max backup" — nothing newer is overwritten
- 🧾 **Activity log** — "show my activity log", "what did my desks do today", "what failed today". Every answer (which desk, which brain, how long it took, which action), every action Max carried out on the phone or laptop, the paper trader's moves and the trading emails — kept 90 days in Max's database, newest first, failures at the top. Tap a desk to see only its work
- 🗂 **Notes, redesigned.** A ready-made Maritime structure: IMO (Conventions · Codes · Resolutions & Circulars · Amendments & Updates), US Regulations (USCG & CFR · Environment · Port Entry & Security), School Subjects (Navigation, Seamanship, Ship Stability, Cargo, Meteorology, Ship Construction, Electronic Navigation, GMDSS, Maritime Law, BRM, Safety & Survival, Medical Care) and Job by Rank (Master, Chief Officer, Second Officer, Third Officer); Max files new notes into it, and you can add folders any time. Smaller, tighter list (folder counts, dates, 📷/🎬 markers). The editor shows no buttons until you need them: select text for a small formatting bar, or tap **Aa** for all of it; **＋** inserts a picture, video, link or divider; **⋯** has Dictate, Analyze, Export and Delete. **Pictures and videos** (up to 25 MB) live in the note — Max looks at each one and writes what he sees under it, so it's part of the note when he analyzes, searches or answers; they're kept on the phone and copied to Max's database so the laptop shows them too. **Web addresses become highlighted links** that open when tapped (in the editor, tap a link for "Open ↗"). **Save** takes you back to the list with the saved note flashing and a "Saved ✓" line
- 🗣 **Understanding you better (non-native English, Taglish).** The microphone listens in Philippine English and gives up to 5 guesses of each sentence. Max fixes each guess with your own words (project names, note titles, ship terms like SOLAS / MARPOL / STCW / COLREGs / ECDIS, Hobby Isle, Gunpla, COL Financial, Binance) and with words you taught him. A guess that is a command wins when the top guess is unclear; otherwise all the guesses go to the brain, which is told you're a non-native speaker and must work out what you meant — never correcting your English. If a wrong guess would matter (a date, an amount, sending or deleting), Max asks "Did you mean …?". If you pause mid-sentence ("remind me to call the…"), he keeps listening. "Hey Max" also wakes him when heard as "hey Macs/Mags/Mack". Teach him: "when you hear captain rey yes, I mean Captain Reyes" (or "kapag narinig mo ang …, ang ibig kong sabihin ay …"); "show my word fixes"; "listen in Filipino" / "listen in English". Word fixes sync between phone and laptop
- 🧠 **Smarter free brain.** Each question gets a difficulty score from its words (no extra AI call). Everyday questions use the usual fast brain. Hard ones — explain, compare, calculate, plan, regulations (SOLAS, MARPOL, STCW…), stability, money, long or multi-part questions, or when you say "think hard" — go to the strongest free model (Gemini 3.8 Flash, then 3.6 Flash, then 2.5 Pro if your project has it) with deep thinking on. Then a **second AI from a different company** (Groq's gpt-oss-120b; Cloudflare's Llama if Groq answered) checks the answer for wrong facts, numbers, dates, unsafe advice or contradictions with your notes. If it says the answer is wrong, Max thinks again with its points and decides who is right. The answer shows "🧠 Deep thinking" and "✓ Double-checked" (or "✓ Fixed after a second check"); tap it to see what the checker said. Say "double-check that" or "are you sure?" any time to have your last answer checked. `/health?deep=1` tests every free model live ("freeModels")
- **Brain backups:** Claude (if set up) → Gemini 3.5 Flash → 3.5 Flash-Lite → 3.8 Flash → 3.6 Flash → 3.1 Flash-Lite → Groq (gpt-oss-120b, Qwen 3.8, gpt-oss-20b) → Cloudflare Workers AI. Each Gemini model has its own free daily limit, so the longer chain means more free answers per day. A one-off hiccup gets one quick retry on the same brain; an empty answer goes to a backup brain; a brain that hit its limit rests for 10–60 min. `/health` shows the whole chain ("brainChain") and which brains are resting

**🤖 Max's agents (each emails you a detailed weekly report on Sunday, Manila time)**
- 🗂 Notes & Attachments (7:45 am) — librarian, fact-checker, Maritime expert, attachment reader. Every morning (5:45 am) it checks up to 4 notes against the web; an outdated or wrong note shows a ⚠ banner with the correction and source when you open it
- 🔎 Researcher (8:45 am) — your watched topics ("watch IMO amendments"); detailed but simple, short structure, with data and sources
- 🌐 Websites (9:45 am) — per site: security, pictures, SEO, mobile & desktop speed (Google PageSpeed), content and keyword ideas, social posts, affiliate links, analytics. Publishes nothing without your OK
- 📱 Apps (10:45 am) — per app: up/speed, GitHub changes and failed builds, Netlify deploys (needs NETLIFY_TOKEN), Play Store tracks and reviews, errors, suggestions
- 🛡 Security (11:45 am) — the daily 6:45 am check plus a web search for new threats relevant to your setup, and what to do
- 📈 Trading (12:45 pm) — PSE, crypto and forex paper accounts. Every Saturday night the strategy researcher searches the web for documented strategies; the paper trader backtests them on Sunday and puts winners on trial; the main account gives money to whatever is winning (the combined strategy). Pretend money only
- 💰 Investments (1:45 pm) — Pag-IBIG MP2, PH high-yield savings, UITF, VUL, bonds, PSE dividend stocks: current rates, what changed since last week, perks, catches, sources. Not financial advice
- 🏪 Business (2:45 pm) — 10 simple, boring, earning businesses each week, never repeating an earlier idea
- 🎵 Music (3:45 pm) — favorites ("add this to my favorites", "play my favorites"), playlists ("add this to my gym playlist", "play my gym playlist"), what you ask for most ("show my music")
- 📅 Schedule (4:45 pm) — the coming week, clashes, overdue tasks
- ✉️ Email (5:45 pm) — inbox health, important unread, mail that may need a reply. Sends only with your yes; delete = Trash (30 days)
- Ask any time: "send me the trading report now", "show the investments report"
- Brain budget for background work each day: notes first (40), trading second (20), investments 14, the rest a few each. Chat with you is never limited by this
- Netlify: create a personal access token in Netlify (User settings → Applications → Personal access tokens), then add it yourself in Cloudflare → Workers → max-ai-backend → Settings → Variables and Secrets as a secret named NETLIFY_TOKEN

**🗂 Notes like Obsidian**
- Notes screen = your vault: folders inside folders (any depth) with arrows, guide lines, "My vault · N files, M folders", and a bottom bar: ✎ new note (inside the folder you tapped), 🗀+ new folder, ⇅ sort A–Z / newest, collapse all, ⋯ more
- Opening a note shows it like Obsidian's reading view: folder path, big title, #tags, numbered steps, bold, tables, ☐/☑ tasks, and [[links]] you can tap. ✎ Edit to change it
- Import your Obsidian vault: in My Files, long-press the vault folder → Compress (zip). Then ⋯ → Import Obsidian vault (or send the zip with 📎, or say "import my Obsidian vault"). Max shows how many notes and folders first and waits for your yes; importing again updates notes with the same name instead of duplicating them
- ⋯ → Export vault downloads a zip you can unzip and open as a vault in Obsidian
- A note's folder is its topic (e.g. Work › Ship's Apps and Tool › AMOS), so Max still files, searches and answers from them as before

**📈 Paper trading (pretend money only)**
- Two pretend accounts of ₱100,000: PSE stocks with COL Financial fees (0.25% commission, min ₱20, + VAT, PSE/SCCP fees, 0.1% sales tax on sells, board lots) and crypto with Binance spot fees (0.1%), held in USDT
- Runs by itself on GitHub (workflow "Max paper trader"): PSE every weekday 4:30 pm Manila, crypto daily 8:20 am Manila, the strategy researcher every Sunday. Accounts are saved on the `trader-data` branch (public, like this repo)
- Strategies compete: each has its own pretend account; the main account follows the ones winning in the current market (bull / bear / sideways), max 40% each, losers get nothing. Orders are decided after the close and filled at the next open — the same price you'd get copying them
- Risk limits: max 1% risk per trade, max 25% in one stock or coin, stops on every breakout/dip trade; if the account falls 20% from its peak, new buys pause until it's back within 10%
- The researcher tests variations each week on 2 years of data and only adds one if it wins on data it didn't see; new ones start on trial and earn weight by trading well. Weakest strategies retire
- Say "how's my paper trading?" (or "show my crypto paper trading"). It's in the morning briefing too
- Emails: an hourly check sends new updates (orders for the next open, closed trades, strategy changes, risk alerts, the weekly review) to MAX_OWNER_EMAIL only. "Turn off trading emails" / "turn on trading emails"
- Nothing is connected to COL or Binance — no real order can ever be placed. Copying a trade is always your own decision. Not financial advice

**💻 Max on a laptop**
- Same link, in Chrome or Edge: navigator-isle.github.io/Max-mobile/ — sign in the first time (Google or passcode)
- Wide screens: Max stays on the left (circle, what he says, a typing box), whatever you open shows on the right in columns
- Keys: Enter sends · Ctrl+K types · Ctrl+Space talks · Esc stops him
- Chrome can install it as an app: the install icon at the right of the address bar

**🔄 Phone ↔ laptop sync**
- Notes, sales, routines, skills and memory were already shared. Now also: watchlist, price alerts, currencies, routine streaks, watched topics, the Researcher's inbox, your projects list, phrases Max learned, weather place, personality, voice-interrupt setting
- Syncs a few seconds after a change, every minute while open, and whenever you come back to Max. If the same thing changed on both, the newest change wins
- Kept per device on purpose: sign-in/passcode, hands-free, cached prices/calendar, and anything typed while offline (sent when that device is back online)

**👂 Hands-free and interrupting**
- Say "hands-free on" (or hold the circle → 👂 Hands-free). Then just say "Hey Max, …" — with or without a question after it. Follow-ups don't need "Max"; "that's all" sends him back to waiting
- Works while Max is open on screen; he keeps the screen awake. Locking the phone or switching apps turns the microphone off, and it comes back when you return. It stays on after you reopen Max
- Interrupt: while he talks, say "stop", "wait" or "teka" — or just ask something new — and he goes quiet and listens. His own words don't trigger it
- "Turn off voice interrupt" if he stops himself by mistake; "hands-free off" to stop listening
- Uses more battery while on. Some Android phones play a short beep each time the microphone restarts — that's the phone, not Max

**🌤 Weather & sea**
- "Weather in Batangas", "forecast for Manila tomorrow", "marine weather at Longview", "how windy is it"
- Wind in knots and Beaufort, gusts, pressure, visibility, plus waves and swell for coastal places (free, from Open-Meteo)
- "Set my weather place to Batangas" — then it's in your morning briefing too. With no place set, Max asks to use the phone's location
- Model forecast only — not for navigation; always check official warnings

**🎭 Style, usage and WhatsApp**
- "Be concise", "be witty", "be formal", "back to normal" — "what personality are you using?"
- "How much AI did you use today?" — answers per brain, and whether the free backups had to step in
- "WhatsApp Ana that I'm running late" — Max writes it and opens WhatsApp with the message filled in; you pick the chat and tap send. A phone number like 0917… goes straight to that chat

**📴 Offline**
- **Works offline:** your notes and second brain, answers from your notes, routines, skills, deadlines, the sales log, and all screen commands.
- **From saved copies:** your calendar for the week, the last watchlist prices, and the last inbox summary. Max says when the copy was saved.
- **Waits for the internet:** reminders, calendar changes, questions for the brain, research, email and the Play Store go into an **outbox**. When you're back online Max does them by himself, in order, and tells you what he did. He also tells the brain when you originally asked, so "tomorrow" stays correct.
- **Things to say:** "What's waiting?" shows the outbox, and each item can be cancelled. The top of the screen shows "Offline · 2 waiting".
- **Voice offline:** Android's offline speech must be installed: Settings → Google → Search, Assistant & Voice → Voice → Offline speech recognition → download English (and Filipino). Without it, Max opens the keyboard when you're offline.

**▶ Google Play (Passage Planner listing)**
- **Things to say:**
  - "Show Passage Planner on the Play Store"
  - "Change the Play Store short description of Passage Planner to mention tides" (Max shows the new text, then publishes after your "yes")
  - "Rewrite the description to mention …"
  - "Set the release notes to …"
  - "Any Play Store reviews?"
- **Setup (one time, about 10 minutes):**
  1. Google Cloud console → project **Max-ai** → search **Google Play Android Developer API** → **Enable**.
  2. ☰ → **IAM & Admin** → **Service Accounts** → **Create service account** → name `max-play` → **Done** (no roles needed).
  3. Open `max-play` → **Keys** → **Add key** → **Create new key** → **JSON** → a file downloads. (If Google says key creation is disabled by an organization policy, tell Max's builder: that policy has to be turned off first.)
  4. Play Console → **Users and permissions** → **Invite new users** → paste the service account's email (ends in `iam.gserviceaccount.com`) → **App permissions** → add **Passage Planner** with: View app information, Manage store presence, Release to testing tracks, Reply to reviews → **Invite**.
  5. Cloudflare → **max-ai-backend** → **Settings** → **Variables and Secrets** → **Secret** `PLAY_SERVICE_ACCOUNT` = the whole text of the JSON file.
  6. More apps later: **Text** `PLAY_APPS` = `Passage Planner=app.passageplanner.navigation; Other App=com.example.other`

**🔁 Routines**
- **Teach one:** "My morning routine is check email, check my watchlist and 20 push-ups"
- **Run it:** "Start my morning routine". Max reads each step; say "done", "skip" or "stop". He keeps a streak.
- **Repeating reminders:** "Remind me every day at 7am to log my workout". Also works for weekdays, weekends, "every Monday and Thursday", monthly, or "every 2 days".
- **Manage them:** "show my routines", "delete my morning routine". Routines are saved as notes under **Max › Routines**.

**🎯 Coaches**
- **Talk to one:** "Talk to my fitness coach", "career coach, how do I prepare for chief mate?", "coach me on my business". The coaches are investment, fitness, skills, business, career and life.
- **First session:** the coach asks a few questions about you.
- **Coaching file:** goals and progress are kept in notes under **Max › Coaches**, so each session continues where you left off.
- **Check-ins:** "Fitness coach, check in with me every evening at 8" creates a repeating calendar reminder.
- **End a session:** "thanks coach" or "back to Max".
- **Limits:**
  - The investment coach never tells you to buy or sell and isn't a licensed advisor.
  - The fitness coach isn't medical advice.
  - The life coach isn't therapy and encourages real help if things are hard.

**⚓ Passage Planner from Max**
- **Things to say:**
  - "Distance from Longview to Vancouver"
  - "ETA from Longview to Vancouver at 12 knots leaving tomorrow 0600"
  - "What speed do I need from Manila to Singapore to arrive by Monday 0800?"
- **How it works:** Max uses your Passage Planner's own ports, routing and time zones, loaded quietly in the background. Your planner settings and saved plans are never changed.
- **Limits:** a planning aid only, not for navigation.

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

**Optional: let Max send change requests to GitHub and build the Play app (about 5 minutes)**
- **Create the key:** github.com → your photo → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**
  - **Name:** `Max` · **Expiration:** 1 year
  - **Repository access:** **Only select repositories** → `Max-mobile`, `hobbyisle`, `navigator-isle.github.io`, `passage-planner-android`
  - **Permissions:** **Issues** read and write · **Pull requests** read and write · **Contents** read and write · **Actions** read and write
  - **Generate**, then copy the key
- **Give it to Max:** Cloudflare → **max-ai-backend** → **Settings** → **Variables and Secrets**
  - **Secret** `GITHUB_TOKEN` = the key
  - **Text** `MAX_GITHUB_REPOS` = `navigator-isle/Max-mobile,navigator-isle/hobbyisle,navigator-isle/navigator-isle.github.io,navigator-isle/passage-planner-android`
- **What Max can then do:** file change requests as GitHub issues, list them along with any ready fixes, and publish a fix only after you say "yes, merge it" and its tests have passed. He never touches domains, DNS or account settings.
- **Play app builds:** say "send a new version of Passage Planner to the closed test" (add "release notes: …" if you like). Max shows what will happen and waits for your yes, then starts **Build Android app**, which uploads to the Alpha closed test about 10 minutes later. Ask "how's the build?" to check. Production is never touched; the Android repo also needs its own secret `PLAY_SERVICE_ACCOUNT` (same JSON as Cloudflare) for the upload step.

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
