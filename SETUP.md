**Max update — 30 Oct 2026 (second brain build)**

**What's new**
- **Circle screen:** only the circle, with dancing dots and voice lines, plus subtitles. Tap the circle to talk; tap it while Max speaks to interrupt.
- **Commands in your own words:** say things like "bring up the keyboard", "pull up my ballast notes", "look up the new MARPOL rules" or "balik". You don't need exact words, and English, Filipino and Taglish all work.
- **Learns your phrases:** if Max doesn't recognise how you say something, his AI works it out and he remembers that phrase, so next time it's instant. See ⚙ → **Phrases Max learned**.
- **Mini Max:** on Notes, Research and a note, Max shrinks to the top and keeps talking with subtitles. Tap the small circle to talk, or tap the text to go back to the full circle.
- **Research:** Max searches the web and shows findings, sources (OFFICIAL / WEB / MY NOTE), and any place your notes differ. Change it by voice ("change point 2 to …"). Nothing is saved until you say "approve it".
- **Second brain:** notes are grouped by topic and subtopic, like Obsidian. Max files Unsorted notes into topics; you can change any topic. "Organise my notes" sorts all of them.
- **Notes first:** answers show "From your note: …". Tap it to open the note.
- **Linked notes:** related notes appear at the bottom of each note.
- **Export:** a note to Obsidian `.md` (with topic, tags and [[links]]) or PDF, or all notes as one file.
- **Hold the circle** for a menu (Keyboard, Notes, Research, Settings), for when you can't talk.

**Install (same as before)**

**1. GitHub**
- `navigator-isle/Max-mobile` → `main` → **Add file → Upload files**
- Choose `index.html` and `worker.js` → **Commit directly to main**

**2. Cloudflare**
- In GitHub, open `worker.js` → **Raw** → long-press → **Select all** → **Copy**
- Cloudflare → `max-ai-backend` → **Edit code** → long-press → **Select all** → **Paste** → **Deploy**, then wait for "Deployed"

**3. Check**
- Open `https://max-ai-backend.mjgaly-mg.workers.dev/health`
- You should see `"version":"max-worker-2026-10-30b"` and `"model":"gemini-3.5-flash-lite"`

**4. Phone test**
- Refresh Max. You should see only the circle.
- Tap it and say "show my notes" → then "just talk"
- Say "research [a topic]" → "change point 1 to …" → "approve it"
- Hold the circle → the menu appears

**Notes**
- Web research uses Google Search through Gemini. If your Gemini plan doesn't allow it, Max still answers but marks the research **low confidence / unverified**.
- No key is in these files. Your passcode stays on your phone.
