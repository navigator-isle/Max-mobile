// Paper trading: Max's trading screen, voice commands, briefing card, and the hourly email of new updates.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import { DatabaseSync } from "node:sqlite"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const gem = [], sent = [];
const SUMMARY = JSON.parse(fs.readFileSync(new URL("./fixtures/trader-summary.json", import.meta.url)));
let EVENTS = JSON.parse(fs.readFileSync(new URL("./fixtures/trader-events.json", import.meta.url)));
const now = Date.now(); EVENTS = EVENTS.map((e, i) => ({ ...e, at: new Date(now - (EVENTS.length - i) * 60e3).toISOString() }));
let traderUp = true;
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/")) { if (!traderUp) return new Response("nope", { status: 500 }); return new Response(JSON.stringify(url.includes("summary.json") ? SUMMARY : EVENTS)); }
  if (url.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "at", expires_in: 3600 }));
  if (url.includes("gmail/v1/users/me/messages/send")) { sent.push(JSON.parse(o.body)); return new Response(JSON.stringify({ id: "m1" })); }
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Answer to: " + q, action: null }) }] } }] })); }
  return new Response("{}", { status: 404 }); };
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8093";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), MAX_OWNER_EMAIL: "owner@example.com", GOOGLE_CLIENT_ID: "c", GOOGLE_CLIENT_SECRET: "s", MAX_SEAL_KEY: "x" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
// ---- the trade emails (Max's own paper trading, 10 Nov 2026): every new BUY/SELL is emailed once, to the owner only ----
const run = async () => { const ps = []; const lg = console.log; const seen = []; console.log = (...a) => seen.push(a.join(" ")); await worker.scheduled({ cron: "45 * * * *", scheduledTime: Date.parse("2026-11-04T13:45:00Z") }, env, { waitUntil: x => ps.push(x) }); await Promise.all(ps); console.log = lg; if (process.env.DEBUG) lg(seen.join("\n")); };
sqlite.exec("CREATE TABLE IF NOT EXISTS max_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)");
const bk = (k, php, ccy) => ({key: k, start: ccy === "PHP" ? php : php / 60, startPhp: php, cash: ccy === "PHP" ? php : php / 60, positions: [], pending: [], trades: [], hist: [], qty: 0});
const PS = {v: 2, opened: "2026-11-04", usdphp: 60, fxSet: true, jid: 1, emailed: 0, step: {}, errors: [], bench: {}, books: {pse_dividend: bk("pse_dividend", 40000, "PHP"), crypto_swing: bk("crypto_swing", 21000, "USDT"), btc_trend: bk("btc_trend", 9000, "USDT"), gold_trend: bk("gold_trend", 30000, "USDT")},
  journal: [{id: 1, at: Date.now(), kind: "BUY", book: "crypto_swing", sym: "SOL", d: "2026-11-04", text: "BUY 1.5 SOL @ $200 = $300.00", why: "breakout above the 20-day high", copy: "On Binance or Coins.ph, buy about ₱18,000 of SOL now.", outcome: "If the stop is hit: about −₱105."}]};
