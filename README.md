# JARVIS Android Starter (GitHub Pages + Cloudflare Worker)

This starter contains:
- `index.html`: mobile-friendly JARVIS UI, text chat, browser speech recognition where supported, spoken replies, web search, and user-controlled local memory.
- `worker.js`: small backend that calls Gemini without exposing the API key and provides a DuckDuckGo HTML search endpoint.

## Important limitations and privacy
- This is a starter project, not a native Android app. A website cannot freely control Android apps/settings. Phone automation comes later.
- Chat history and saved memories are stored in this browser's local storage. They are not synced between devices.
- Saved memories are only sent to Gemini when the user checks “Include saved memories in AI requests”.
- Messages sent to the AI provider leave your device. Do not send passwords or sensitive information. Review the AI provider's current data-use terms.
- Free API quotas, eligible models, and service limits can change.
- DuckDuckGo's HTML results page is not a guaranteed stable public API. If this endpoint stops working, the frontend falls back to opening DuckDuckGo in a browser.

## Part A — Publish the website with GitHub Pages
1. Sign in at https://github.com/ and create a new public repository, e.g. `jarvis-mobile`.
2. Upload `index.html` from this folder to the repository root (the top-level folder). Do not upload `worker.js` to the public site; it belongs in Cloudflare only.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**; select `main` and `/ (root)`, then Save.
5. Wait for the published URL shown in Settings → Pages. It looks like `https://YOUR-USERNAME.github.io/jarvis-mobile/`.
6. Open that URL on Android Chrome. Use Chrome's menu → **Add to Home screen** if you want an icon.

## Part B — Create the backend in Cloudflare
1. Create/sign in to Cloudflare: https://dash.cloudflare.com/
2. Open **Workers & Pages** and create a Worker (the dashboard may label this “Create Worker”).
3. Give it a name such as `jarvis-api`.
4. Open its code editor and replace the sample code with the entire contents of `worker.js`. Save and deploy.
5. In Worker **Settings → Variables and Secrets** (wording can vary), add a secret named `GEMINI_API_KEY`. Do not put the key in GitHub, `index.html`, or a chat message.
6. Obtain a Gemini API key at https://aistudio.google.com/app/apikey. Use a free-tier project/model if offered. Add it to the Cloudflare secret, then deploy if asked.
7. Add a plain-text variable named `ALLOWED_ORIGIN` set to the exact origin of the GitHub Pages site, with no path or trailing slash. Example: if the website URL is `https://YOUR-USERNAME.github.io/jarvis-mobile/`, the origin is `https://YOUR-USERNAME.github.io`. Use your actual username, not this example.
8. Open `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/health`. You should see JSON with `"ok":true`. The Worker origin is the base URL ending in `.workers.dev` (no `/health`).
9. In the JARVIS website, tap **Connection settings**, paste the Worker origin into the URL field, and save.
10. Test a normal question. Then tap **Web search**, enter a topic, and check if results appear inside the page.

### Alternative: configure the secret with Wrangler
If you use a computer with Node.js and Wrangler installed:
```bash
npx wrangler secret put GEMINI_API_KEY
```
Paste the API key only into the terminal prompt. Do not commit `.env` files or keys to GitHub.

## Part C — Test checklist
- [ ] Website opens from GitHub Pages over HTTPS.
- [ ] Worker `/health` responds with `ok: true`.
- [ ] Connection settings shows `BACKEND CONFIGURED`.
- [ ] Ask “Explain what an AI assistant is in two sentences.”
- [ ] Search for a topic; result links should open in a new tab.
- [ ] Save a harmless test memory and check it appears in Memory vault.
- [ ] Turn off “Include saved memories” to keep them out of AI requests.
- [ ] Delete the test memory and clear chat if desired.

## Cost
- GitHub Pages: generally available without a separate hosting fee for public repositories; see current GitHub Pages plan terms.
- Cloudflare Workers: has a free plan with quotas/limits; check the current Cloudflare pricing before deploying.
- Gemini API: Google lists a free tier for selected models, with limited availability and rate limits. Check current pricing/terms before use. The free-tier data-use policy may differ from paid service.
- DuckDuckGo search endpoint: no API key is used by this sample, but it is an unofficial HTML parsing approach and can stop working. Do not use it for high-volume production traffic.
- The project is designed to avoid paid usage by default. Do not enable paid billing unless you intentionally choose to.

## Security notes
- Never expose `GEMINI_API_KEY` in frontend JavaScript or a public GitHub repository.
- Set `ALLOWED_ORIGIN` to your own GitHub Pages origin.
- This simple Worker has no user login or per-user quota. If you publish it publicly, others could attempt to use your endpoint. For private personal use, consider adding Cloudflare Access or another authentication/rate-limit mechanism before sharing the URL.
- Treat AI answers and web results as potentially inaccurate; verify important information.
