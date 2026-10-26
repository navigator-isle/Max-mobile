**Max update — 26 Oct 2026**

**What changed**
- **Startup:** the app no longer waits for the full page load, and each startup step runs separately, so one problem can't freeze Max. Any problem now shows as a ⚠ message under the circle instead of a stuck screen.
- **Bad saved data:** notes with missing parts no longer crash the app.
- **Old notes:** notes from the earlier Notes screen are copied into the current one once.
- **Voice:** the greeting plays on your first tap of the empty screen (Android blocks sound before a tap). The circle no longer stays stuck if Android never reports that speech ended. Voice answers now remember the earlier part of the conversation. Microphone errors explain what to do.
- **Long-term memory:** say "Max, remember that …" (or "Tandaan mo na …") and it's saved in the `MAX_MEMORY` database. Max uses saved memories and matching notes when answering. You can view, add and delete memories in ⚙.
- **Notes sync:** notes save on the phone first, then sync to the database. A second phone with the same passcode gets the same notes. Deleting a note removes it everywhere.
- **Delete button:** the note editor now has the Delete button the code already expected.
- **Passcode:** once you set `MAX_PASSCODE`, the Worker refuses anyone without it. This protects your Gemini quota and your memory.
- **Unchanged:** Gemini model, note analysis, web search, the ⚙ connection test and your existing data.

**1. Update the Worker (Cloudflare)**
- Workers & Pages → `max-ai-backend` → Edit code
- Select all, paste the whole new `worker.js`, then Deploy
- Settings → Variables and Secrets → Add → type **Secret**
  - Name: `MAX_PASSCODE`
  - Value: a passcode you choose (not your Gemini key)
- Settings → Bindings: confirm the D1 binding is named exactly `MAX_MEMORY`
- Keep `GEMINI_API_KEY` and `ALLOWED_ORIGIN` as they are

**2. Update the website (GitHub)**
- Open `navigator-isle/Max-mobile` on the `main` branch → `index.html` → ✏️ Edit, or Add file → Upload files
- Replace it with the new `index.html` → Commit to `main`
- This doesn't touch or merge the test pull request
- Wait 1–2 minutes for GitHub Pages to update

**3. Connect on your phone**
- Open Max in Chrome, then pull down to refresh
- Tap ⚙ → type your passcode → Test connection
- You should see:
  - `SUCCESS`
  - `Memory database: ready ✓`
  - `Notes sync: done ✓`
- The top-right label should say **Connected · memory on**

**4. Phone checks**
- Close Max fully and reopen it. It should show **Ready** within a second or two.
- Say: "Max, remember that my ship is [name]". Then ask: "What ship am I on?"
- ⚙ → the memory list shows that sentence
- Write a note, save it, then check it's still there after reopening
- Optional: open Max on a second phone or browser with the same passcode. The note should appear.
- If anything fails, send a screenshot of the ⚠ line or the Test connection result

**Database tables**
- The Worker creates `max_memories` and `max_notes` itself the first time it runs
- Any tables you already have are left alone
- If a table with one of those names exists with different columns, Test connection shows which columns are missing, and nothing is overwritten

**Security**
- The Gemini key stays only in Cloudflare
- Neither file contains any key
- The passcode is saved only on your phone
