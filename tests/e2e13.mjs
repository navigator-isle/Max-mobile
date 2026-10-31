// Phone: change / move / delete calendar events and organize email — always after a yes, with undo.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { DatabaseSync } from "node:sqlite"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const cal = [], tasks = [], gem = [], gmail = [], calOps = [];
const dd = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
const dentistAt = new Date(dd(2) + "T10:00:00").toISOString(), dentistEnd = new Date(dd(2) + "T11:00:00").toISOString();
const pad = n => String(n).padStart(2, "0");
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); })();
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    const p = new URLSearchParams(o.body);
    return new Response(JSON.stringify(p.get("grant_type") === "authorization_code" ? { access_token: "A", expires_in: 3600, refresh_token: "R", scope: "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify", id_token: "h." + b64u({ email: "mark@example.com" }) + ".s" } : { access_token: "A2", expires_in: 3600 }));
  }
  if (url.startsWith("https://gmail.googleapis.com")) { gmail.push({ url, method: o.method || "GET", body: o.body ? JSON.parse(o.body) : null });
    const raw = s => Buffer.from(s).toString("base64url");
    const M = id => ({ id, threadId: "th" + id, labelIds: ["INBOX", "UNREAD", id === "m1aaaaaa" ? "IMPORTANT" : "CATEGORY_PROMOTIONS"], snippet: id === "m1aaaaaa" ? "Please confirm your joining date" : "50% off shoes",
      payload: { headers: [{ name: "From", value: id === "m1aaaaaa" ? "Crewing Dept <crewing@agency.ph>" : id === "m3aaaaaa" ? "Captain Reyes <reyes@ship.com>" : "Shop <deals@shop.com>" }, { name: "Subject", value: id === "m1aaaaaa" ? "Joining instructions" : "Big sale" }, { name: "Date", value: "Fri, 30 Oct 2026 08:00:00 +0800" }, { name: "Message-ID", value: "<" + id + "@x>" }],
        mimeType: "text/plain", body: { data: raw(id === "m1aaaaaa" ? "Dear Mark, your joining date is 15 November 2026. Please confirm." : "Sale!") } } });
    if (/\/messages\?/.test(url)) return new Response(JSON.stringify({ messages: /Reyes|reyes/.test(decodeURIComponent(url)) ? [{ id: "m3aaaaaa" }] : [{ id: "m1aaaaaa" }, { id: "m2aaaaaa" }] }));
    const mm = url.match(/\/messages\/(m\daaaaaa)\?/); if (mm) return new Response(JSON.stringify(M(mm[1])));
    if (/batchModify$/.test(url) || /\/trash$/.test(url) || /\/untrash$/.test(url)) return new Response("{}");
    if (/\/labels$/.test(url)) return new Response(JSON.stringify(o.method === "POST" ? { id: "Label_7", name: JSON.parse(o.body).name } : { labels: [] }));
    if (/\/drafts$/.test(url) && o.method === "POST") return new Response(JSON.stringify({ id: "r-draft" + gmail.length + "xyz" }));
    if (/\/drafts\/[\w-]+$/.test(url) && o.method === "PUT") return new Response(JSON.stringify({ id: url.split("/").pop() }));
    if (/\/drafts\/send$/.test(url)) return new Response(JSON.stringify({ id: "sent" }));
    if (/\/drafts\/[\w-]+$/.test(url) && o.method === "DELETE") return new Response(null, { status: 204 });
  }
  if (url.includes("googleapis.com/calendar")) { const method = o.method || "GET"; calOps.push({ url, method, body: o.body ? JSON.parse(o.body) : null });
    const EV = { id: "evdentist1", summary: "Dentist", start: { dateTime: dentistAt }, end: { dateTime: dentistEnd }, reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 10 }] } };
    if (method === "PATCH") { const pb = JSON.parse(o.body); return new Response(JSON.stringify({ ...EV, ...(pb.summary ? { summary: pb.summary } : {}), ...(pb.start ? { start: pb.start, end: pb.end } : {}), ...(pb.reminders ? { reminders: pb.reminders } : {}) })); }
    if (method === "POST") { const e = JSON.parse(o.body); return new Response(JSON.stringify({ id: "evnew" + calOps.length + "abc", ...e })); }
    if (method === "DELETE") return new Response(null, { status: 204 });
    if (/events\/evdentist1$/.test(url)) return new Response(JSON.stringify(EV));
    return new Response(JSON.stringify({ items: /[?&]q=/.test(url) ? (/dentist/i.test(decodeURIComponent(url)) ? [EV] : []) : [] }));
  }
  if (url.includes("tasks.googleapis.com")) {
    if (o.method === "POST") { const t = JSON.parse(o.body); const made = { id: "tk" + (tasks.length + 10000), ...t }; tasks.push(made); return new Response(JSON.stringify(made)); }
    if (o.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ items: [{ id: "t1", title: "Renew passport", status: "needsAction" }] }));
  }
  if (url.includes("generativelanguage")) {
    const b = JSON.parse(o.body); gem.push(b); const t = b.contents[0].parts.map(x => x.text || "").join("\n");
    let out;
    if (/emails from his Gmail/.test(t)) out = { say: "2 new emails. Important: Crewing Dept wants you to confirm your joining date. The other is a shoe sale.", items: [{ n: 1, why: "Confirm joining date 15 Nov", priority: "high" }, { n: 2, why: "Promotion", priority: "low" }] };
    else if (/writing an email for Mark/.test(t)) out = { subject: "Re", body: /Current draft/.test(t) ? "Confirmed for 15 November.\nMark" : /0800/.test(t) ? "Captain, I'll be there at 0800.\nBest regards,\nMark Jun" : "Dear Crewing,\nI confirm my joining date of 15 November 2026 and will report as instructed.\nBest regards,\nMark Jun" };
    else if (/sent you an email/.test(t)) out = { kind: "email", title: "Joining instructions", topic: "Work", summary: "Confirm joining 15 Nov.", points: ["Joining 15 November 2026"], dates: [{ what: "Joining date", date: "2026-11-15" }], amounts: [], text: "Dear Mark", tags: [], say: "Crewing Dept wants you to confirm your joining date of 15 November." };
    else { const q = b.contents.at(-1).parts[0].text;
      const action = /move my dentist/i.test(q) ? { type: "edit_event", details: { find: "dentist", start: dd(3) + "T15:00" } } :
        /cancel my dentist/i.test(q) ? { type: "delete_event", details: { find: "dentist" } } :
        /remind me a day and an hour before the dentist/i.test(q) ? { type: "edit_event", details: { find: "dentist", reminders: [1440, 60] } } :
        /alarm/i.test(q) ? { type: "add_event", details: { title: "⏰ Wake up", start: dd(1) + "T05:30", reminderMinutes: 0, durationMinutes: 5 } } :
        /move my gym/i.test(q) ? { type: "edit_event", details: { find: "gym", start: dd(1) + "T07:00" } } : null;
      out = { reply: action ? "Okay." : "Answer to: " + q, action }; }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8058", WK = "http://127.0.0.1:8844";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", MAX_OWNER_EMAIL: "mark@example.com" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  // the fake Google sign-in screen: sends you straight back with a code
  if (req.url.startsWith("/fake-google")) { const q = new URL(req.url, WK).searchParams; res.writeHead(302, { Location: q.get("redirect_uri") + "?code=abc&state=" + encodeURIComponent(q.get("state")) }); return res.end(); }
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, redirect: "manual", body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  const h = Object.fromEntries(r.headers); if (h.location && h.location.startsWith("https://accounts.google.com/")) h.location = WK + "/fake-google" + h.location.slice(h.location.indexOf("?"));
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8844);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8058);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = [];
  class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
