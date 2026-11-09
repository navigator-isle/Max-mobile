// The update puts Claude's core trading notes and the memories from Mark's chats into the real Max, once.
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
let d = await sync();
const ov = d.notes.find(n => n.title === "00 Trading overview MAX-MASTER-3"), ps = d.notes.find(n => n.title === "PSE strategies best to worst");
ok(ov && ov.category === "Trading" && ov.tags.includes("core") && /MAX-MASTER-3/.test(ov.body) && /40% PSE dividend/.test(ov.body), "trading overview note arrives in Trading (core)", JSON.stringify(ov && { c: ov.category, t: ov.tags }));
ok(ps && ps.category === "Trading › PSE" && /<table>/.test(ps.body) && /8\.4%/.test(ps.body), "PSE strategies note with its ranking table (chosen plan 8.4%/yr)");
ok(d.notes.filter(n => n.category.startsWith("Trading")).length === 24 && d.notes.some(n => n.category === "Trading › Forex › Currencies" && n.title === "PHP peso vs USD 2003-2026"), "all 24 core trading notes, in their folders");
ok(d.notes.some(n => n.title === "SOLAS 1974"), "maritime core notes still there");
const mem = d.memories || [];
ok(mem.filter(m => /^mem-claude-2026-11-/.test(m.id)).length === 24 && mem.some(m => /MAX-MASTER-3/.test(m.text)) && mem.some(m => /Deal Finder rule/.test(m.text)), "24 memories from Mark's chats with Claude are in Max's long-term memory", mem.length);
d = await sync({ memories: [{ id: "mem-claude-2026-11-05", text: "x", deleted: true, updatedAt: Date.now() + 5000 }], notes: [{ ...ov, deleted: true, updatedAt: Date.now() + 5000 }] });
d = await sync();
ok(d.memories.find(m => m.id === "mem-claude-2026-11-05")?.deleted || !d.memories.some(m => m.id === "mem-claude-2026-11-05"), "a memory he deletes stays deleted");
ok(d.notes.find(n => n.title === "00 Trading overview MAX-MASTER-3").deleted, "a trading note he deletes stays deleted");
ok(d.notes.filter(n => n.title === "PSE strategies best to worst").length === 1, "no duplicates after several syncs");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
