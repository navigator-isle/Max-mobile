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
const fresh = async k => (await import(process.argv[2] + "?imo=" + k)).default;
// 1. A fresh Max gets all IMO conventions and codes, in the right folders, with one activity line.
w = await fresh(1);
let env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_SEED_NOTES: "on", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
let d = await sync(env);
const imo = (d.notes || []).filter(n => String(n.id).startsWith("note-imo-"));
ok(imo.length === 47, "47 IMO notes arrive (21 conventions, 25 codes, 1 index)", imo.length);
ok(imo.filter(n => n.category === "Maritime › IMO › Codes").length === 25 && imo.filter(n => n.category === "Maritime › IMO › Conventions").length === 21 && imo.some(n => n.title === "IMO Index" && n.category === "Maritime › IMO"), "notes sit in Maritime › IMO › Codes / Conventions, index in Maritime › IMO");
const esp = imo.find(n => n.title === "ESP Code"), imdg = imo.find(n => n.title === "IMDG Code"), tdc = imo.find(n => n.title === "TDC Code");
ok(esp && /MSC\.584\(111\)/.test(esp.body) && /1 Jan 2028/.test(esp.body), "ESP note has the MSC 111 remote inspection amendment");
ok(imdg && /43-26 \(adopted MSC 111/.test(imdg.body) && tdc && tdc.tags.includes("imo"), "IMDG 43-26 and the TDC Code are there");
ok(imo.every(n => !/\*\*|\[\[|^---/.test(n.body) && /<p><b>/.test(n.body)), "markdown turned into Max's note format (no ** or [[ ]] left)");
ok(/<ul><li>[^<]*<ul><li>/.test(imo.find(n => n.title === "Grain Code").body), "sub-bullets stay nested");
ok(d.notes.some(n => n.id === "note-solas-1974") && !imo.some(n => "v" in n), "core notes still there; no version field leaks into notes");
const acts = (await env.MAX_MEMORY.prepare("SELECT * FROM max_activity").all().catch(() => ({ results: [] }))).results.filter(a => /IMO conventions and codes/.test(JSON.stringify(a)));
ok(acts.length === 1, "one activity line for the whole pack, not 47", acts.length);
// 2. Second sync: nothing duplicated.
d = await sync(env);
ok(d.notes.filter(n => String(n.id).startsWith("note-imo-")).length === 47, "no duplicates on the next sync");
// 3. Mark already imported some of these notes himself: they are updated in place, and one he deleted stays deleted.
w = await fresh(2);
const db2 = new D1(new DatabaseSync(":memory:")); env = { ...env, MAX_MEMORY: db2 };
const old = Date.now() - 864e5;
await sync({ ...env, MAX_SEED_NOTES: "off" }, [
  { id: "mark-ism", title: "ISM Code", category: "Maritime › IMO › Codes", tags: [], body: "<p>my short ISM</p>", createdAt: old, updatedAt: old },
  { id: "note-imo-bwm-2004", title: "BWM 2004", category: "Maritime › IMO › Conventions", tags: [], body: "<p>x</p>", deleted: true, createdAt: old, updatedAt: old }]);
d = await sync(env);
const isms = d.notes.filter(n => n.title === "ISM Code" && !n.deleted);
ok(isms.length === 1 && isms[0].id === "mark-ism" && /Herald of Free Enterprise/.test(isms[0].body), "his own ISM note is updated with the full version, no duplicate", JSON.stringify(isms.map(n => n.id)));
ok(d.notes.find(n => n.id === "note-imo-bwm-2004").deleted, "a note he deleted stays deleted");
// 4. Tests and copies of Max (seeding off) don't get them.
w = await fresh(3);
d = await sync({ ...env, MAX_SEED_NOTES: "off", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) });
ok(!(d.notes || []).some(n => String(n.id).startsWith("note-imo-")), "copies of Max with seeding off don't get them");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
