// Phone: 🛡 Guard (is everything OK, check now, back up now) and restoring notes from a backup file.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
let siteDown = true;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url === "https://navigator-isle.github.io/") return siteDown ? new Response("x", { status: 503 }) : new Response("ok");
  if (/^https:\/\/(navigator-isle\.github\.io\/Max-mobile|draft-calculator\.github\.io)/.test(url)) return new Response("ok");
  if (url.startsWith("https://hobbyisle.com") || url.startsWith("http://hobbyisle.com")) return new Response("<html><head><title>Hobby Isle</title></head><body><h1>x</h1></body></html>", { headers: { "content-type": "text/html" } });
  if (url.includes("generativelanguage") && url.includes("embed")) return new Response(JSON.stringify({ embeddings: [{ values: Array(256).fill(0.1) }] }));
  if (url.includes("generativelanguage")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "ok", action: null }) }] } }] }));
  if (url.includes("raw.githubusercontent.com") && url.includes("summary")) return new Response(JSON.stringify({ updated: new Date().toISOString(), markets: {} }));
  if (url.includes("raw.githubusercontent.com")) return new Response("[]");
  return new Response("{}", { status: 404 });
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8065", WK = "http://127.0.0.1:8851";
const sqlite = new DatabaseSync(":memory:");
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite) };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8851);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8065);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 30); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const mine = JSON.stringify([{ id: "keep", title: "Newer on phone", body: "phone version", category: "Ship", tags: [], createdAt: 1, updatedAt: 9e12 }]);
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", max_notes_v3: mine }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(100); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(250); await p.evaluate(() => document.getElementById("homeStop").click()); };
const spoken = () => p.evaluate(() => window.__spoken.at(-1) || "");
const disp = () => p.evaluate(() => document.getElementById("dispBody").innerText);

await say("is everything OK?");
ok(/No Guard check has run yet/.test(await spoken()), "before any check, Max says so honestly", await spoken());
await say("check everything now");
let d = await disp();
ok(/Passage Planner is DOWN/.test(await spoken()) && /⚠ Passage Planner is DOWN \(answered 503\)/.test(d), "“check everything now” runs the Guard and says what's wrong", await spoken());
ok(/Hobby Isle — up/.test(d) && /security & SEO \d+\/100/.test(d) && /Max himself/i.test(d) && /Gemini key working/.test(d), "the report shows each site, the score and Max's own health", d.slice(0, 500));
await say("back up my notes");
ok(/didn’t go through/.test(await spoken()) && /Gmail isn’t connected|Gmail isn't connected/.test(await spoken() + await disp()), "without Gmail the backup honestly says it didn't go through (and why)", await spoken());
siteDown = false;
await say("run a system check");
ok(!/Passage Planner is DOWN/.test(await spoken() + await disp()) && /Hobby Isle: The plain http/.test(await disp()), "once fixed, the site drops off the list (real security issues still show)", await spoken());
await say("show my departments");
ok(/🛡 Security/.test(await p.evaluate(() => document.getElementById("crewBody").innerText)), "the Guard has its own card on the departments screen");
// restore from a backup file
const f = path.join(os.tmpdir(), "max-backup-2026-11-08.json");
fs.writeFileSync(f, JSON.stringify({ kind: "Max backup", exportedAt: "2026-11-08T22:45:00Z", notes: [{ id: "n1", title: "Ballast log", category: "Ship", tags: [], body: "BWM D-2", createdAt: 1, updatedAt: 2 }, { id: "keep", title: "Older in backup", body: "old", category: "Ship", tags: [], createdAt: 1, updatedAt: 3 }],
  memories: [{ id: "m1", text: "Mark sails on MV Pacific Star", createdAt: 1, updatedAt: 2, deleted: false }], settings: [{ key: "max_personality", value: "\"witty\"", updated_at: 5 }] }));
await p.evaluate(() => { document.getElementById("vaultMore").hidden = false; });
await p.setInputFiles("#backupInput", f); await p.waitForTimeout(1500);
const notes = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")));
ok(notes.some(n => n.title === "Ballast log") && notes.find(n => n.id === "keep").title === "Newer on phone", "restore adds the missing notes and never overwrites a newer one", JSON.stringify(notes.map(n => n.title)));
ok(/Restored the backup from 2026-11-08: 1 notes added, 0 updated/.test(await spoken()), "Max says what was restored", await spoken());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
