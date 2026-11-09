// Trading notes, layout of 9 Nov 2026: the server loads ~1,100 notes in parts from Mark's own Pages site (fingerprint-checked),
// retires every earlier trading layout (incl. copies he imported from zips) but never his own notes, and syncs only changes.
import { DatabaseSync } from "node:sqlite"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { if (a.length > 100) throw new Error("D1: too many SQL variables"); return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
const SITE = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "site", "_update", "notes");
let tamper = false, fetches = [];
globalThis.fetch = async (u) => { const url = String(u); fetches.push(url);
  const m = url.match(/^https:\/\/max-app-axv\.pages\.dev\/_update\/notes\/([\w.-]+\.json)/);
  if (m && fs.existsSync(path.join(SITE, m[1]))) { let b = fs.readFileSync(path.join(SITE, m[1])); if (tamper && m[1] === "part-03.json") b = Buffer.concat([b, Buffer.from(" ")]); return new Response(b); }
  return new Response("{}", { status: 404 }); };
const { default: w } = await import(process.argv[2]);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const man = JSON.parse(fs.readFileSync(path.join(SITE, "manifest.json")));
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_SEED_NOTES: "on", SYNC_OVERLAP_MS: "0", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const sync = async (body = {}) => (await (await w.fetch(new Request("https://x/api/sync", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ notes: [], memories: [], ...body }) }), env)).json());
const t0 = Date.now() - 864e5;
const before = [{ id: "note-trading-1-start-here", title: "1 Start here", category: "Trading", tags: [], body: "<p>old seeded</p>", createdAt: t0, updatedAt: t0 },
  { id: "imp1", title: "1 Start here", category: "Trading", tags: [], body: "<p>old zip copy</p>", createdAt: t0, updatedAt: t0 },
  { id: "imp2", title: "BDO", category: "Trading › PSE › PSE stocks › Financials", tags: [], body: "<p>old BDO</p>", createdAt: t0, updatedAt: t0 },
  { id: "imp3", title: "LTC", category: "Trading › Crypto › Crypto coins", tags: [], body: "<p>old LTC</p>", createdAt: t0, updatedAt: t0 },
  { id: "imp4", title: "CTS", category: "Trading › PSE › PSE stocks › Small, Medium &amp; Emerging Board", tags: [], body: "<p>x</p>", createdAt: t0, updatedAt: t0 },
  { id: "mine", title: "My own trading idea", category: "Trading", tags: [], body: "<p>mine</p>", createdAt: t0, updatedAt: t0 },
  { id: "mine2", title: "BDO", category: "Personal", tags: [], body: "<p>my BDO account notes</p>", createdAt: t0, updatedAt: t0 }];
let d = await sync({ notes: before });
let live = d.notes.filter(n => !n.deleted);
ok(d.notes.filter(n => n.id.startsWith("tn2-")).length === man.parts.slice(0, 4).reduce((a, p) => a + p.count, 0), "first sync: the first 4 parts of the new notes arrive (a few parts per request, so the server never works too long)", String(d.notes.filter(n => n.id.startsWith("tn2-")).length));
ok(["note-trading-1-start-here", "imp1", "imp2", "imp3", "imp4"].every(id => d.notes.find(n => n.id === id)?.deleted && d.notes.find(n => n.id === id).body === ""), "every earlier trading layout is retired (incl. zip copies), with the body emptied", JSON.stringify(d.notes.filter(n => ["note-trading-1-start-here", "imp1", "imp2", "imp3", "imp4"].includes(n.id)).map(n => [n.id, n.deleted, n.body.slice(0, 20)])));
ok(live.find(n => n.id === "mine") && live.find(n => n.id === "mine2"), "his own notes are untouched (even one titled BDO elsewhere)");
for (let k = 0; k < 6; k++) d = await sync();
const all = d.notes, L = all.filter(n => !n.deleted), T = (c, t) => L.find(n => n.category === c && n.title === t);
ok(L.filter(n => n.id.startsWith("tn2-")).length === man.count, `all ${man.count} new notes are in after a few syncs`, String(L.filter(n => n.id.startsWith("tn2-")).length));
const cats = new Set(L.filter(n => n.id.startsWith("tn2-")).map(n => n.category));
ok(["Trading", "Trading › PSE › Strategy", "Trading › PSE › Stocks", "Trading › PSE › Dividend", "Trading › Crypto › Strategy", "Trading › Crypto › Coins", "Trading › Forex › Strategy", "Trading › Forex › Currency",
  "Trading › Copy trading › Strategy", "Trading › Copy trading › Platform", "Trading › Copy trading › Traders"].every(c => cats.has(c)) && cats.size === 11, "exactly the folders Mark asked for", [...cats].join(" | "));
