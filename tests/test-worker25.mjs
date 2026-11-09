// The update puts Claude's organized trading notes and the memories from Mark's chats into the real Max, once,
// and retires the first unorganized trading notes (incl. copies he imported from the zip) — stock and coin notes stay.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
globalThis.fetch = async () => new Response("{}", { status: 404 });
const { default: w } = await import(process.argv[2]);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_SEED_NOTES: "on", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const sync = async (body = {}) => (await (await w.fetch(new Request("https://x/api/sync", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ notes: [], memories: [], ...body }) }), env)).json());
const t0 = Date.now() - 864e5;
// what he had before: old seeded overview, an old note imported from zip 1, and a stock note from zip 2
const before = [{ id: "note-trading-00-trading-overview-max-master-3", title: "00 Trading overview MAX-MASTER-3", category: "Trading", tags: [], body: "<p>old</p>", createdAt: t0, updatedAt: t0 },
  { id: "imp1", title: "PSE strategies best to worst", category: "Trading › PSE", tags: [], body: "<p>old table</p>", createdAt: t0, updatedAt: t0 },
  { id: "imp2", title: "EUR vs USD 2000-2026", category: "Trading › Forex › Currencies", tags: [], body: "<p>old</p>", createdAt: t0, updatedAt: t0 },
  { id: "stk", title: "BDO", category: "Trading › PSE › PSE stocks › Financials", tags: [], body: "<p>BDO data</p>", createdAt: t0, updatedAt: t0 },
  { id: "mine", title: "My own trading idea", category: "Trading", tags: [], body: "<p>mine</p>", createdAt: t0, updatedAt: t0 }];
let d = await sync({ notes: before });
const live = d.notes.filter(n => !n.deleted), T = t => live.find(n => n.title === t);
ok(T("1 Start here") && T("1 Start here").category === "Trading" && /How the notes are arranged/.test(T("1 Start here").body), "new “1 Start here” note in Trading");
ok(T("2 My plan MAX-MASTER-3") && T("1 PSE plan").category === "Trading › PSE" && T("1 Crypto plan").category === "Trading › Crypto" && T("1 Forex and gold plan").category === "Trading › Forex and Gold" && T("1 Copy trading verdict").category === "Trading › Copy trading", "each market folder starts with its plan");
const rk = T("2 PSE strategies ranked");
ok(rk && /<table>/.test(rk.body) && /✅ chosen/.test(rk.body) && !/\bDJ\b|\bP2\b|J3/.test(rk.body), "PSE ranking: one clean table, plain names (no test codes), verdict signs");
ok(T("Market events by year 2003-2026")?.category === "Trading › Reference" && T("Fees 2026") && T("4 Words used"), "Reference folder (events by year, fees) and Words used");
ok(live.filter(n => n.category.startsWith("Trading") && !/PSE stocks|Crypto coins/.test(n.category) && n.title !== "My own trading idea").length === 33, "33 organized notes", live.filter(n => n.category.startsWith("Trading")).map(n => n.title).join(" | "));
ok(!T("00 Trading overview MAX-MASTER-3") && !T("PSE strategies best to worst") && !T("EUR vs USD 2000-2026"), "the old unorganized notes (and zip-imported copies) are removed");
ok(T("BDO") && T("My own trading idea"), "stock notes and his own notes are untouched");
d = await sync({ notes: [{ id: "imp3", title: "Crypto strategies best to worst", category: "Trading › Crypto", tags: [], body: "<p>late copy</p>", createdAt: Date.now(), updatedAt: Date.now() }] });
ok(d.notes.find(n => n.id === "imp3")?.deleted, "an old copy the phone uploads later is removed too");
const mem = d.memories || [];
ok(mem.filter(m => /^mem-claude-2026-11-/.test(m.id) && !m.deleted).length === 24, "24 memories from Mark's chats are in long-term memory");
d = await sync({ notes: [{ ...T("2 My plan MAX-MASTER-3"), deleted: true, updatedAt: Date.now() + 5000 }] }); d = await sync();
ok(d.notes.find(n => n.title === "2 My plan MAX-MASTER-3").deleted, "a note he deletes stays deleted");
ok(d.notes.filter(n => n.title === "2 PSE strategies ranked").length === 1, "no duplicates after several syncs");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
