MAX SECOND BRAIN UPDATE (Android/GitHub Pages + Cloudflare Worker)

WHAT'S NEW
- Built-in Notes & Second Brain panel inside Max.
- Type, paste, or dictate a note.
- Save & analyze automatically: summary, key facts, details, tags, related topics, and questions.
- Search saved notes, open/edit notes, re-analyze, or put a note into the chat to ask Max about it.
- Original note text is preserved; analysis is stored separately.
- Notes are currently saved in this browser/device's localStorage. They do not sync between devices yet.

INSTALL
1. Back up your current GitHub repository files first.
2. Replace the repository's index.html with this package's index.html.
3. Update the Cloudflare Worker code with this package's worker.js.
4. Keep your existing GEMINI_API_KEY secret in Cloudflare. Do NOT put the key in GitHub.
5. Keep ALLOWED_ORIGIN set to your exact GitHub Pages origin, e.g. https://navigator-isle.github.io
6. If your Worker has a GEMINI_MODEL variable, gemini-2.5-flash is a suitable starting value; otherwise the code uses that default.
7. Deploy the Worker, then open Max > Connection settings and enter the Worker URL.
8. Open Notes & Second Brain and save a test note.

SAFETY / LIMITS
- AI analysis needs a configured Worker and valid Gemini API key.
- Without a backend, notes still save locally but automatic AI analysis cannot run.
- Browser localStorage can be lost if site data is cleared and does not automatically sync. Export/backup or add cloud database sync before relying on it as the only copy.
- Max's analysis is a helpful organization aid, not verification of maritime regulations. Check critical procedures against official sources and ship SMS.
- This Worker update adds /api/analyze-note and preserves existing /api/chat and /api/search routes.


MAX BEHAVIOR PRINCIPLES
The Worker prompt is updated so Max is general-purpose, not note-dependent. Notes are optional context; Max can answer from general model knowledge and should use external research when available and needed. He should be honest about uncertainty, never invent sources or claim actions he did not perform, correct mistakes openly, and distinguish user-taught procedures from verified facts or regulations. This prompt does not itself create permanent cross-device memory or automatic live web browsing; those require additional storage and search integrations.
