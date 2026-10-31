// Phone: routines (checklists + repeating reminders), the six coaches, and Passage Planner distance / ETA / speed needed.
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
const cal = [], tasks = [], gem = [], gmail = [], calOps = [], coachSys = [];
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
    const bd = JSON.parse(o.body); gem.push(bd); const sys = JSON.stringify(bd.systemInstruction || ""); const q = bd.contents.at(-1).parts[0].text;
    let out;
    if (/COACH MODE/.test(sys)) {
      coachSys.push(sys);
      out = /check in/i.test(q) ? { reply: "Okay.", action: { type: "coach_checkin", details: { coach: "fitness", time: "20:00", repeat: "daily" } }, coach_notes: [] }
        : { reply: "Great goal. Start with 3 sets of 10 push-ups after your watch.", action: null, coach_notes: ["Goal: 10 push-ups a day", "Works 4-on 8-off watches"] };
    } else {
      const action = /remind me every day/i.test(q) ? { type: "add_event", details: { title: "Log my workout", start: dd(1) + "T07:00", reminderMinutes: 0, repeat: "daily" } } :
        /eta from longview/i.test(q) ? { type: "passage_eta", details: { from: "Longview", to: "Vancouver", speed: 12, depart: dd(1) + "T06:00" } } :
        /speed .*manila/i.test(q) ? { type: "passage_eta", details: { from: "Manila", to: "Singapore", depart: dd(1) + "T08:00", arriveBy: dd(5) + "T08:00" } } : null;
      out = { reply: action ? "Okay." : "Answer to: " + q, action };
    }
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8060", WK = "http://127.0.0.1:8846";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", MAX_OWNER_EMAIL: "mark@example.com" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  // the fake Google sign-in screen: sends you straight back with a code
  if (req.url.startsWith("/fake-google")) { const q = new URL(req.url, WK).searchParams; res.writeHead(302, { Location: q.get("redirect_uri") + "?code=abc&state=" + encodeURIComponent(q.get("state")) }); return res.end(); }
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, redirect: "manual", body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  const h = Object.fromEntries(r.headers); if (h.location && h.location.startsWith("https://accounts.google.com/")) h.location = WK + "/fake-google" + h.location.slice(h.location.indexOf("?"));
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8846);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = u.endsWith("sw.js") ? path.join(dir, "sw.js") : u.startsWith("/Max-mobile/") ? path.join(dir, "index.html") : path.join(dir, "tests", "fixtures", "planner.html"); r.writeHead(200, { "Content-Type": f.endsWith(".js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(f)); }).listen(8060);
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
const home = async () => { if (await vis("#miniHome")) await p.click("#miniHome"); };
const posts = () => calOps.filter(x => x.method === "POST");

// routines
await say("my morning routine is check email, check my watchlist and 20 push-ups");
let a = await answer();
ok(/^Saved your morning routine: 3 steps\./.test(a), "teach a routine in one sentence", a);
await say("start my morning routine");
ok(/^Morning routine, 3 steps\. Step 1: check email\./.test(await answer()) && await vis("#displayScreen"), "start it → step 1 on screen", await answer());
await say("done");
ok(/Step 2: check my watchlist/.test(await answer()), "“done” → next step", await answer());
await say("skip");
ok(/Skipped\. Step 3: 20 push-ups/.test(await answer()), "“skip” → next step", await answer());
await p.screenshot({ path: process.env.SHOT_DIR + "/routine.png" });
await say("done");
ok(/All done — 2 of 3 steps\. That’s a 1-day streak/.test(await answer()), "finished → steps done and streak", await answer());
await home();
await say("show my routines");
ok(/Morning \(done today\)/.test(await answer()), "routines list shows done today", await answer());
await home();

// repeating reminder
await say("remind me every day at 7am to log my workout");
const ev = posts().at(-1).body;
ok(JSON.stringify(ev.recurrence) === '["RRULE:FREQ=DAILY"]' && /repeating every day/.test(await answer()), "repeating reminder → daily in Google Calendar", JSON.stringify(ev) + " " + await answer());

// coaches
await say("talk to my fitness coach");
a = await answer();
ok(/^Fitness coach here\. Let’s get to know your situation first/.test(a), "first session: the coach asks about you", a);
await say("I want to do 10 push-ups a day");
a = await answer();
ok(/3 sets of 10 push-ups/.test(a) && /not medical advice/.test(coachSys.at(-1)) && /Fitness coach/.test(coachSys.at(-1)), "coach answers with his own rules (not medical advice)", a);
const cn = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).find(n => n.title === "Coach: Fitness coach"));
ok(cn && /Goal: 10 push-ups a day/.test(cn.body) && /4-on 8-off/.test(cn.body) && cn.category === "Max › Coaches", "coach keeps your goals in your notes (Max › Coaches)", JSON.stringify(cn));
ok(await p.evaluate(() => document.body.dataset.coach) === "🏋️ FITNESS COACH", "coach badge shown while in a session");
await say("fitness coach, check in with me every evening at 8");
const ci = posts().at(-1).body;
ok(/Fitness coach check-in/.test(ci.summary) && /T20:00/.test(ci.start.dateTime) && JSON.stringify(ci.recurrence) === '["RRULE:FREQ=DAILY"]' && /check in every day at 20:00/.test(await answer()), "coach check-ins scheduled every evening", JSON.stringify(ci) + " " + await answer());
await say("thanks coach");
ok(/signing off/.test(await answer()) && !(await p.evaluate(() => document.body.dataset.coach)), "“thanks coach” → back to Max");
await say("talk to my fitness coach");
ok(/Last time: Works 4-on 8-off watches/.test(await answer()), "next session: the coach remembers", await answer());
await say("thanks coach");
await say("investment coach, should I buy more BDO?");
ok(/never tell him to buy, sell or hold/.test(coachSys.at(-1)) && /not a licensed financial advisor/.test(coachSys.at(-1)), "investment coach: never tells you what to buy or sell");
await say("thanks coach");
await home();

// passage planner
await say("distance from longview to vancouver");
a = await answer();
ok(/^Longview, United States of America to Vancouver, Canada: 378\.8 nautical miles\.$/.test(a) && await p.locator("iframe[aria-hidden=true]").count() === 1, "distance → from your Passage Planner (loaded in the background)", a);
await home();
await say("what's the ETA from longview to vancouver at 12 knots leaving tomorrow 0600");
a = await answer();
ok(/At 12 knots that’s 31\.6 hours, arriving .*13:34 local time/.test(a), "ETA with the arrival port's local time", a);
ok((await p.locator("#dispBody").textContent()).includes("ETA") && (await p.locator("#dispBody").textContent()).includes("UTC−7"), "ETA card shows local and UTC times");
await p.screenshot({ path: process.env.SHOT_DIR + "/passage.png" });
await home();
await say("what speed do I need from manila to singapore");
ok(/you need 14\.1 knots/.test(await answer()), "speed needed to arrive on time", await answer());

await say("show my crew");
const crew = await p.locator("#crewBody").textContent();
ok(/Your coaches/.test(crew) && /Fitness coach — last session today/.test(crew) && /Morning — 🔥 1 days/.test(crew), "crew screen: coaches and routines", crew.slice(0, 400));
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
