// Phone: Gmail by voice — check inbox, read, reply, change the draft, send only after “yes, send it”, discard, briefing.
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
const cal = [], tasks = [], gem = [], gmail = [];
const pad = n => String(n).padStart(2, "0");
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); })();
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    const p = new URLSearchParams(o.body);
    return new Response(JSON.stringify(p.get("grant_type") === "authorization_code" ? { access_token: "A", expires_in: 3600, refresh_token: "R", scope: "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose", id_token: "h." + b64u({ email: "mark@example.com" }) + ".s" } : { access_token: "A2", expires_in: 3600 }));
  }
  if (url.startsWith("https://gmail.googleapis.com")) { gmail.push({ url, method: o.method || "GET", body: o.body ? JSON.parse(o.body) : null });
    const raw = s => Buffer.from(s).toString("base64url");
    const M = id => ({ id, threadId: "th" + id, labelIds: ["INBOX", "UNREAD", id === "m1aaaaaa" ? "IMPORTANT" : "CATEGORY_PROMOTIONS"], snippet: id === "m1aaaaaa" ? "Please confirm your joining date" : "50% off shoes",
      payload: { headers: [{ name: "From", value: id === "m1aaaaaa" ? "Crewing Dept <crewing@agency.ph>" : id === "m3aaaaaa" ? "Captain Reyes <reyes@ship.com>" : "Shop <deals@shop.com>" }, { name: "Subject", value: id === "m1aaaaaa" ? "Joining instructions" : "Big sale" }, { name: "Date", value: "Fri, 30 Oct 2026 08:00:00 +0800" }, { name: "Message-ID", value: "<" + id + "@x>" }],
        mimeType: "text/plain", body: { data: raw(id === "m1aaaaaa" ? "Dear Mark, your joining date is 15 November 2026. Please confirm." : "Sale!") } } });
    if (/\/messages\?/.test(url)) return new Response(JSON.stringify({ messages: /Reyes|reyes/.test(decodeURIComponent(url)) ? [{ id: "m3aaaaaa" }] : [{ id: "m1aaaaaa" }, { id: "m2aaaaaa" }] }));
    const mm = url.match(/\/messages\/(m\daaaaaa)\?/); if (mm) return new Response(JSON.stringify(M(mm[1])));
    if (/\/drafts$/.test(url) && o.method === "POST") return new Response(JSON.stringify({ id: "r-draft" + gmail.length + "xyz" }));
    if (/\/drafts\/[\w-]+$/.test(url) && o.method === "PUT") return new Response(JSON.stringify({ id: url.split("/").pop() }));
    if (/\/drafts\/send$/.test(url)) return new Response(JSON.stringify({ id: "sent" }));
    if (/\/drafts\/[\w-]+$/.test(url) && o.method === "DELETE") return new Response(null, { status: 204 });
  }
  if (url.includes("googleapis.com/calendar")) {
    if (o.method === "POST") { const e = JSON.parse(o.body); const made = { id: "ev" + (cal.length + 10000), ...e }; cal.push(made); return new Response(JSON.stringify(made)); }
    if (o.method === "DELETE") { const id = url.split("/").pop(); const i = cal.findIndex(e => e.id === id); if (i >= 0) cal.splice(i, 1); return new Response(null, { status: 204 }); }
    const now = new Date(); const at9 = new Date(now); at9.setHours(9, 0, 0, 0);
    return new Response(JSON.stringify({ items: [{ id: "e1", summary: "Port State inspection", start: { dateTime: at9.toISOString() }, end: { dateTime: at9.toISOString() } }] }));
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
    else out = { reply: "Answer to: " + b.contents.at(-1).parts[0].text, action: null };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8057", WK = "http://127.0.0.1:8843";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", MAX_OWNER_EMAIL: "mark@example.com" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  // the fake Google sign-in screen: sends you straight back with a code
  if (req.url.startsWith("/fake-google")) { const q = new URL(req.url, WK).searchParams; res.writeHead(302, { Location: q.get("redirect_uri") + "?code=abc&state=" + encodeURIComponent(q.get("state")) }); return res.end(); }
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, redirect: "manual", body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  const h = Object.fromEntries(r.headers); if (h.location && h.location.startsWith("https://accounts.google.com/")) h.location = WK + "/fake-google" + h.location.slice(h.location.indexOf("?"));
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8843);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8057);
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
const sent = () => gmail.filter(x => /drafts\/send$/.test(x.url)).length;

await say("any important emails?");
let a = await answer();
ok(await vis("#displayScreen") && /Important: Crewing Dept/.test(a) && /read number 1/.test(a), "“any important emails?” → summary, important first", a);
ok((await p.locator(".disp-card").first().textContent()).includes("IMPORTANT · 1"), "inbox on screen, important at the top");
await p.screenshot({ path: process.env.SHOT_DIR + "/inbox.png" });
await say("read number 1");
a = await answer();
ok(/Crewing Dept wants you to confirm your joining date/.test(a) && /Joining date: 15 November 2026/.test(a) && /Say “reply …”/.test(a), "“read number 1” → what they want + the deadline", a);
await say("reply that I confirm the joining date");
a = await answer();
ok(/^Here’s the draft to Crewing Dept/.test(a) && /Say “yes, send it”/.test(a) && sent() === 0, "reply → draft read back, nothing sent", a);
const d1 = gmail.find(x => /\/drafts$/.test(x.url) && x.method === "POST");
ok(d1.body.message.threadId === "thm1aaaaaa", "reply stays in the same email thread");
await p.screenshot({ path: process.env.SHOT_DIR + "/draft.png" });
await say("make it shorter");
ok(gmail.some(x => x.method === "PUT") && /Confirmed for 15 November/.test(await answer()) && sent() === 0, "“make it shorter” → draft changed, still not sent", await answer());
await say("send");
ok(sent() === 1 && /^Sent to Crewing Dept/.test(await answer()), "“send” → sent", await answer());
await say("send it");
ok(sent() === 1, "saying it twice doesn't send twice");
await p.click("#miniHome");

await say("email captain reyes that I'll be there at 0800");
a = await answer();
ok(/draft to Captain Reyes/.test(a) && sent() === 1, "new email to a person by name → draft", a);
await say("don't send it");
ok(/won’t send it/.test(await answer()) && gmail.some(x => x.method === "DELETE") && sent() === 1, "“don't send it” → draft deleted, nothing sent");
await say("brief me");
ok(/Email: 2 new emails/.test(await answer()) && (await p.locator("#dispBody").textContent()).includes("Unread email"), "briefing includes new email", await answer());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
