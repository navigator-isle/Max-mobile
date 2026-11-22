// Phone: several instructions in one message, delete-all with repeating series, and no false "done".
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
const cal = [{id:"ser1",title:"⏰ Planting",series:1,base:1},{id:"ser1_a",summary:"⏰ Planting",recurringEventId:"ser1",d:1},{id:"ser1_b",summary:"⏰ Planting",recurringEventId:"ser1",d:2},{id:"evdentist1",summary:"Dentist",d:3}], tasks = [], gem = [], gmail = [], calOps = [];
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
    const mk = e => ({ id: e.id, summary: e.summary, recurringEventId: e.recurringEventId, start: { dateTime: new Date(dd(e.d || 1) + "T06:30:00").toISOString() }, end: { dateTime: new Date(dd(e.d || 1) + "T06:35:00").toISOString() }, reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }] } });
    if (method === "POST") { const e = JSON.parse(o.body); const made = { id: "evnew" + calOps.length + "abc", summary: e.summary, d: 1 }; cal.push(made); return new Response(JSON.stringify({ ...mk(made), ...e })); }
    const idm = url.match(/\/events\/([A-Za-z0-9_-]+)(\?|$)/);
    if (method === "DELETE") { const id = idm[1]; for (let k = cal.length - 1; k >= 0; k--) if (cal[k].id === id || cal[k].recurringEventId === id) cal.splice(k, 1); return new Response(null, { status: 204 }); }
    if (idm) { const e = cal.find(x => x.id === idm[1]); return e ? new Response(JSON.stringify(mk(e))) : new Response(JSON.stringify({ error: { message: "Not Found" } }), { status: 404 }); }
    return new Response(JSON.stringify({ items: cal.filter(e => !e.base && (!/[?&]q=/.test(url) || new RegExp(decodeURIComponent(url.match(/[?&]q=([^&]*)/)[1]).replace(/\+/g, " "), "i").test(e.summary))).map(mk) }));
  }
  if (url.includes("tasks.googleapis.com")) return new Response(JSON.stringify({ items: [] }));
  if (url.includes("generativelanguage")) {
    const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text; let out;
    const add = (t, h, m) => ({ type: "add_event", details: { title: "⏰ " + t, start: dd(2) + "T" + h + ":" + m, reminderMinutes: 0, durationMinutes: 5 } });
    if (/three alarms/i.test(q)) { const l = [add("Planting", "06", "30"), add("Review", "10", "40"), add("Take bath", "18", "00")]; out = { reply: "Okay, all set.", action: l[0], actions: l }; }
    else if (/clear out my calendar stuff/i.test(q)) out = { reply: "Deleted everything already.", action: null };
    else out = { reply: "Answer to: " + q, action: null };
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
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
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


const names = () => cal.filter(e => !e.base).map(e => e.summary);
await say("set three alarms: planting 6:30 am, review 10:40 am, take bath 6 pm");
let a = await answer();
ok(/I did 3 of 3/.test(a) && /Planting/.test(a) && /Review/.test(a) && /Take bath/.test(a), "three instructions in one message → all three saved and listed", a);
ok(["⏰ Planting", "⏰ Review", "⏰ Take bath"].every(t => names().includes(t)), "…all three are really in the calendar", names().join(","));
await say("delete all my alarms");
a = await answer();
ok(/^I found 4 alarms?/.test(a) && /every repeat/.test(a), "delete all alarms → lists 4 (repeating one counted once) and asks first", a);
ok(names().length === 6 && cal.some(e => e.id === "evdentist1"), "nothing deleted before the yes");
await say("yes");
a = await answer();
ok(/^Deleted 4 of 4/.test(a) && /none of them are left/.test(a), "yes → deleted 4 of 4 and checked again", a);
ok(!cal.some(e => /Planting|Review|bath/.test(e.summary || e.title || "")) && cal.some(e => e.id === "evdentist1"), "alarms (and the whole repeating series) are gone, the dentist stays", JSON.stringify(cal.map(e => e.id)));
ok(calOps.some(x => x.method === "DELETE" && /events\/ser1(\?|$)/.test(x.url)), "the whole series was deleted, not one day");
await say("clear out my calendar stuff please set");
a = await answer();
ok(/I did not change your calendar/.test(a), "AI says 'deleted' but ran nothing → Max corrects it", a);
ok(errs.length === 0, "no page errors", errs.join("|"));
await b.close(); sW.close(); sP.close(); console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