await p.goto(ORIGIN + "/Max-mobile/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();

await p.click("#openConnection"); await p.waitForTimeout(400);
await p.click("#googleSignIn");
await p.waitForURL(u => String(u).startsWith(ORIGIN + "/Max-mobile/"), { timeout: 10000 }); await p.waitForTimeout(1500);
await p.click("#openConnection"); await p.waitForTimeout(300);
ok((await p.locator("#googleStatus").textContent()).includes("Calendar, Tasks and Gmail are connected"), "settings: Gmail connected", await p.locator("#googleStatus").textContent());
await p.click("#closeConnection");
const patches = () => calOps.filter(x => x.method === "PATCH"), deletes = () => calOps.filter(x => x.method === "DELETE");
const mods = () => gmail.filter(x => /batchModify|\/trash$|\/untrash$/.test(x.url));

// calendar: move, with a yes first
await say("move my dentist appointment to 3pm in 3 days");
let a = await answer();
ok(/^Change “Dentist” \(/.test(a) && /move it to/.test(a) && /Say yes to go ahead/.test(a) && patches().length === 0, "move an event → asks first, nothing changed yet", a);
await p.screenshot({ path: process.env.SHOT_DIR + "/confirm-edit.png" });
await say("yes");
a = await answer();
ok(patches().length === 1 && patches()[0].body.start.dateTime === dd(3) + "T15:00:00" && /^Done — “Dentist” is now/.test(a), "“yes” → moved (keeps the same length)", a);
await say("undo");
ok(patches().length === 2 && patches()[1].body.start.dateTime.startsWith(dd(2) + "T10:00") && /back to/.test(await answer()), "“undo” → back to the old time", await answer());
await say("remind me a day and an hour before the dentist");
await say("yes");
ok(JSON.stringify(patches().at(-1).body.reminders.overrides.map(x => x.minutes)) === "[1440,60]", "several reminders on an event", JSON.stringify(patches().at(-1).body));

// delete: "no" keeps it; "yes" deletes; undo puts it back
await say("cancel my dentist appointment");
ok(/^Delete “Dentist” on/.test(await answer()), "delete → asks first", await answer());
await say("no");
ok(deletes().length === 0 && /left it as it was/.test(await answer()), "“no” → nothing deleted");
await say("cancel my dentist appointment");
await say("yes");
ok(deletes().length === 1 && /Deleted “Dentist”/.test(await answer()), "“yes” → deleted", await answer());
await say("undo");
const back = calOps.filter(x => x.method === "POST").at(-1);
ok(back && back.body.summary === "Dentist" && /Put back/.test(await answer()), "“undo” → the event is put back", await answer());
await say("move my gym session to 7am tomorrow");
ok(/couldn’t find “gym/.test(await answer()), "unknown event → says so, changes nothing", await answer());
await say("set an alarm for 5:30 tomorrow");
const al = calOps.filter(x => x.method === "POST").at(-1).body;
ok(al.summary === "⏰ Wake up" && al.reminders.overrides[0].minutes === 0, "alarm → calendar alert at the exact time", JSON.stringify(al));
await p.click("#miniHome");

// email organizing
await say("check my email");
await say("archive number 2");
a = await answer();
ok(/^Archive 1 email: Shop — Big sale\?/.test(a) && mods().length === 0, "“archive number 2” → asks first", a);
await say("yes");
ok(mods().length === 1 && JSON.stringify(mods()[0].body.removeLabelIds) === '["INBOX"]' && /archived/.test(await answer()), "“yes” → archived", await answer());
await say("undo");
ok(mods().length === 2 && JSON.stringify(mods()[1].body.addLabelIds) === '["INBOX"]', "“undo” → back in the inbox");
await say("read number 1");
await say("delete this email");
a = await answer();
ok(/^Move to trash 1 email: Crewing Dept — Joining instructions\?/.test(a) && /back from Trash for 30 days/.test(a), "“delete this email” → trash (recoverable), asks first", a);
await say("yes");
ok(gmail.some(x => /m1aaaaaa\/trash$/.test(x.url)) && !gmail.some(x => x.method === "DELETE" && /messages/.test(x.url)), "moved to trash — never permanently deleted");
await say("delete all emails from shop");
a = await answer();
ok(/2 emails/.test(a) && gmail.some(x => /from%3A%28shop%29|from:\(shop\)/.test(decodeURIComponent(x.url))), "“delete all emails from shop” → finds them, asks first", a);
await say("no");
ok(!gmail.some(x => /m2aaaaaa\/trash$/.test(x.url)), "“no” → nothing moved");
await say("label this email as contracts");
ok(/^Which emails\?/.test(await answer()), "“this email” with none open → asks which (changes nothing)", await answer());
await say("check my email");
await say("read number 2");
await say("label this email as contracts");
ok(/^Label 1 email as “contracts”: Shop — Big sale\?/.test(await answer()), "label the open email by voice", await answer());
await say("yes");
ok(gmail.some(x => /\/labels$/.test(x.url) && x.method === "POST") && mods().at(-1).body.addLabelIds?.[0] === "Label_7", "label created and applied");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
