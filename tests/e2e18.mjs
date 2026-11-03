// Phone: offline — saved calendar, prices and inbox; requests wait in the outbox and run by themselves when back online.
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
const cal = [], tasks = [], gem = [], gmail = [], calOps = [], coachSys = [], chats = [];
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
    return new Response(JSON.stringify({ items: [EV] }));
  }
  if (url.includes("tasks.googleapis.com")) {
    if (o.method === "POST") { const t = JSON.parse(o.body); const made = { id: "tk" + (tasks.length + 10000), ...t }; tasks.push(made); return new Response(JSON.stringify(made)); }
    if (o.method === "DELETE") return new Response(null, { status: 204 });
    return new Response(JSON.stringify({ items: [{ id: "t1", title: "Renew passport", status: "needsAction" }] }));
  }
  if (url.startsWith("https://api.coingecko.com/api/v3/simple/price")) return new Response(JSON.stringify({ bitcoin: { php: 5800000, usd: 99000, php_24h_change: -2.5, last_updated_at: 1793400000 } }));
  if (url.includes("generativelanguage")) {
    const bd = JSON.parse(o.body); gem.push(bd); const q = bd.contents.at(-1).parts[0].text;
    if (bd.tools) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "TITLE: BWM latest\nTOPIC: Maritime › BWM\nPOINTS:\n- D-2 applies to all ships.\nCONFIDENCE: high" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://imo.org", title: "imo.org" } }] } }] }));
    chats.push({ q, now: null });
    const action = /remind me tomorrow at 9/i.test(q) ? { type: "add_event", details: { title: "Call the agency", start: dd(1) + "T09:00", reminderMinutes: 0 } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Okay." : "Answer to: " + q, action }) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8063", WK = "http://127.0.0.1:8848";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", MAX_OWNER_EMAIL: "mark@example.com" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  // the fake Google sign-in screen: sends you straight back with a code
  if (req.url.startsWith("/fake-google")) { const q = new URL(req.url, WK).searchParams; res.writeHead(302, { Location: q.get("redirect_uri") + "?code=abc&state=" + encodeURIComponent(q.get("state")) }); return res.end(); }
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, redirect: "manual", body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  const h = Object.fromEntries(r.headers); if (h.location && h.location.startsWith("https://accounts.google.com/")) h.location = WK + "/fake-google" + h.location.slice(h.location.indexOf("?"));
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8848);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = u.endsWith("sw.js") ? path.join(dir, "sw.js") : u.startsWith("/Max-mobile/") ? path.join(dir, "index.html") : path.join(dir, "tests", "fixtures", "planner.html"); r.writeHead(200, { "Content-Type": f.endsWith(".js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(f)); }).listen(8063);
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
const home = async () => { if (await vis("#miniHome")) await p.click("#miniHome"); };
const label = () => p.locator("#globalStatus").textContent();
// online: Max keeps copies
await say("what's on my schedule this week");
ok(/Dentist/.test(await answer()), "online: schedule read (and a copy kept)", await answer());
await say("how much is bitcoin");
await home();
ok(/5\.8 million pesos/.test(await answer()), "online: price read (and a copy kept)", await answer());

// offline
await ctx.setOffline(true); await p.waitForTimeout(500);
ok(/^Offline/.test(await label()), "offline shown at the top", await label());
await say("what's on my schedule this week");
ok(/Dentist/.test(await answer()) && /saved copy/.test(await answer()), "offline: schedule from the saved copy", await answer());
await say("how much is bitcoin");
ok(/5\.8 million pesos/.test(await answer()), "offline: last saved price", await answer());
ok(/saved .*offline/.test(await p.locator("#dispBody").textContent()), "and the card says it's a saved price", (await p.locator("#dispBody").textContent()).slice(0, 300));
await home();
await say("remind me tomorrow at 9 to call the agency");
ok(/saved that and I’ll do it as soon as we’re back online/.test(await answer()) && /1 waiting/.test(await label()), "offline: a reminder waits in the outbox", await answer() + " | " + await label());
await say("research the latest BWM rules");
ok(/2 things waiting/.test(await answer()) && /2 waiting/.test(await label()), "offline: research waits too", await answer());
await say("my evening routine is check emails and stretch");
ok(/Saved your evening routine/.test(await answer()), "offline: things that don't need the internet still work");
await home();
await say("what's waiting");
ok(/2 things are waiting for the internet/.test(await answer()), "“what's waiting” lists the outbox", await answer());
const before = calOps.filter(x => x.method === "POST").length;

// back online
await ctx.setOffline(false);
await p.waitForFunction(() => !/waiting/.test(document.getElementById("globalStatus").textContent), null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(1500);
const ev = calOps.filter(x => x.method === "POST").slice(before)[0];
ok(ev && ev.body.summary === "Call the agency" && ev.body.start.dateTime.startsWith(dd(1) + "T09:00"), "back online: the reminder is added to the calendar", JSON.stringify(ev && ev.body));
ok(chats.some(c => /I asked this while offline at/.test(c.q)), "the brain is told when you originally asked (so “tomorrow” stays right)");
ok(await p.evaluate(() => !!localStorage.getItem("max_research_draft")), "the research ran too and waits for your approval");
ok(!/waiting/.test(await label()) && JSON.parse(await p.evaluate(() => localStorage.getItem("max_outbox"))).length === 0, "outbox empty");
ok(/While you were offline/.test(await p.locator("#dispTitle").textContent()) && (await p.evaluate(() => window.__spoken.join(" "))).includes("Back online — I did 2 things"), "Max tells you what he did", await p.evaluate(() => window.__spoken.slice(-3).join(" | ")));
await p.screenshot({ path: process.env.SHOT_DIR + "/offline-done.png" });
ok(errs.filter(e => !/Failed to fetch|ERR_INTERNET_DISCONNECTED|net::/.test(e)).length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