sqlite.prepare("INSERT OR REPLACE INTO max_settings VALUES ('max_paper', ?, 1)").run(JSON.stringify(PS));
await run();
ok(sent.length === 0, "no email while Google isn't connected (nothing crashes)");
// pretend Google is linked: seal a refresh token the way the worker does
const b64u = bytes => Buffer.from(bytes).toString("base64url");
const key = await crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", new TextEncoder().encode("max-refresh:" + env.GOOGLE_CLIENT_SECRET)), "AES-GCM", false, ["encrypt"]);
const iv = crypto.getRandomValues(new Uint8Array(12));
const sealed = b64u(iv) + "." + b64u(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode("rt")));
sqlite.prepare("INSERT INTO max_google VALUES ('owner','owner@example.com',?, 'gmail.compose', 1)").run(sealed);
await run();
const dec = m => { const r = Buffer.from(m.raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"); const [h, b] = r.split("\r\n\r\n"); return h + "\n" + Buffer.from(b.replace(/\r\n/g, ""), "base64").toString("utf8"); };
const raw = sent[0] ? dec(sent[0]) : "";
ok(sealed && sent.length === 1 && /^To: owner@example.com/m.test(raw) && /pretend money only/.test(raw) && /BUY 1\.5 SOL/.test(raw) && /To copy: On Binance/.test(raw) && /Possible outcome:/.test(raw) && /TOTAL: ₱/.test(raw), "a new trade is emailed once — to the owner only, pretend money, with how to copy, possible outcome and the ₱ total", raw.slice(0, 300));
await run(); ok(sent.length === 1, "nothing new → no second email");
const S2 = JSON.parse(sqlite.prepare("SELECT value FROM max_settings WHERE key = 'max_paper'").get().value);
S2.jid += 1; S2.journal.push({id: S2.jid, at: Date.now(), kind: "SELL", book: "crypto_swing", sym: "SOL", d: "2026-11-04", text: "SELL 1.5 SOL @ $220", pnlPhp: 1800});
sqlite.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").run(JSON.stringify(S2));
await run();
const raw2 = sent[1] ? dec(sent[1]) : "";
ok(sent.length === 2 && /SELL 1\.5 SOL/.test(raw2) && !/BUY 1\.5 SOL/.test(raw2), "only the new trade goes out in the next email");
// ---- the app (signed in with the passcode; Google sign-in is tested elsewhere) ----
const envApp = { ...env, GOOGLE_CLIENT_ID: undefined };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request("http://127.0.0.1:8899" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), envApp);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8899);
const sP = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": q.url.includes("sw.js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(q.url.includes("sw.js") ? pagePath.replace(/index\.html$/, "sw.js") : pagePath)); }).listen(8093);
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 20); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); }, [{ jarvis_api_base_v2: "http://127.0.0.1:8899", max_pass: "pw", max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1500);
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t); await p.waitForTimeout(150); await p.click((await p.locator("#maxOrb").isVisible()) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await p.locator("#homeAnswer").isVisible()) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();
let g = gem.length;
await say("how's my paper trading");
const a = await answer();
ok(gem.length === g && /^Paper trading: your ₱250,000 is now/.test(a) && await p.locator("#dashFull").isVisible(), "“how's my paper trading” → instant summary and the full paper-trading view (old GitHub trader retired)", a);
await p.click("#dashFullClose");
await say("show my crypto paper trading");
ok(/^Paper trading:/.test(await answer()), "asking for one market also opens the view", await answer());
await p.click("#dashFullClose");
await say("turn off trading emails");
ok(/Trading emails are off/.test(await answer()), "“turn off trading emails”");
EVENTS.push({ id: EVENTS.at(-1).id + 1, at: new Date().toISOString(), day: "2026-11-03", market: "pse", type: "fill", text: "Bought 1,000 TEST at 10.02." });
{ const S3 = JSON.parse(sqlite.prepare("SELECT value FROM max_settings WHERE key = 'max_paper'").get().value); S3.jid += 1; S3.journal.push({id: S3.jid, at: Date.now(), kind: "BUY", book: "btc_trend", sym: "BTC", d: "2026-11-04", text: "BUY BTC"}); sqlite.prepare("UPDATE max_settings SET value = ? WHERE key = 'max_paper'").run(JSON.stringify(S3)); }
await run(); ok(sent.length === 2, "…and then no emails are sent");
await say("turn on trading emails"); ok(/Trading emails are on/.test(await answer()), "and back on");
await say("brief me");
ok(/PAPER TRADING/.test(await p.locator("#dispBody").textContent()), "paper trading is in the morning briefing");
await say("show my paper trading");
ok(/^Paper trading:/.test(await answer()), "“show my paper trading” → the live panel", await answer());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
