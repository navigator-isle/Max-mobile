// 🛡 Guard: daily check of sites, GitHub builds, the paper trader and Max himself; emails only for new problems;
// Sunday all-clear with a backup of notes and memory emailed to him (never GitHub; no secrets inside).
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
let sent = [], fetches = 0, siteDown = false, buildFail = true, traderAge = 2;
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
await at("2026-11-04T13:45:00Z");
ok(!sqlite.prepare("SELECT value FROM max_settings WHERE key='max_srv_guard_report'").get(), "the hourly job doesn't run the Guard at other hours");
await at("2026-11-04T22:45:00Z"); // Thursday 6:45 am in Manila
let rep = JSON.parse(sqlite.prepare("SELECT value FROM max_settings WHERE key='max_srv_guard_report'").get().value);
ok(rep.sites.length === 4 && rep.sites.every(s => s.up) && rep.sites.find(s => s.name === "Hobby Isle").score >= 60, "checks every site: up, speed, and a full security & SEO score for Hobby Isle", JSON.stringify(rep.sites.map(s => [s.name, s.up, s.score])));
ok(rep.problems.some(p => /passage-planner-android: "Android build" failed/.test(p)), "spots a failed app build on GitHub", JSON.stringify(rep.problems));
ok(rep.max.some(x => /^Paper trading:/.test(x)), "checks Max's own paper trading (last step, crypto and PSE checks)", JSON.stringify(rep.max));
ok(rep.max.some(x => /Gemini key working/.test(x)) && rep.max.some(x => /Google connected/.test(x)), "checks Max himself (brain key, Google connection)", JSON.stringify(rep.max));
ok(sent.length === 1 && /Subject: =\?UTF-8\?B\?/.test(sent[0]) && /⚠ NEW:/.test(sent[0]) && /To: mark@example.com/.test(sent[0]), "new problems → one email to him", sent[0]?.slice(0, 300));
ok(!/max-backup/.test(sent[0]), "no backup on weekdays");
ok(fetches < 50, "the whole run stays inside Cloudflare's 50-requests limit (" + fetches + ")", fetches);
const actRow = sqlite.prepare("SELECT * FROM max_activity WHERE dept='guard' ORDER BY id DESC").get();
ok(actRow && actRow.ok === 0 && /problem/.test(actRow.text), "the check is in the activity log under 🛡 Guard", JSON.stringify(actRow));
await at("2026-11-04T22:45:30Z");
ok(sent.length === 1, "runs only once a day");
sent = []; fetches = 0;
await at("2026-11-05T22:45:00Z");
ok(sent.length === 0, "the same problems the next day → no repeat email");
buildFail = false; siteDown = true;
await at("2026-11-06T22:45:00Z");
ok(sent.length === 1 && /NEW: Passage Planner is DOWN/.test(sent[0]) && !/Android build/.test(sent[0]), "a new problem (site down) → email; the fixed build is gone", sent[0]?.slice(0, 400));
sent = []; siteDown = false;
await at("2026-11-07T22:45:00Z"); // Saturday 22:45 UTC = Sunday morning in Manila
const backupMail = sent.find(m => /max-backup-/.test(m)), summary = sent.find(m => !/max-backup-/.test(m));
ok(backupMail && /Content-Disposition: attachment; filename="max-backup-\d{4}-\d\d-\d\d\.json"/.test(backupMail), "Sunday: the backup is emailed as an attachment", (backupMail || "").slice(0, 300));
const att = backupMail ? JSON.parse(Buffer.from(backupMail.split("Content-Transfer-Encoding: base64\r\n\r\n")[1].split("\r\n--")[0].replace(/\r\n/g, ""), "base64").toString()) : {};
ok(att.kind === "Max backup" && att.notes.some(n => n.title === "Ballast log") && att.memories.some(m => /Pacific Star/.test(m.text)), "the backup holds his notes and memory", JSON.stringify(att).slice(0, 200));
ok(!JSON.stringify(att).includes("SECRET123") && !att.settings.some(s => /srv_/.test(s.key)), "no secrets or server keys in the backup");
ok(summary && /Backup: 1 notes and 1 memories/.test(summary), "…plus the weekly summary email", (summary || "").slice(0, 300));
// asking from the phone
r = await call("/api/guard", { session });
ok(r.status === 200 && r.data.report && r.data.lastBackup && r.data.lastBackup.ok && r.data.lastBackup.notes === 1, "the phone can read the last report and the last backup");
r = await call("/api/guard/run", { method: "POST", body: {}, session });
ok(r.status === 200 && Array.isArray(r.data.report.problems) && r.data.report.sites.length === 4, "“check everything now” runs a fresh check");
sent = [];
r = await call("/api/guard/run", { method: "POST", body: { backup: true }, session });
ok(r.data.report.backup.ok && sent.length === 1 && /max-backup-/.test(sent[0]), "“back up now” emails a backup right away");
r = await call("/api/guard");
ok(r.status === 401, "the Guard report is private");
r = await call("/health");
ok(r.data.departments.some(d => /Security/.test(d)), "the Guard (Security) is one of Max's desks");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
