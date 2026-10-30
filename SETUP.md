**Max update — 30 Oct 2026 (Jarvis step 1)**

**What's new**
- **Hands-free talk:** tap **Talk to Max** once and just talk. Max listens, answers, then listens again by himself. He doesn't listen while he speaks.
- **Ending a conversation:** say "that's all", "goodbye Max", "stop" or "tama na". If you stay quiet, he goes on standby.
- **Interrupting:** tap the circle while Max is speaking.
- **Remembers everything:** every conversation is saved. After closing the app, Max continues where you left off and can recall older conversations by topic.
- **Learns by himself:** when you mention a lasting fact (your ship, family, plans, routines), Max saves it automatically and shows "✓ Noted in memory". He never saves passwords, PINs or card numbers.
- **Notes first:** your notes are checked before anything else.
- **Jarvis personality:** calm, natural, short spoken replies.
- **Typing box:** for when you can't talk out loud. Typed questions get full-length answers.
- **Settings:** the window now scrolls on small phones. Added a **Forget all conversations** button.
- **Gemini model:** fixed to `gemini-3.5-flash-lite`.

**Install (same as before)**

**1. GitHub**
- `navigator-isle/Max-mobile` → `main` → **Add file → Upload files**
- Choose `index.html` and `worker.js` → **Commit directly to main**

**2. Cloudflare**
- In GitHub, open `worker.js` → **Raw** → long-press → **Select all** → **Copy**
- Cloudflare → `max-ai-backend` → **Edit code** → long-press → **Select all** → **Paste**
- Tap **Deploy**, then wait for "Deployed". Saving alone doesn't put it live.

**3. Check**
- Open `https://max-ai-backend.mjgaly-mg.workers.dev/health`
- It should show `"version":"max-worker-2026-10-30"` and `"model":"gemini-3.5-flash-lite"`
- If the version is right but the model isn't, delete the `GEMINI_MODEL` variable in Cloudflare or set it to `gemini-3.5-flash-lite`

**4. Phone test**
- Refresh Max, tap **Talk to Max** once, and have a 3-turn conversation without touching the screen
- Mention something lasting, e.g. "My ship is MV …". You should see "✓ Noted in memory".
- Say "that's all". Close Max fully, reopen it, and ask "What did we talk about?"

**Security**
- No key is in these files
- The Gemini key stays in Cloudflare
- Your passcode stays on your phone
