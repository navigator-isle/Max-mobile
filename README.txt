MAX VOICE + NOTES EDITOR UPDATE

Changes:
- Attempts to select an installed English male-sounding text-to-speech voice and uses a lower pitch. The exact voice depends on Android/browser installed voices; set the preferred male English voice in Android Text-to-speech settings if needed.
- Removes the old chat response panel from the visible home screen so the duplicated "YOUhelloMAX..." legacy messages should no longer show.
- Keeps the home page focused on Max's animated circle and voice controls.
- Notes page shows the saved notes list with a + New note button at the bottom.
- New note opens a separate blank editor with title, category, tags, bold/italic/underline, text color, highlight, headings/paragraph/quote/code, bullets, numbered list, dictation, save, and separate AI analysis.

INSTALL:
1. Back up the current Max-mobile repo.
2. Replace index.html with this version.
3. Keep/update the Cloudflare Worker with worker.js (the current Worker file is included).
4. Keep GEMINI_API_KEY as a Cloudflare secret.
5. Open the deployed app and test. If speech is silent on launch, tap the screen or Max circle once: Android browsers often block autoplay speech until the first user interaction.
6. The AI backend must be connected for actual AI answers and note analysis. Notes save in local browser storage and do not sync across devices yet.

IMPORTANT:
- This prototype uses browser speech recognition and speech synthesis. Male voice choice is best-effort and depends on installed voices; a Filipino-accented male voice is not guaranteed by the web app alone.
- The editor uses browser rich-text editing commands. Test on your target Android browser before relying on it for important notes.
