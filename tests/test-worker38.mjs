// 23 Nov 2026 (Mark): deep review — Max researches every note and ADDS detail at the end; his own text is never touched; Undo works.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
let mode = "good", prompts = [];
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body), text = (b.contents || []).map(c => c.parts.map(p => p.text).join("")).join("\n"); prompts.push(text);
    if (mode === "garbage") return Response.json({ candidates: [{ content: { parts: [{ text: "I could not format this as JSON" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://www.imo.org/x", title: "IMO" } }] } }] });
    const out = mode === "empty" ? { nothing_to_add: true, sections: [], sources: [] } : { nothing_to_add: false, sections: [{ heading: "Latest amendments", bullets: ["Chapter II-2 amendments enter into force on 1 January 2026 <check>", "Regulation 19 requires drills every month"] }, { heading: "On board", bullets: ["Keep the drill record for 3 months"] }], sources: [{ title: "IMO — SOLAS", url: "https://www.imo.org/solas" }] };
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] }, groundingMetadata: mode === "nosrc" ? {} : { groundingChunks: [{ web: { uri: "https://www.imo.org/solas", title: "IMO SOLAS" } }] } }] }); }
  return new Response("{}", { status: 404 }); };
const { default: w, __test: T } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", ALLOWED_ORIGIN: "https://x.test", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const db = await T.brainDb(env), now = Date.now();
const add = (id, title, cat, body) => db.prepare("INSERT INTO max_notes (id,title,category,tags,body,analysis,created_at,updated_at,deleted) VALUES (?,?,?,?,?,?,?,?,0)").bind(id, title, cat, "[]", body, null, now, now).run();
const bodyOf = async id => (await db.prepare("SELECT body FROM max_notes WHERE id = ?").bind(id).first()).body;
await add("n1", "SOLAS", "Maritime › IMO", "<p><b>SOLAS</b></p><ul><li>Fire drills are held every month on board ships.</li></ul>");
await add("n2", "Cooking tips", "Personal", "<p>Rice needs two parts water to one part rice for the pot.</p>");
await add("n3", "BTC position", "Trading › Crypto", "<p>Max keeps this data note updated by himself with prices.</p>");
const orig = await bodyOf("n1");
let n = await T.deepReviewRun(env, 1);
let b1 = await bodyOf("n1");
ok(n === 1 && b1.startsWith(orig) && /Added by Max — deep review/.test(b1), "the maritime note is researched first and the detail is ADDED at the end; his own text is untouched", b1);
ok(/Latest amendments/.test(b1) && /Regulation 19 requires drills every month/.test(b1) && /On board/.test(b1) && /imo\.org\/solas/.test(b1) && /Sources \(checked/.test(b1), "sections, numbers and sources are in the note");
ok(!/<check>/.test(b1) && /&lt;check&gt;/.test(b1), "text from the web is escaped (no stray HTML)");
const ver = await db.prepare("SELECT * FROM max_note_versions WHERE note_id = 'n1' ORDER BY vid DESC").first();
ok(ver && ver.body === orig && /before deep review/.test(ver.reason), "the old version is kept", JSON.stringify(ver));
const un = await w.fetch(new Request("https://max.test/api/notes/undo-fix", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://x.test", "X-Max-Pass": "p" }, body: JSON.stringify({ id: "n1" }) }), env);
ok(un.status === 200 && (await bodyOf("n1")) === orig, "Undo puts the note back exactly as it was", String(un.status));
// after an undo the note is not researched again by itself (it is marked done)
prompts = []; n = await T.deepReviewRun(env, 1);
ok(!(await bodyOf("n1")).includes("deep review") && /Cooking tips/.test(prompts.at(-1) || ""), "an undone note is not redone; the next note is taken", prompts.at(-1)?.slice(0, 120));
const b2 = await bodyOf("n2"); ok(/Added by Max — deep review/.test(b2) && b2.startsWith("<p>Rice needs"), "the second note got its research too");
prompts = []; n = await T.deepReviewRun(env, 3); ok(n === 0 && prompts.length === 0, "the trading data note is skipped and finished notes are not redone", String(n));
// other cases
await add("n4", "MARPOL", "Maritime › IMO", "<p>Annex I is about oil pollution from ships and the discharge limits.</p>");
mode = "empty"; await T.deepReviewRun(env, 1); ok(!/deep review/.test(await bodyOf("n4")), "‘nothing to add’ → the note is left alone");
await add("n5", "COLREG", "Maritime › IMO", "<p>Rule 5 requires a proper look-out at all times by sight and hearing.</p>");
mode = "nosrc"; await db.prepare("UPDATE max_notes SET body = ? WHERE id = 'n5'").bind("<p>Rule 5 requires a proper look-out at all times by sight and hearing (changed).</p>").run();
const nosrcBody = await bodyOf("n5"); await T.deepReviewRun(env, 1); ok((await bodyOf("n5")) === nosrcBody, "no web source found → nothing is written (he never gets unsourced text)");
await add("n6", "STCW", "Maritime › IMO", "<p>Watchkeeping rest hours are at least ten hours in any twenty-four hour period.</p>");
mode = "garbage"; for (let i = 0; i < 3; i++) await T.deepReviewRun(env, 1);
ok(!/deep review/.test(await bodyOf("n6")), "an unreadable answer never writes anything into a note");
mode = "good";
const st = await (await w.fetch(new Request("https://max.test/api/brain/status", { headers: { Origin: "https://x.test", "X-Max-Pass": "p" } }), env)).json();
ok(st.deep && st.deep.on === true && st.deep.total === 5 && st.deep.added >= 2 && Array.isArray(st.deep.recent), "status shows the deep review progress", JSON.stringify(st.deep));
const post = async (a) => (await w.fetch(new Request("https://max.test/api/brain/deep", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://x.test", "X-Max-Pass": "p" }, body: JSON.stringify({ action: a }) }), env)).json();
let r = await post("pause"); ok(r.status.deep.on === false, "Pause stops it"); await add("n7", "ISM Code", "Maritime › IMO", "<p>The ISM Code needs a safety management system on every ship in the company.</p>");
prompts = []; ok((await T.deepReviewRun(env, 2)) === 0 && !prompts.length, "paused → no research is done");
r = await post("start"); ok(r.status.deep.on === true, "Start turns it on again");
r = await post("now"); ok(r.reviewed >= 1 && /deep review/.test(await bodyOf("n7")), "“Review now” does two notes right away", JSON.stringify(r.reviewed));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
