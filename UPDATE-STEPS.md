**Update Max from your phone (no laptop, no GitHub)**

**Every update (after the first time) — 2 minutes**
- Cloudflare (dash.cloudflare.com) → Workers & Pages → **max-app** → **Create deployment** → upload **max-app.zip** → Save and deploy
- Max app → ⚙ Settings → **Update Max's server** → **Check for update** → **Install update**
- Max checks the new version himself; if it doesn't start, he goes back to the old one (nothing is lost)

**First time only — set up the updater (about 10 minutes)**
1. Upload **max-app.zip** to Pages project **max-app** (as above)
2. Cloudflare → **Workers & Pages** → **Create** → **Create Worker** (Hello World) → name it exactly **max-updater** → **Deploy**
3. In Chrome open **https://max-app-axv.pages.dev/_update/updater.txt** → long-press the text → **Select all** → **Copy**
4. Cloudflare → max-updater → **Edit code** → select all the sample code → **Paste** → **Deploy**
5. Make a token: Cloudflare → your profile icon → **My Profile** → **API Tokens** → **Create Token** → template **Edit Cloudflare Workers** → **Use template** → Account Resources: your account · Zone Resources: All zones → **Continue to summary** → **Create Token** → **Copy**
6. Cloudflare → max-updater → **Settings** → **Variables and Secrets** → **Add**:
   - Type **Secret**, name **CF_API_TOKEN**, value = the token you copied → Save
   - Type **Secret**, name **UPDATE_PASS**, value = your Max passcode → Save
7. Max app → ⚙ Settings → check the updater address is **https://max-updater.mjgaly-mg.workers.dev** → **Check for update** → **Install update**

**Safety**
- The token stays inside Cloudflare (you paste it there yourself); never send it to anyone, Claude included
- The updater only takes code from your own site max-app-axv.pages.dev and checks its fingerprint (SHA-256) before installing
- It only changes the Worker max-ai-backend; your database, notes, memory, secrets and schedules stay
- Undo by hand anytime: Cloudflare → max-ai-backend → **Deployments** → **Rollback**
