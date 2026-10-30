// Google sign-in (replaces the passcode once linked) and Calendar / Tasks, against a fake Google.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
let googleEmail = "mark@example.com", tokenCalls = [], gcal = [], gtasks = [], lastChat = null, refreshOk = true;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    const p = new URLSearchParams(o.body); tokenCalls.push(Object.fromEntries(p));
    if (p.get("grant_type") === "authorization_code") return new Response(JSON.stringify({ access_token: "AT1", expires_in: 3600, refresh_token: "RT-secret", scope: "x", id_token: "h." + b64u({ email: googleEmail }) + ".s" }));
    return refreshOk ? new Response(JSON.stringify({ access_token: "AT2", expires_in: 3600 })) : new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
  }
  if (url.startsWith("https://www.googleapis.com/calendar")) {
    if (o.method === "POST") { const e = JSON.parse(o.body); gcal.push({ ...e, auth: o.headers.Authorization }); return new Response(JSON.stringify({ id: "ev12345", ...e, htmlLink: "https://cal/ev" })); }
    if (o.method === "DELETE") { gcal.push({ deleted: url.split("/").pop() }); return new Response(null, { status: 204 }); }
    return new Response(JSON.stringify({ items: [{ id: "e1", summary: "Port State inspection", start: { dateTime: "2026-10-31T09:00:00+08:00" }, end: { dateTime: "2026-10-31T10:00:00+08:00" } }, { id: "e2", summary: "Sign off", start: { date: "2026-11-02" }, end: { date: "2026-11-03" } }] }));
  }
  if (url.startsWith("https://tasks.googleapis.com")) {
    if (o.method === "POST") { const t = JSON.parse(o.body); gtasks.push(t); return new Response(JSON.stringify({ id: "tk12345", ...t })); }
    if (o.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ items: [{ id: "t1", title: "Renew passport", due: "2026-11-05T00:00:00.000Z", status: "needsAction" }, { id: "t2", title: "Done thing", status: "completed" }] }));
  }
  if (url.includes("generativelanguage")) { lastChat = JSON.parse(o.body); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Done.", action: { type: "add_event", query: "", details: { title: "Renew passport", start: "2026-10-31T09:00", reminderMinutes: 0 } } }) }] } }] })); }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const sqlite = new DatabaseSync(":memory:");
const APP = "https://navigator-isle.github.io";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: APP, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret", MAX_OWNER_EMAIL: "Mark@Example.com" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, { method = "GET", body, pass: pw, session, e = env, origin = APP } = {}) => {
  const h = { "Content-Type": "application/json" }; if (origin) h.Origin = origin; if (pw !== undefined) h["X-Max-Pass"] = pw; if (session) h["X-Max-Session"] = session;
  const r = await w.fetch(new Request("https://max-ai-backend.example.workers.dev" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: "manual" }), e);
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, text, location: r.headers.get("Location") };
};
let r = await call("/health", { pass: "pw" });
ok(r.data.google === "set up, not signed in" && r.data.login === "passcode" && r.data.passcode === "accepted", "before Google sign-in: passcode still works", JSON.stringify(r.data));
r = await call("/api/calendar?from=2026-10-30T00:00:00Z&to=2026-10-31T00:00:00Z", { pass: "pw" });
ok(r.status === 409 && r.data.needGoogle, "calendar asks to connect Google first");

