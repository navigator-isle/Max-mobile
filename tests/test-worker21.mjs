// Notes Claude prepared go into Max's database once (only in the real deployment), and reach the phone through sync.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
globalThis.fetch = async () => new Response("{}", { status: 404 });
let { default: w } = await import(process.argv[2]);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const sync = async (env, notes = []) => { const r = await w.fetch(new Request("https://x/api/sync", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ notes, memories: [] }) }), env); return r.json(); };
let env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
let d = await sync(env);
ok(!(d.notes || []).some(n => n.id === "note-solas-1974"), "tests and copies of Max don't get the note");
w = (await import(process.argv[2] + "?fresh=1")).default; // a fresh Max with its own database
env = { ...env, MAX_SEED_NOTES: "on", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
d = await sync(env);
const n = (d.notes || []).find(n => n.id === "note-solas-1974");
ok(n && n.title === "SOLAS 1974" && n.category === "Maritime › IMO › Conventions" && n.tags.includes("solas") && n.tags.includes("core") && /MSC\.572\(110\)/.test(n.body) && /Ch XV — Safety Measures/.test(n.body), "the real Max gets the detailed SOLAS note in Maritime › IMO › Conventions on the next sync", JSON.stringify(n && { t: n.title, c: n.category }));
const want = { "note-marpol-7378": [/Annex VI — Prevention of Air Pollution/, /MEPC\.400\(83\)/, /Reg 15 Discharge from machinery spaces/], "note-stcw-1978": [/Ch VIII — Watchkeeping/, /MSC\.560\(108\)/, /II\/2 Master &amp; Chief Mate/], "note-mlc-2006": [/Title 5 — Compliance/, /23 Dec 2024/, /Reg 2\.3 Hours of work/] };
for (const [id, res] of Object.entries(want)) { const x = d.notes.find(m => m.id === id); ok(x && x.category === "Maritime › IMO › Conventions" && x.tags.includes("core") && res.every(r => r.test(x.body)), "core note " + id + " arrives with its regulation details", JSON.stringify(x && { t: x.title, tags: x.tags })); }
ok(!d.notes.some(x => "v" in x), "the seed version number stays out of the note itself");
d = await sync(env, [{ ...n, deleted: true, updatedAt: Date.now() + 1000 }]);
d = await sync(env);
ok(d.notes.find(x => x.id === "note-solas-1974").deleted, "added only once: if he deletes it, it stays deleted");
// A Max that already had the short SOLAS note (first version) gets the detailed one in its place.
w = (await import(process.argv[2] + "?fresh=2")).default;
const db3 = new D1(new DatabaseSync(":memory:"));
env = { ...env, MAX_MEMORY: db3 };
await sync({ ...env, MAX_SEED_NOTES: "off" }, [{ id: "note-solas-1974", title: "SOLAS 1974", category: "Maritime › IMO › Conventions", tags: ["solas"], body: "<p>short version</p>", createdAt: Date.now() - 864e5, updatedAt: Date.now() - 864e5 }]);
await db3.prepare("INSERT OR REPLACE INTO max_settings (key, value, updated_at) VALUES (?, ?, ?)").bind("max_srv_seed_note_solas_1974", "1", Date.now()).run().catch(e => console.log("settings insert:", e.message));
d = await sync(env);
const s2 = d.notes.find(x => x.id === "note-solas-1974");
ok(s2 && !s2.deleted && /Ch XV — Safety Measures/.test(s2.body) && s2.tags.includes("core"), "the detailed SOLAS note replaces the short first version", s2 && s2.body.slice(0, 80));
ok(d.notes.filter(x => x.id === "note-solas-1974").length === 1, "only one SOLAS note, no duplicate");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
