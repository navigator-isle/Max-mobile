// 22 Nov 2026 (Mark): (1) show which AI answered — main or backup; (2) Max relies mostly on his notes (information bank).
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
let busy = new Set(), seen = [], sys = "";
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.includes("generativelanguage")) { const m = (url.match(/models\/([^:]+):/) || [])[1]; seen.push(m); const b = JSON.parse(o.body); sys = (b.systemInstruction?.parts || []).map(p => p.text).join("\n");
    if (busy.has(m)) return Response.json({ error: { message: "You exceeded your current quota" } }, { status: 429 });
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "From your note Bunkering: the Chief Engineer is responsible.", action: null }) }] } }] }); }
  return new Response("{}", { status: 404 }); };
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", ALLOWED_ORIGIN: "https://x.test", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const chat = async msg => { const r = await w.fetch(new Request("https://max.test/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://x.test", "X-Max-Pass": "p" }, body: JSON.stringify({ message: msg, notes: { items: [{ id: "n1", title: "Bunkering", category: "SMS › CSM SMS", text: "The Chief Engineer is responsible for bunkering. Sounding before and after." }], index: [] } }) }), env); return { status: r.status, d: await r.json() }; };
let r = await chat("who is responsible for bunkering");
ok(r.status === 200 && r.d.model === "gemini-3.5-flash" && r.d.modelRole === "main", "the main AI answered → the app is told “main”", JSON.stringify([r.status, r.d.model, r.d.modelRole]));
ok(/NOTES FIRST/.test(sys) && /answer from them, name the note/.test(sys) && /\(not in your notes\)/.test(sys) && /create a note about/.test(sys), "notes first: answer from his notes and name them; mark general knowledge “not in your notes”; offer to make a note");
ok(/Bunkering/.test(sys) && /Chief Engineer is responsible for bunkering/.test(sys), "his note is in what the AI reads");
busy = new Set(["gemini-3.5-flash"]); seen = [];
r = await chat("who is responsible for bunkering again");
ok(r.status === 200 && r.d.model && r.d.model !== "gemini-3.5-flash" && r.d.modelRole === "backup" && seen[0] === "gemini-3.5-flash", "the main AI is out of quota → a backup answers, and the app is told “backup” (" + r.d.model + ")", JSON.stringify([r.status, r.d.model, r.d.modelRole, seen]));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
