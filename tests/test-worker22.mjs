// Max without GitHub: the Worker serves the phone app, allows its own address, hides _src/, and backs up ALL code to Gmail.
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
  if (url.startsWith("https://max-ai-backend.mjgaly-mg.workers.dev/")) return new Response("ok");
  if (url === "https://navigator-isle.github.io/") return siteDown ? new Response("down", { status: 503 }) : new Response("ok");
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
import fs from "node:fs"; import path from "node:path";
const SITE = process.argv[3];
const ASSETS = { fetch: async req => { const u = new URL(req.url); const f = path.join(SITE, decodeURIComponent(u.pathname === "/" ? "/index.html" : u.pathname));
  return fs.existsSync(f) && fs.statSync(f).isFile() ? new Response(fs.readFileSync(f)) : new Response("nope", { status: 404 }); } };
const sqlite = new DatabaseSync(":memory:"), APP = "https://navigator-isle.github.io";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: APP, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "cs", MAX_OWNER_EMAIL: "mark@example.com",
  ASSETS, };
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

// 1) The phone app on Max's own address can talk to Max (same origin), even though ALLOWED_ORIGIN is still the old GitHub address.
const SELF = "https://max-ai-backend.mjgaly-mg.workers.dev";
const viaSelf = async (p, opt = {}) => { const h = { "Content-Type": "application/json", Origin: SELF, ...(opt.headers || {}) }; if (opt.session) h["X-Max-Session"] = opt.session;
  const r = await w.fetch(new Request(SELF + p, { method: opt.method || "GET", headers: h, body: opt.body ? JSON.stringify(opt.body) : undefined, redirect: "manual" }), env); return r; };
let q = await viaSelf("/api/memory", { session });
ok(q.status === 200 && q.headers.get("Access-Control-Allow-Origin") === SELF, "app served from Max's own address is allowed (same origin)", q.status + " " + q.headers.get("Access-Control-Allow-Origin"));
q = await w.fetch(new Request(SELF + "/api/memory", { method: "OPTIONS", headers: { Origin: SELF } }), env);
ok(q.headers.get("Access-Control-Allow-Origin") === SELF, "preflight from his own address is allowed");
q = await w.fetch(new Request(SELF + "/api/memory", { headers: { Origin: "https://evil.example", "X-Max-Session": session } }), env);
ok(q.status === 403, "other websites are still blocked", q.status);
q = await call("/api/memory", { session });
ok(q.status === 200, "the old GitHub Pages address still works too (if GitHub comes back)");
// Google sign-in can send him back to the new address
q = await w.fetch(new Request(SELF + "/auth/google/start?return=" + encodeURIComponent(SELF + "/"), { redirect: "manual" }), env);
ok(q.status === 302 && /accounts\.google\.com/.test(q.headers.get("Location") || ""), "Sign in with Google works from the new address", q.status);
// 2) _src/ (the code copy) is never public
for (const p of ["/_src/max-code.zip", "/_src/files.json", "/_src/worker.js"]) { q = await viaSelf(p); ok(q.status === 404, p + " is not public", q.status); }
// 3) Download code backup (signed in only)
q = await viaSelf("/api/backup/code");
ok(q.status === 401, "code download needs his sign-in", q.status);
q = await viaSelf("/api/backup/code", { session });
const zipBytes = Buffer.from(await q.arrayBuffer());
ok(q.status === 200 && q.headers.get("Content-Type") === "application/zip" && zipBytes.readUInt32LE(0) === 0x04034b50 && /max-code-\d{4}-\d\d-\d\d\.zip/.test(q.headers.get("Content-Disposition") || ""), "signed in → downloads max-code-DATE.zip", q.status + " " + q.headers.get("Content-Disposition"));

// 4) Weekly backup email now carries the code too
sent = [];
q = await viaSelf("/api/guard/run", { method: "POST", body: { backup: true }, session });
const mail = sent.find(m => /max-backup-/.test(m)) || "";
ok(/filename="max-backup-\d{4}-\d\d-\d\d\.json"/.test(mail) && /filename="max-code-\d{4}-\d\d-\d\d\.zip"/.test(mail), "the backup email has the data (.json) AND all the code (.zip)", mail.slice(0, 300));
const zpart = mail.split('filename="max-code-')[1] || "";
const z64 = (zpart.split("Content-Transfer-Encoding: base64\r\n\r\n")[1] || "").split("\r\n--")[0].replace(/\r\n/g, "");
const z = Buffer.from(z64, "base64");
ok(z.length > 500000 && z.readUInt32LE(0) === 0x04034b50 && z.equals(zipBytes), "the emailed zip is the full code copy (" + Math.round(z.length / 1024) + " KB)");
ok(/rebuilds Max on Cloudflare/.test(mail), "the email says how to use it");

// 5) Health shows it
q = await viaSelf("/health");
const h = await q.json();
ok(h.app === "served by this Worker" && /^\d+ files, built /.test(h.codeBackup), "health shows the app and the code copy", h.app + " / " + h.codeBackup);
// 6) Without the app files attached (old setup) nothing breaks
const env2 = { ...env }; delete env2.ASSETS;
q = await w.fetch(new Request(SELF + "/api/backup/code", { headers: { "X-Max-Session": session, Origin: SELF } }), env2);
ok(q.status === 404, "no code copy yet → a clear message, not a crash", q.status);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