ok(T("Trading › PSE › Stocks", "BDO") && T("Trading › PSE › Dividend", "BDO dividends") && /58 payments/.test(T("Trading › PSE › Dividend", "BDO dividends").body), "PSE › Stocks › BDO and PSE › Dividend › BDO dividends (58 payments)");
ok(/₱0\.1351/.test(T("Trading › PSE › Dividend", "EMI dividends")?.body || "") && !/₱51 /.test(T("Trading › PSE › Dividend", "EMI dividends")?.body || ""), "EMI Jan 2026 dividend is ₱0.1351 (the ₱51 misreading is fixed)");
ok(T("Trading › Crypto › Coins", "LTC") && /2025: \$76\.85/.test(T("Trading › Crypto › Coins", "LTC").body), "Crypto › Coins › LTC with every year");
ok(T("Trading › Copy trading › Platform", "eToro CopyTrader") && /\$200/.test(T("Trading › Copy trading › Platform", "eToro CopyTrader").body), "Copy trading › Platform › eToro (minimum $200…)");
ok(L.filter(n => n.category === "Trading › Copy trading › Traders").length >= 50, "Copy trading › Traders: table + one note per notable trader");
ok(d.memories.find(m => m.id === "mem-claude-2026-11-18" && /no zip import needed/.test(m.text)) && d.memories.find(m => m.id === "mem-claude-2026-11-25"), "Max's memory knows the new layout and the past-price lookup");
// an old copy uploaded later (phone imported a zip late) is retired at once
d = await sync({ notes: [{ id: "late", title: "ETH", category: "Trading › Crypto › Crypto coins", tags: [], body: "<p>late</p>", createdAt: Date.now(), updatedAt: Date.now() }] });
ok(d.notes.find(n => n.id === "late")?.deleted, "an old-layout copy the phone uploads later is retired right away");
// delta sync: only what changed since the last sync comes back
const since = d.serverTime; await new Promise(r => setTimeout(r, 5));
d = await sync({ since, notes: [{ id: "new1", title: "Tanker vetting", category: "Maritime", tags: [], body: "<p>SIRE 2.0</p>", createdAt: Date.now(), updatedAt: Date.now() }] });
ok(d.full === false && d.notes.length < 50 && d.notes.some(n => n.id === "new1"), "delta sync returns only recent changes (not 1,100 notes)", d.notes.length + " notes");
d = await sync(); ok(d.full === true && d.notes.length > 1100, "a sync without “since” is a full sync");
// the brain's note search finds the right stock note among 1,100
const rel = await w.__test?.relevantNotes?.(env.MAX_MEMORY, "BDO dividends 2025");
if (rel) ok(rel[0]?.title === "BDO dividends", "note search ranks the matching title first", rel.map(n => n.title).join(", "));
// fingerprint: a changed part is refused
const db = env.MAX_MEMORY; await db.prepare("DELETE FROM max_notes WHERE id LIKE 'tn2-%'").run(); await db.prepare("DELETE FROM max_settings WHERE key = 'max_srv_tn2'").run(); tamper = true;
for (let k = 0; k < 3; k++) await sync();
const n2 = (await db.prepare("SELECT COUNT(*) c FROM max_notes WHERE id LIKE 'tn2-%'").first()).c;
ok(n2 === man.parts.slice(0, 2).reduce((a, p) => a + p.count, 0), "a part whose fingerprint doesn't match is not loaded (loading stops there)", String(n2));
tamper = false; for (let k = 0; k < 5; k++) await sync();
const h = await (await w.fetch(new Request("https://x/health"), env)).json();
ok(/^done:layout 9 Nov 2026$/.test(h.tradingNotes), "health page shows the trading notes are loaded", h.tradingNotes);
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
