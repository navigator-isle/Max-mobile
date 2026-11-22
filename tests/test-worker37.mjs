// 🛡 Guard + Hobby Isle health page (23 Nov 2026, Mark): errors with their fix are emailed; warnings only after 3 days in a row; nothing when OK.
//
// Sunday all-clear with a backup of notes and memory emailed to him (never GitHub; no secrets inside).
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
let sent = [], fetches = 0, siteDown = false, buildFail = false, traderAge = 2, health = { ok: true, problems: [], warnings: [] }, healthDown = false;
const HOBBY = `<!doctype html><html><head><title>Hobby Isle — Gundam Gunpla kits, guides and the best deals for collectors</title><meta name="viewport" content="width=device-width"><meta name="description" content="Gunpla guides and deals for collectors who want the best kits at fair prices, updated every week."><link rel="canonical" href="https://hobbyisle.com/"></head><body><h1>Hobby Isle</h1><p>As an Amazon Associate we earn from qualifying purchases.</p><a href="/guides">Guides</a></body></html>`;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); fetches++;
  if (url.startsWith("https://oauth2.googleapis.com/token")) { const p = new URLSearchParams(o.body);
    if (p.get("grant_type") === "authorization_code") return new Response(JSON.stringify({ access_token: "AT1", expires_in: 3600, refresh_token: "RT", scope: "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send", id_token: "h." + b64u({ email: "mark@example.com" }) + ".s" }));
    return new Response(JSON.stringify({ access_token: "AT2", expires_in: 3600 })); }
  if (url === "https://gmail.googleapis.com/gmail/v1/users/me/messages/send") { sent.push(Buffer.from(JSON.parse(o.body).raw, "base64url").toString()); return new Response(JSON.stringify({ id: "s" + sent.length })); }
  if (url.startsWith("https://max-ai-backend.mjgaly-mg.workers.dev/") || url.startsWith("https://max-app-axv.pages.dev/")) return new Response("ok");
  if (url === "https://passage-planner-6pm.pages.dev/") return siteDown ? new Response("down", { status: 503 }) : new Response("ok");
  if (url.startsWith("https://draft-calculator.github.io/")) return new Response("ok");
  if (url === "https://hobbyisle.com/") return new Response(HOBBY, { headers: { "content-type": "text/html", "strict-transport-security": "max-age=1", "content-security-policy": "default-src 'self'", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "strict-origin" } });
  if (url.startsWith("http://hobbyisle.com")) return new Response(null, { status: 301, headers: { location: "https://hobbyisle.com/" } });
  if (url === "https://hobbyisle.com/robots.txt") return new Response("User-agent: *\nSitemap: https://hobbyisle.com/sitemap.xml");
  if (url === "https://hobbyisle.com/sitemap.xml") return new Response("<urlset></urlset>");
  if (url === "https://hobbyisle.com/guides") return new Response("ok");
  if (url === "https://hobbyisle.com/api/health") return healthDown ? new Response("nope", { status: 503 }) : Response.json(health);
  if (url.startsWith("https://api.github.com/repos/")) { const repo = url.split("/repos/")[1].split("/actions")[0];
    const runs = repo === "navigator-isle/passage-planner-android" && buildFail ? [{ name: "Android build", conclusion: "failure", html_url: "https://github.com/x/1", created_at: new Date().toISOString() }, { name: "Android build", conclusion: "success", created_at: new Date(Date.now() - 864e5).toISOString() }]
      : [{ name: "Deploy", conclusion: "success", html_url: "https://github.com/x/2", created_at: new Date().toISOString() }];
    return new Response(JSON.stringify({ workflow_runs: runs })); }
  if (url.includes("generativelanguage") && url.includes("embed")) return new Response(JSON.stringify({ embeddings: [{ values: Array(256).fill(0.1) }] }));
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/summary.json")) return new Response(JSON.stringify({ updated: new Date(Date.now() - traderAge * 3600e3).toISOString(), markets: { pse: { returnPct: -0.22, halted: true }, crypto: { returnPct: 0.01, halted: false } } }));
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/events.json")) return new Response("[]");
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const sqlite = new DatabaseSync(":memory:"), APP = "https://navigator-isle.github.io";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: APP, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "cs", MAX_OWNER_EMAIL: "mark@example.com",
  GITHUB_TOKEN: "ghp_x", MAX_GITHUB_REPOS: "navigator-isle/Max-mobile,navigator-isle/hobbyisle,navigator-isle/navigator-isle.github.io,navigator-isle/passage-planner-android" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, { method = "GET", body, session } = {}) => { const h = { "Content-Type": "application/json", Origin: APP }; if (session) h["X-Max-Session"] = session;
  const r = await w.fetch(new Request("https://max.example" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: "manual" }), env);
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {} return { status: r.status, data, location: r.headers.get("Location") }; };
let r = await call("/auth/google/start?return=" + encodeURIComponent(APP + "/Max-mobile/")); const g = new URL(r.location);
r = await call("/auth/google/callback?code=c&state=" + encodeURIComponent(g.searchParams.get("state"))); const session = (r.location.match(/#max_session=([\w-]+)/) || [])[1];
ok(!!session, "(signed in)");
// some data to back up, including a setting that must never leave
sqlite.exec("INSERT INTO max_notes (id,title,category,tags,body,analysis,created_at,updated_at,deleted) VALUES ('n1','Ballast log','Ship','[]','BWM D-2 notes',NULL,1,2,0)");
sqlite.exec("INSERT INTO max_memories (id,text,source,created_at,updated_at,deleted) VALUES ('m1','Mark sails on MV Pacific Star','chat',1,2,0)");
sqlite.exec("INSERT INTO max_settings (key,value,updated_at) VALUES ('max_projects','[]',1),('max_srv_trader_last','5',1),('max_api_token_x','SECRET123',1)");

const at = (iso) => w.scheduled({ scheduledTime: Date.parse(iso) }, env, { waitUntil: p => (globalThis.__jobs = (globalThis.__jobs || []).concat(p)) }).then(() => Promise.all(globalThis.__jobs.splice(0)));
const mails = () => sent.splice(0);
await at("2026-11-04T22:45:00Z");   // everything OK
ok(sent.length === 0, "health ok → no email at all", sent[0]?.slice(0, 300));
let rep = JSON.parse(sqlite.prepare("SELECT value FROM max_settings WHERE key='max_srv_guard_report'").get().value);
ok(rep.hobby && rep.hobby.state === "ok" && !rep.problems.some(p => /Hobby Isle/.test(p)), "the Hobby Isle health page was read and is fine", JSON.stringify(rep.hobby));
// ok:false → each problem as the error, its fix as the solution
health = { ok: false, problems: [{ error: "Product feed is empty", fix: "Run the feed update in Cloudflare" }, { problem: "Sitemap is 6 days old", fix: "Redeploy the site" }], warnings: [] };
await at("2026-11-05T22:45:00Z");
let m = mails();
ok(m.length === 1 && /Hobby Isle error: Product feed is empty/.test(m[0]) && /Solution: Run the feed update in Cloudflare/.test(m[0]) && /Hobby Isle error: Sitemap is 6 days old/.test(m[0]) && /Solution: Redeploy the site/.test(m[0]), "ok:false → one email: every problem as the error, its fix as the solution", m[0]?.slice(0, 700));
ok(/Subject: =\?UTF-8\?B\?/.test(m[0]) && !/Subject:[^\n]*Solution/.test(m[0]), "the subject is the first error only");
await at("2026-11-06T22:45:00Z"); ok(mails().length === 0, "same errors the next day → no repeat email (Guard only emails new problems)");
// a plain-string problem and a new one
health = { ok: false, problems: ["Checkout link is broken"], warnings: [] };
await at("2026-11-07T22:45:00Z"); m = mails(); ok(m.length === 1 && /Hobby Isle error: Checkout link is broken/.test(m[0]), "a new problem written as plain text is emailed too", m[0]?.slice(0, 400));
// the page does not load
health = { ok: true, problems: [], warnings: [] }; healthDown = true;
await at("2026-11-08T22:45:00Z"); m = mails();
ok(m.length === 1 && /health page .* does not load: answered 503/.test(m[0]) && /Solution:/.test(m[0]), "health page does not load → email", m[0]?.slice(0, 400));
healthDown = false;
await at("2026-11-09T22:45:00Z"); mails();
// warnings: only after 3 days in a row
health = { ok: true, problems: [], warnings: [{ message: "Image sizes are large", fix: "Compress the hero images" }] };
await at("2026-11-10T22:45:00Z"); ok(mails().length === 0, "warning day 1 → no email");
await at("2026-11-11T22:45:00Z"); ok(mails().length === 0, "warning day 2 → no email");
await at("2026-11-12T22:45:00Z"); m = mails();
ok(m.length === 1 && /Hobby Isle warning \(3\+ days in a row\): Image sizes are large/.test(m[0]) && /Solution: Compress the hero images/.test(m[0]), "warning day 3 in a row → reported with its fix", m[0]?.slice(0, 400));
// a warning that disappears for a day starts again
health = { ok: true, problems: [], warnings: [] }; await at("2026-11-13T22:45:00Z"); mails();
health = { ok: true, problems: [], warnings: [{ message: "Image sizes are large", fix: "Compress the hero images" }] };
sqlite.exec("DELETE FROM max_activity"); await at("2026-11-14T22:45:00Z"); sqlite.exec("DELETE FROM max_activity"); await at("2026-11-15T22:45:00Z"); const mm = mails(); ok(mm.length === 0, "a warning that went away and came back starts counting again", mm[0]?.slice(0, 500));
// warnings ride along in an error email only once they reached 3 days
health = { ok: false, problems: [{ error: "Database offline", fix: "Restart it" }], warnings: [{ message: "Image sizes are large", fix: "Compress the hero images" }] };
await at("2026-11-16T22:45:00Z"); m = mails();
ok(m.length === 1 && /Database offline/.test(m[0]) && /warning \(3\+ days in a row\): Image sizes are large/.test(m[0]), "an error email also carries warnings that reached 3 days", m[0]?.slice(0, 500));
health = { ok: false, problems: [{ error: "Database offline", fix: "Restart it" }, { error: "New thing", fix: "Fix it" }], warnings: [{ message: "Brand new warning" }] };
await at("2026-11-17T22:45:00Z"); m = mails(); ok(m.length === 1 && /New thing/.test(m[0]) && !/Brand new warning/.test(m[0]), "a brand-new warning is NOT in the email (not 3 days yet)", m[0]?.slice(0, 500));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
