MAX TWO-SECTION APP UPDATE

This update redesigns Max into two sections:
1) HOME / MAX: large animated speaking circle, greeting on open (browser may block automatic audio until the user interacts), voice input controls, and answer area.
2) NOTES / SECOND BRAIN: Obsidian-inspired dark notes interface with searchable note list, Markdown-friendly editor, categories, dictation, saved note analysis, and Ask Max action.

INSTALL
- Back up the current Max-mobile GitHub repository first.
- Replace the repo's index.html with this index.html.
- Update the existing Cloudflare Worker with worker.js so /api/analyze-note is available.
- Keep the GEMINI_API_KEY as a Cloudflare Worker secret; never add it to GitHub.
- Set ALLOWED_ORIGIN to https://navigator-isle.github.io (origin only, no /Max-mobile path).
- Re-enter the Worker URL in Max connection settings if required.

IMPORTANT TECHNICAL NOTES
- This is an early UI prototype. Test voice input/output on your target Android browser.
- Browsers commonly block speech on page load until the user has interacted with the page. If Max doesn't speak on first open, tap the Max circle once; then audio may work in later sessions depending on browser behavior.
- Notes are stored locally in this browser/device only; cloud synchronization and robust persistent memory across devices are not included yet.
- AI note analysis requires a deployed Worker and valid Gemini API key.
- The visual shell hides the original UI but retains it as a hidden engine. Voice wiring can differ by browser and may need adjustment after testing on the live deployment.
- Use ship SMS and official regulations for safety-critical maritime decisions.
