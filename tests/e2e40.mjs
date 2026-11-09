// Phone: the 1,100 trading notes (layout of 9 Nov 2026) reach the phone, move to the phone's large storage by themselves,
// old trading notes disappear, his own notes stay, later syncs send only changes, and the Notes screen still works.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { DatabaseSync } from "node:sqlite"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { if (a.length > 100) throw new Error("D1: too many SQL variables"); return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
const NOTES = path.join(path.dirname(pagePath), "site", "_update", "notes");
globalThis.fetch = async (u) => { const url = String(u); const m = url.match(/^https:\/\/max-app-axv\.pages\.dev\/_update\/notes\/([\w.-]+\.json)/);
  if (m && fs.existsSync(path.join(NOTES, m[1]))) return new Response(fs.readFileSync(path.join(NOTES, m[1])));
  if (url.includes("generativelanguage")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"reply":"ok","action":null}' }] } }] }));
  return new Response("{}", { status: 404 }); };
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8073", WK = "http://127.0.0.1:8872", syncs = [];
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_SEED_NOTES: "on", SYNC_OVERLAP_MS: "0", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x); const body = Buffer.concat(c);
  if (req.url.startsWith("/api/sync")) { try { const j = JSON.parse(body.toString()); syncs.push({ up: j.notes.length, since: j.since, bytes: body.length }); } catch {} }
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : body }), env);
  const out = Buffer.from(await r.arrayBuffer()); if (req.url.startsWith("/api/sync") && syncs.length) syncs.at(-1).down = out.length;
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(out); }).listen(8872);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8073);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const t0 = Date.now() - 864e5;
const mine = [{ id: "mine1", title: "SOLAS chapter II-2 notes", category: "Maritime", tags: [], body: "<p>fire safety</p>", createdAt: t0, updatedAt: t0 },
  { id: "zipold", title: "BDO", category: "Trading › PSE › PSE stocks › Financials", tags: [], body: "<p>" + "old ".repeat(400) + "</p>", createdAt: t0, updatedAt: t0 }];
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }
  window.speechSynthesis && Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { u.onend && u.onend(); }, cancel() {}, getVoices() { return []; } } }); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", max_notes_v3: JSON.stringify(mine) }]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(2500);
for (let k = 0; k < 6; k++) { await p.evaluate(() => window.maxSyncNow()); await p.waitForTimeout(300); }
const st = await p.evaluate(async () => { await window.maxNotesReady(); const db = await new Promise(r => { const q = indexedDB.open("max_notes_db", 1); q.onsuccess = () => r(q.result); });
  const raw = await new Promise(r => { const q = db.transaction("kv").objectStore("kv").get("notes"); q.onsuccess = () => r(q.result || "[]"); });
  const a = JSON.parse(raw); return { n: a.filter(x => !x.deleted).length, tn2: a.filter(x => !x.deleted && String(x.id).startsWith("tn2-")).length, flag: localStorage.getItem("max_notes_in_idb"), ls: localStorage.getItem("max_notes_v3"),
    mine: !!a.find(x => x.id === "mine1" && !x.deleted), zip: a.find(x => x.id === "zipold"), chars: raw.length }; });
ok(st.tn2 === 1102, "all 1,102 new trading notes are on the phone", String(st.tn2));
ok(st.flag === "1" && st.ls === null && st.chars > 2e6, "too big for quick storage → moved to the phone's large storage by itself (" + Math.round(st.chars / 1e6 * 10) / 10 + "M characters)", JSON.stringify({ flag: st.flag, ls: st.ls && st.ls.length }));
ok(st.mine, "his own notes are still there"); ok(st.zip && st.zip.deleted && st.zip.body === "", "the old zip-imported trading note is gone (marked deleted, body emptied)");
const first = syncs[0], later = syncs.at(-1);
ok(first.since === 0 && later.since > 0 && later.up < 5 && later.bytes < 30000 && later.down < 60000, "after the first full sync, syncs send and receive only changes", JSON.stringify(later));
// survives a reload (comes back from the large storage)
await p.reload(); await p.waitForTimeout(2500);
const after = await p.evaluate(async () => { await window.maxNotesReady(); return true; });
const n2 = await p.evaluate(async () => { const db = await new Promise(r => { const q = indexedDB.open("max_notes_db", 1); q.onsuccess = () => r(q.result); });
  const raw = await new Promise(r => { const q = db.transaction("kv").objectStore("kv").get("notes"); q.onsuccess = () => r(q.result); }); return JSON.parse(raw).filter(x => !x.deleted).length; });
ok(after && n2 >= 1103, "after reopening the app, every note is still there", String(n2));
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
