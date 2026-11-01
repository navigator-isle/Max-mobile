// Phone ↔ laptop: settings and lists sync both ways (newest wins), and the laptop layout.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import { DatabaseSync } from "node:sqlite"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const gem = [];
globalThis.fetch = async (u, o) => { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Answer to: " + q, remember: [] }) }] } }] })); };
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8091";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite) };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request("http://127.0.0.1:8897" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8897);
const sP = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": q.url.includes("sw.js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(q.url.includes("sw.js") ? pagePath.replace(/index\.html$/, "sw.js") : pagePath)); }).listen(8091);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 20); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const base = { jarvis_api_base_v2: "http://127.0.0.1:8897", max_pass: "pw", max_notes_migrated_v1: "1" };
async function device(name, seed, opts) {
  const ctx = await b.newContext(opts);
  await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); }, [{ ...base, ...seed }, mock.toString()]);
  const p = await ctx.newPage(); p.errs = []; p.on("pageerror", e => p.errs.push(e.message));
  await p.goto(ORIGIN + "/"); await p.waitForTimeout(2500); return { ctx, p };
}
const ls = (p, k) => p.evaluate(k => localStorage.getItem(k), k);
const sync = async p => { await p.evaluate(() => window.dispatchEvent(new Event("online"))); await p.waitForTimeout(1500); };
const rows = () => Object.fromEntries(sqlite.prepare("SELECT key, value FROM max_settings").all().map(r => [r.key, r.value]));
const W = JSON.stringify([{ symbol: "SM", kind: "pse", tier: "blue chip" }, { symbol: "BTC", kind: "crypto" }]);
const phone = await device("phone", { max_watchlist: W, max_currencies: JSON.stringify(["PHP", "USD", "JPY"]), max_routine_state: JSON.stringify({ r1: { last: "2026-11-01", streak: 12 } }), max_weather_place: JSON.stringify({ name: "Batangas City", lat: 13.76, lon: 121.06 }), max_handsfree: "true", max_pass: "pw" }, { ...(await import("playwright-core").catch(() => ({ devices: null }))).devices?.["Pixel 7"] || { viewport: { width: 412, height: 915 } } });
let R = rows();
ok(R.max_watchlist === W && /streak":12/.test(R.max_routine_state) && /Batangas/.test(R.max_weather_place), "phone's watchlist, routine streaks and weather place go up to the cloud", Object.keys(R).join(","));
ok(!("max_handsfree" in R) && !("max_pass" in R), "hands-free setting and passcode are NOT synced (each device decides)");
const laptop = await device("laptop", { max_currencies: JSON.stringify(["USD"]) }, { viewport: { width: 1440, height: 900 } });
ok(await ls(laptop.p, "max_watchlist") === W && /streak":12/.test(await ls(laptop.p, "max_routine_state")), "laptop gets the phone's watchlist and routine streaks");
ok(await ls(laptop.p, "max_currencies") === JSON.stringify(["PHP", "USD", "JPY"]), "a brand-new laptop doesn't overwrite the phone's choices with its defaults");
ok(await ls(laptop.p, "max_handsfree") === null, "hands-free stays off on the laptop until you turn it on there");
// change on the laptop → shows up on the phone
await laptop.p.fill("#typeInput", "be witty"); await laptop.p.press("#typeInput", "Enter"); await laptop.p.waitForTimeout(2500);
ok(JSON.parse(rows().max_personality || "null") === "witty", "laptop change goes up within seconds", rows().max_personality);
await sync(phone.p);
ok(JSON.parse(await ls(phone.p, "max_personality")) === "witty", "…and the phone picks it up on its next sync");
// both change different things → both kept
await phone.p.evaluate(() => { const w = JSON.parse(localStorage.getItem("max_watchlist")); w.push({ symbol: "ETH", kind: "crypto" }); localStorage.setItem("max_watchlist", JSON.stringify(w)); });
await laptop.p.evaluate(() => localStorage.setItem("max_weather_place", JSON.stringify({ name: "Longview", lat: 46.1, lon: -122.9 })));
await sync(phone.p); await sync(laptop.p); await sync(phone.p);
ok(/ETH/.test(await ls(laptop.p, "max_watchlist")) && /Longview/.test(await ls(phone.p, "max_weather_place")), "phone adds ETH while laptop changes the weather place → both devices end up with both");
// same thing changed on both → the newer one wins
await phone.p.evaluate(() => localStorage.setItem("max_pp_speed", "11")); await phone.p.waitForTimeout(50);
await laptop.p.evaluate(() => localStorage.setItem("max_pp_speed", "13.5"));
await sync(phone.p); await sync(laptop.p); await sync(phone.p);
ok(await ls(phone.p, "max_pp_speed") === "13.5" && await ls(laptop.p, "max_pp_speed") === "13.5", "same setting changed on both → the latest change wins everywhere");
// server ignores junk keys
const r = await worker.fetch(new Request("http://x/api/sync", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-Max-Pass": "pw" }, body: JSON.stringify({ notes: [], settings: [{ key: "jarvis_api_base_v2", value: "evil", updated: 1 }, { key: "max_x;drop", value: "x", updated: 1 }] }) }), env);
ok(r.ok && !("jarvis_api_base_v2" in rows()) && !Object.keys(rows()).some(k => /drop/.test(k)), "the cloud only accepts Max's own setting names");
// laptop layout
const L = laptop.p;
await L.keyboard.press("Control+k"); await L.fill("#typeInput", "show my projects"); await L.press("#typeInput", "Enter"); await L.waitForTimeout(1500);
const lay = await L.evaluate(() => { const h = document.getElementById("homeScreen").getBoundingClientRect(), pj = document.getElementById("projectsScreen").getBoundingClientRect(); return { hv: getComputedStyle(document.getElementById("homeScreen")).display !== "none", hR: h.right, pL: pj.left, pW: pj.width, orb: document.getElementById("maxOrb").getBoundingClientRect().width, mini: getComputedStyle(document.getElementById("miniMax")).display }; });
ok(lay.hv && lay.hR <= lay.pL + 1 && lay.pW > 800 && lay.orb >= 200 && lay.mini === "none", "laptop: Max stays on the left with his circle, the screen opens on the right", JSON.stringify(lay));
ok(await L.evaluate(() => getComputedStyle(document.getElementById("projList")).display) === "grid", "laptop: projects shown in columns");
await L.keyboard.press("Control+k");
ok(await L.evaluate(() => document.activeElement.id === "typeInput" && document.getElementById("projectsScreen").classList.contains("active")), "Ctrl+K types to Max without leaving the screen");
const P = phone.p;
ok(await P.evaluate(() => getComputedStyle(document.getElementById("homeScreen")).display) !== "none" && await P.evaluate(() => getComputedStyle(document.getElementById("typeRow")).display) === "none", "phone layout unchanged (no laptop typing bar)");
ok(phone.p.errs.length === 0 && laptop.p.errs.length === 0, "no script errors", [...phone.p.errs, ...laptop.p.errs].join(" | "));
await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
