// Calendar changes (find, move, rename, reminders, delete) and email organizing (archive, trash, read, star, labels) — only with confirmation, with undo info.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const _unused=0;const _u=0;let googleEmail = "mark@example.com", tokenCalls = [], gcal = [], gtasks = [], lastChat = null, refreshOk = true;
let scope = "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify", calls = [];
const EV = { id: "evdentist1", summary: "Dentist", start: { dateTime: "2026-11-03T10:00:00+08:00", timeZone: "Asia/Manila" }, end: { dateTime: "2026-11-03T11:00:00+08:00" }, reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] } };
globalThis.fetch = async (u, o = {}) => {
  const url = String(u), method = o.method || "GET"; let jb = null; try { jb = o.body && o.body !== "{}" ? JSON.parse(o.body) : null; } catch {} calls.push({ url, method, body: jb });
  if (url.startsWith("https://oauth2.googleapis.com/token")) { const p = new URLSearchParams(o.body);
    return new Response(JSON.stringify(p.get("grant_type") === "authorization_code" ? { access_token: "A", expires_in: 3600, refresh_token: "R", scope, id_token: "h." + b64u({ email: "mark@example.com" }) + ".s" } : { access_token: "A2", expires_in: 3600 })); }
  if (url.startsWith("https://www.googleapis.com/calendar")) {
    if (method === "PATCH") { const p = JSON.parse(o.body); return new Response(JSON.stringify({ ...EV, ...(p.summary ? { summary: p.summary } : {}), ...(p.start ? { start: p.start, end: p.end } : {}), ...(p.reminders ? { reminders: p.reminders } : {}) })); }
    if (method === "POST") { const e = JSON.parse(o.body); return new Response(JSON.stringify({ id: "evnew12345", ...e })); }
    if (/events\/evdentist1$/.test(url)) return new Response(JSON.stringify(EV));
    return new Response(JSON.stringify({ items: /q=Dentist|q=dentist/.test(url) ? [EV] : [EV, { id: "evother123", summary: "Port call", start: { date: "2026-11-05" }, end: { date: "2026-11-06" } }] }));
  }
  if (url.startsWith("https://gmail.googleapis.com")) {
    if (/\/messages\?/.test(url)) return new Response(JSON.stringify({ messages: [{ id: "m1aaaaaa" }, { id: "m2aaaaaa" }] }));
    if (/\/messages\/m\daaaaaa\?/.test(url)) return new Response(JSON.stringify({ id: url.match(/m\daaaaaa/)[0], labelIds: ["INBOX", "UNREAD"], payload: { headers: [{ name: "From", value: "Shop <deals@shop.com>" }, { name: "Subject", value: "Sale" }] } }));
    if (/\/labels$/.test(url) && method === "GET") return new Response(JSON.stringify({ labels: [{ id: "Label_1", name: "Work" }] }));
    if (/\/labels$/.test(url) && method === "POST") return new Response(JSON.stringify({ id: "Label_9", name: JSON.parse(o.body).name }));
    return new Response("{}");
  }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const sqlite = new DatabaseSync(":memory:"), APP = "https://navigator-isle.github.io";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: APP, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "cs", MAX_OWNER_EMAIL: "mark@example.com" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, { method = "GET", body, session } = {}) => { const h = { "Content-Type": "application/json", Origin: APP }; if (session) h["X-Max-Session"] = session;
  const r = await w.fetch(new Request("https://max.example" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: "manual" }), env);
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {} return { status: r.status, data, location: r.headers.get("Location") }; };
const link = async () => { let r = await call("/auth/google/start?return=" + encodeURIComponent(APP + "/Max-mobile/"));
  const g = new URL(r.location); r = await call("/auth/google/callback?code=c&state=" + encodeURIComponent(g.searchParams.get("state")));
  return (r.location.match(/#max_session=([\w-]+)/) || [])[1]; };
let session = await link();

// calendar
let r = await call("/api/calendar/find?q=Dentist", { session });
ok(r.data.events.length === 1 && r.data.events[0].title === "Dentist" && r.data.events[0].reminders[0] === 10, "find an event by name", JSON.stringify(r.data));
calls = [];
r = await call("/api/calendar/event", { method: "PATCH", session, body: { id: "evdentist1", start: "2026-11-04T15:00", tz: "Asia/Manila" } });
let pt = calls.find(c => c.method === "PATCH").body;
ok(r.status === 200 && pt.start.dateTime === "2026-11-04T15:00:00" && pt.end.dateTime === "2026-11-04T16:00:00" && !pt.summary, "move an event: keeps its 1-hour length, nothing else changed", JSON.stringify(pt));
ok(r.data.before.start === "2026-11-03T10:00:00+08:00", "returns the old version (for undo)");
calls = [];
r = await call("/api/calendar/event", { method: "PATCH", session, body: { id: "evdentist1", title: "Dentist (Dr. Cruz)", reminders: [1440, 60, 60, 0] } });
pt = calls.find(c => c.method === "PATCH").body;
ok(pt.summary === "Dentist (Dr. Cruz)" && JSON.stringify(pt.reminders.overrides.map(x => x.minutes)) === "[1440,60,0]" && !pt.start, "rename + several reminders (a day, an hour, at the time)", JSON.stringify(pt));
r = await call("/api/calendar/event", { method: "PATCH", session, body: { id: "evdentist1" } });
ok(r.status === 400, "nothing to change → asks what to change");
r = await call("/api/calendar/event", { method: "POST", session, body: { title: "⏰ Wake up", start: "2026-11-01T05:30", reminderMinutes: 0, durationMinutes: 5, reminders: [0], tz: "Asia/Manila" } });
const al = calls.filter(c => c.method === "POST" && c.url.includes("calendar")).at(-1).body;
ok(al.summary === "⏰ Wake up" && al.reminders.overrides[0].minutes === 0, "alarm = calendar alert at the exact time");
r = await call("/api/calendar/event?id=evdentist1", { method: "DELETE", session });
ok(r.data.deleted && calls.some(c => c.method === "DELETE" && c.url.endsWith("/events/evdentist1")), "delete an event");
r = await call("/api/calendar/event?id=evdentist1", { session });
ok(r.data.event.title === "Dentist", "read one event (used to restore after undo)");

// gmail organize
r = await call("/api/gmail/find", { method: "POST", session, body: { query: "from:shop" } });
ok(r.data.items.length === 2 && r.data.items[0].from === "Shop", "find emails to organize (no AI needed)");
calls = [];
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa", "m2aaaaaa"], op: "trash" } });
ok(r.status === 400 && r.data.needConfirm && !calls.some(c => c.method === "POST" && /gmail/.test(c.url)), "no change without his yes");
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa", "m2aaaaaa"], op: "trash", confirm: "MODIFY trash 1" } });
ok(r.status === 400, "the yes must match exactly what he was asked (count and action)");
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa", "m2aaaaaa"], op: "trash", confirm: "MODIFY trash 2" } });
ok(r.data.done === 2 && r.data.undo.op === "untrash" && calls.filter(c => /\/trash$/.test(c.url)).length === 2 && !calls.some(c => c.method === "DELETE"), "trash = recoverable (moved to Trash, never permanently deleted)");
calls = [];
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa"], op: "archive", confirm: "MODIFY archive 1" } });
let bm = calls.find(c => /batchModify/.test(c.url)).body;
ok(JSON.stringify(bm.removeLabelIds) === '["INBOX"]' && r.data.undo.op === "unarchive", "archive (and its undo)");
calls = [];
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa"], op: "read", confirm: "MODIFY read 1" } });
ok(JSON.stringify(calls.find(c => /batchModify/.test(c.url)).body.removeLabelIds) === '["UNREAD"]', "mark as read");
calls = [];
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa"], op: "label", label: "Contracts", confirm: "MODIFY label 1" } });
ok(calls.some(c => /\/labels$/.test(c.url) && c.method === "POST" && c.body.name === "Contracts") && JSON.stringify(calls.find(c => /batchModify/.test(c.url)).body.addLabelIds) === '["Label_9"]', "label: creates the label if needed");
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa"], op: "delete_forever", confirm: "MODIFY delete_forever 1" } });
ok(r.status === 400, "permanent delete is not possible");
scope = "openid email https://www.googleapis.com/auth/gmail.readonly"; session = await link();
r = await call("/api/gmail/modify", { method: "POST", session, body: { ids: ["m1aaaaaa"], op: "archive", confirm: "MODIFY archive 1" } });
ok(r.status === 409 && r.data.needGmailModify, "signed in before this feature → asks to allow organizing");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
