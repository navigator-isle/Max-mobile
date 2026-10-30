// Phone: sign in with Google (fake Google), schedule by voice, reminders and to-dos, undo, sign-in replaces passcode.
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
const cal = [], tasks = [], gem = [];
const pad = n => String(n).padStart(2, "0");
const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); })();
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://oauth2.googleapis.com/token")) {
    const p = new URLSearchParams(o.body);
    return new Response(JSON.stringify(p.get("grant_type") === "authorization_code" ? { access_token: "A", expires_in: 3600, refresh_token: "R", id_token: "h." + b64u({ email: "mark@example.com" }) + ".s" } : { access_token: "A2", expires_in: 3600 }));
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
    const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
    const action = /remind me/i.test(q) ? { type: "add_event", details: { title: "Call the agency", start: tomorrow + "T09:00", reminderMinutes: 0 } } :
      /to-?do/i.test(q) ? { type: "add_task", details: { title: "Buy safety shoes", due: "" } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Okay." : "Answer to: " + q, action }) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8041", WK = "http://127.0.0.1:8827";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "sec", MAX_OWNER_EMAIL: "mark@example.com" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  // the fake Google sign-in screen: sends you straight back with a code
  if (req.url.startsWith("/fake-google")) { const q = new URL(req.url, WK).searchParams; res.writeHead(302, { Location: q.get("redirect_uri") + "?code=abc&state=" + encodeURIComponent(q.get("state")) }); return res.end(); }
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, redirect: "manual", body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  const h = Object.fromEntries(r.headers); if (h.location && h.location.startsWith("https://accounts.google.com/")) h.location = WK + "/fake-google" + h.location.slice(h.location.indexOf("?"));
  res.writeHead(r.status, h); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8827);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8041);
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
const answer = () => p.locator("#homeAnswer").textContent();

await say("what's on my schedule today");
ok((await answer()).includes("isn’t connected yet"), "before sign-in: Max explains how to connect Google", await answer());
await p.click("#openConnection"); await p.waitForTimeout(400);
ok(await vis("#googleSignIn") && (await p.locator("#googleStatus").textContent()).includes("Sign in once"), "settings show “Sign in with Google”");
await p.click("#googleSignIn");
await p.waitForURL(u => String(u).startsWith(ORIGIN + "/Max-mobile/"), { timeout: 10000 }); await p.waitForTimeout(1500);
const stored = await p.evaluate(() => localStorage.getItem("max_session"));
ok(stored && stored.length > 30 && !(await p.evaluate(() => location.hash)).includes("max_session"), "after Google: session kept on the phone, address bar cleaned");
ok((await answer()).includes("Signed in with Google ✓") && (await p.locator("#globalStatus").textContent()) === "Connected · memory on", "Max confirms sign-in; memory on", await p.locator("#globalStatus").textContent());
await p.evaluate(() => localStorage.removeItem("max_pass"));
await p.reload(); await p.waitForTimeout(1200);
ok((await p.locator("#globalStatus").textContent()) === "Connected · memory on", "works without the passcode now");

await say("what's on my schedule today");
ok((await answer()).includes("Today you have 1 thing") && (await answer()).includes("Port State inspection") && (await answer()).includes("Renew passport"), "“what’s on my schedule today” reads events and to-dos", await answer());
let g = gem.length; await say("remind me tomorrow at 9 to call the agency");
ok(gem.length === g + 1 && cal.length === 1 && cal[0].start.dateTime === tomorrow + "T09:00:00" && cal[0].reminders.overrides[0].minutes === 0, "“remind me tomorrow at 9…” → calendar event with phone notification", JSON.stringify(cal[0]));
ok((await answer()).includes("“Call the agency” tomorrow at") && (await answer()).includes("notify you at that time") && (await answer()).includes("undo"), "Max says exactly what he added and when", await answer());
g = gem.length; await say("undo");
ok(cal.length === 0 && gem.length === g && (await answer()).includes("Removed"), "“undo” removes it instantly");
await say("add buy safety shoes to my to-do list");
ok(tasks.length === 1 && tasks[0].title === "Buy safety shoes" && (await answer()).includes("Added to your to-do list"), "to-do added to Google Tasks");

// another phone with only the old passcode is refused
const ctx2 = await b.newContext({ ...devices["Pixel 7"] });
await ctx2.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); }, [{ jarvis_api_base_v2: WK, max_pass: "pw" }, mock.toString()]);
const p2 = await ctx2.newPage(); await p2.goto(ORIGIN + "/Max-mobile/"); await p2.waitForTimeout(1200);
ok((await p2.locator("#globalStatus").textContent()) === "Sign in needed", "a phone with only the passcode must sign in with Google", await p2.locator("#globalStatus").textContent());
await ctx2.close();

// sign out on this phone
await p.click("#openConnection"); await p.waitForTimeout(400);
ok(await vis("#googleSignOut") && await vis("#googleDisconnect"), "settings: sign out / disconnect");
await p.screenshot({ path: process.env.SHOT_DIR + "/google-settings.png" });
await p.click("#googleSignOut"); await p.waitForTimeout(800);
ok(!(await p.evaluate(() => localStorage.getItem("max_session"))) && (await p.locator("#globalStatus").textContent()) === "Sign in needed", "sign out works");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