// start sign-in
r = await call("/auth/google/start?return=" + encodeURIComponent("https://evil.example/steal"), { origin: "" });
ok(r.status === 400, "sign-in refuses to send you to another website");
r = await call("/auth/google/start?return=" + encodeURIComponent(APP + "/Max-mobile/"), { origin: "" });
const g = new URL(r.location);
ok(r.status === 302 && g.host === "accounts.google.com" && g.searchParams.get("access_type") === "offline" && g.searchParams.get("scope").includes("calendar.events") && g.searchParams.get("scope").includes("tasks") && g.searchParams.get("redirect_uri") === "https://max-ai-backend.example.workers.dev/auth/google/callback", "sign-in goes to Google asking for Calendar + Tasks", r.location);
const state = g.searchParams.get("state");
// tampered state
r = await call("/auth/google/callback?code=c&state=" + encodeURIComponent(state.replace(/.$/, "x")), { origin: "" });
ok(r.status === 400 && /expired/i.test(r.text), "a forged sign-in is refused");
// wrong Google account
googleEmail = "someone@else.com";
r = await call("/auth/google/callback?code=c&state=" + encodeURIComponent(state), { origin: "" });
ok(r.status === 403 && /Not Max/.test(r.text) && sqlite.prepare("SELECT count(*) c FROM max_google").get().c === 0, "another Google account cannot sign in");
// right account
googleEmail = "mark@example.com";
r = await call("/auth/google/callback?code=c&state=" + encodeURIComponent(state), { origin: "" });
const back = r.location || "";
const session = (back.match(/#max_session=([A-Za-z0-9_-]+)/) || [])[1];
ok(r.status === 302 && back.startsWith(APP + "/Max-mobile/#max_session=") && session && session.length > 30, "owner signs in → back to the app with a session", back);
const row = sqlite.prepare("SELECT * FROM max_google").get();
ok(row && !row.refresh_enc.includes("RT-secret"), "Google key stored encrypted, not in plain text");
ok(!JSON.stringify(sqlite.prepare("SELECT * FROM max_sessions").all()).includes(session), "session stored only as a hash");

// after linking: passcode no longer enough
r = await call("/api/memory", { pass: "pw" });
ok(r.status === 401 && r.data.needLogin === "google", "after Google sign-in, the passcode alone is refused");
r = await call("/api/memory", { session: "made-up-session-token-xxxxxxxxxxxxxxxxx" });
ok(r.status === 401, "a made-up session is refused");
r = await call("/api/memory", { session });
ok(r.status === 200, "signed-in phone works");
r = await call("/health", { session });
ok(r.data.login === "google" && r.data.google === "linked" && r.data.session === "accepted" && r.data.database === "ready", "health shows Google login", JSON.stringify(r.data));

// calendar & tasks
r = await call("/api/calendar?from=2026-10-30T00:00:00Z&to=2026-11-06T00:00:00Z", { session });
ok(r.status === 200 && r.data.events.length === 2 && r.data.events[1].allDay && r.data.tasks.length === 1 && r.data.tasks[0].due === "2026-11-05", "reads your calendar and open tasks", JSON.stringify(r.data));
r = await call("/api/calendar/event", { method: "POST", session, body: { title: "Renew passport", start: "2026-10-31T09:00", reminderMinutes: 0, tz: "Asia/Manila" } });
const ev = gcal.at(-1);
ok(r.status === 200 && ev.start.dateTime === "2026-10-31T09:00:00" && ev.start.timeZone === "Asia/Manila" && ev.end.dateTime === "2026-10-31T09:30:00" && ev.reminders.overrides[0].minutes === 0 && ev.auth === "Bearer AT2", "adds a timed reminder with a phone notification", JSON.stringify(ev));
r = await call("/api/calendar/event", { method: "POST", session, body: { title: "Sign off day", start: "2026-11-02", allDay: true } });
ok(gcal.at(-1).start.date === "2026-11-02" && gcal.at(-1).end.date === "2026-11-03", "adds an all-day event");
r = await call("/api/calendar/event", { method: "POST", session, body: { title: "x", start: "next friday" } });
ok(r.status === 400, "refuses an event without a proper date");
r = await call("/api/calendar/event?id=ev12345", { method: "DELETE", session });
ok(r.data.deleted && gcal.at(-1).deleted === "ev12345", "undo removes the event");
r = await call("/api/tasks", { method: "POST", session, body: { title: "Buy safety shoes", due: "2026-11-04" } });
ok(r.data.task.id === "tk12345" && gtasks.at(-1).due === "2026-11-04T00:00:00.000Z", "adds a to-do to Google Tasks");
r = await call("/api/calendar/event?id=../../x", { method: "DELETE", session });
ok(r.status === 400, "bad ids refused");

// chat knows the calendar is connected and returns event details
r = await call("/api/chat", { method: "POST", session, body: { message: "remind me Friday 9am to renew my passport", allowActions: true, useCloudMemory: true, now: "Thu Oct 30 2026 09:00", tz: "Asia/Manila" } });
ok(r.data.action?.type === "add_event" && r.data.action.details.start === "2026-10-31T09:00" && r.data.action.details.reminderMinutes === 0, "chat turns a request into a calendar action", JSON.stringify(r.data.action));
ok(lastChat.systemInstruction.parts[0].text.includes("add_event (a calendar event or a timed reminder"), "Max is told the calendar is connected");

// Google access revoked → clear message
refreshOk = false; await w.fetch(new Request("https://x/health"), { ...env }); // no-op
const w2 = (await import(process.argv[2] + "?fresh")).default;
r = await (async () => { const res = await w2.fetch(new Request("https://x/api/calendar?from=2026-10-30T00:00:00Z&to=2026-10-31T00:00:00Z", { headers: { Origin: APP, "X-Max-Session": session } }), env); return { status: res.status, data: await res.json() }; })();
ok(r.status === 502 && /sign in with Google again/i.test(r.data.error), "if Google access expires, Max says to sign in again", JSON.stringify(r.data));
refreshOk = true;

// sign out + disconnect
r = await call("/api/session", { method: "DELETE", session });
r = await call("/api/memory", { session });
ok(r.status === 401, "sign out ends that session");
// disconnect needs a valid session: sign in again
r = await call("/auth/google/start?return=" + encodeURIComponent(APP + "/Max-mobile/"), { origin: "" });
r = await call("/auth/google/callback?code=c&state=" + encodeURIComponent(new URL(r.location).searchParams.get("state")), { origin: "" });
const s2 = r.location.split("#max_session=")[1];
ok(!!s2 && s2 !== session, "signing in again gives a new session");
r = await call("/api/google/disconnect", { method: "POST", session: s2 });
r = await call("/api/memory", { pass: "pw" });
ok(r.status === 200, "disconnect Google → passcode works again (no lock-out)");

// not configured: nothing changes
r = await call("/health", { pass: "pw", e: { GEMINI_API_KEY: "k", MAX_PASSCODE: "pw", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) } });
ok(r.data.google === "not set up" && r.data.login === "passcode", "without Google settings, everything works as before");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
