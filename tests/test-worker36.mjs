// 23 Nov 2026 (Mark): Max's brain — studies every note, keeps a map, links notes, exams himself, fixes mistakes only when 2 AIs + a source agree.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
let studyCalls = 0, sys = "", chatSys = "", examSaid = "Chapter V says the master must keep a lookout.", verdict = "wrong";
const respond = text => {
  if (/NOTES:\n### id:/.test(text)) { studyCalls++; const ids = [...text.matchAll(/### id: (\S+) \| ([^|]+) \|/g)];
    return JSON.stringify({ notes: ids.map(m => ({ id: m[1], summary: "Summary of " + m[2].trim() + " with the main rules.", facts: ["fact about " + m[2].trim()], terms: [m[2].trim()],
      refs: m[2].trim() === "SOLAS" ? ["COLREG", "SOLAS Chapter V"] : m[2].trim() === "COLREG" ? ["SOLAS"] : [],
      suspects: m[2].trim() === "SOLAS" ? [{ quote: "drills every 6 months", why: "SOLAS requires monthly drills", suggest: "drills every month" }] : [] })) }); }
  if (/Write ONE exam question/.test(text)) return JSON.stringify({ q: "How often are lookouts kept?", a: "Always" });
  if (/Answer ONLY from Mark's notes/.test(text)) return JSON.stringify({ answer: examSaid });
  if (/strict but fair examiner/.test(text)) return JSON.stringify({ score: /NOT FOUND/.test((text.split("Max's answer:")[1] || "").split("\nScore")[0]) ? 0 : 1, why: "ok" });
  if (/flagged this statement/.test(text)) return JSON.stringify({ verdict, correct: "drills every month", source: "https://www.imo.org/solas" });
  return JSON.stringify({ reply: "From your note SOLAS: drills are monthly.", action: null });
};
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.includes("api.groq.com")) { const b = JSON.parse(o.body); return Response.json({ choices: [{ message: { content: respond(b.messages.map(m => m.content).join("\n")) } }] }); }
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); const text = (b.contents || []).map(c => c.parts.map(p => p.text).join("")).join("\n"); sys = (b.systemInstruction?.parts || []).map(p => p.text).join("\n"); if (/NOTES FIRST/.test(sys)) { chatSys = sys; if (process.env.DBG) console.log("CALL", sys.length, /SOLAS/.test(sys), /BRAIN MAP/.test(sys), JSON.stringify(text).slice(0,120)); }
    return Response.json({ candidates: [{ content: { parts: [{ text: respond(sys + "\n" + text) }] }, groundingMetadata: /flagged this statement/.test(text) ? { groundingChunks: [{ web: { uri: "https://www.imo.org/solas", title: "IMO SOLAS" } }] } : undefined }] }); }
  return new Response("{}", { status: 404 }); };
const { default: w, __test: T } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", GROQ_API_KEY: "g", MAX_PASSCODE: "p", ALLOWED_ORIGIN: "https://x.test", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const db = await T.brainDb(env), now = Date.now();
const add = (id, title, cat, body) => db.prepare("INSERT INTO max_notes (id,title,category,tags,body,analysis,created_at,updated_at,deleted) VALUES (?,?,?,?,?,?,?,?,0)").bind(id, title, cat, "[]", body, null, now, now).run();
await add("n1", "SOLAS", "Maritime › IMO", "<p>SOLAS chapter V says lookout. Safety drills every 6 months. See COLREG.</p>");
await add("n2", "COLREG", "Maritime › IMO", "<p>COLREG Rule 5 requires a proper lookout at all times. Related to SOLAS.</p>");
await add("n3", "MARPOL", "Maritime › IMO", "<p>" + "Annex I oil rules. ".repeat(1800) + "</p>");   // ~34,000 characters → 3 parts
await add("n4", "BTC position", "Trading › Crypto", "<p>Max keeps this data note updated by himself, with prices and positions.</p>");
let s = await T.brainStudy(env, { maxUnits: 6 });
ok(s.studied >= 2, "first study run: the small notes are studied", JSON.stringify(s));
for (let i = 0; i < 8 && (await T.brainStatus(env)).left; i++) await T.brainStudy(env, { maxUnits: 6 });
let st = await T.brainStatus(env);
ok(st.total === 3 && st.studied === 3 && st.left === 0, "all 3 maritime notes studied (the trading data note is skipped); the 34,000-character MARPOL took 3 parts", JSON.stringify(st));
const rowOf = id => db.prepare("SELECT * FROM max_brain WHERE note_id = ?").bind(id).first();
const m3 = await rowOf("n3"); ok(m3.part === 3 && m3.parts === 3 && JSON.parse(m3.facts).length >= 3, "long note: every part was studied and the facts were merged", JSON.stringify([m3.part, m3.parts, m3.facts]));
const l1 = JSON.parse((await rowOf("n1")).links), l2 = JSON.parse((await rowOf("n2")).links);
ok(l1.includes("n2") && l2.includes("n1"), "neurons: SOLAS ↔ COLREG are linked both ways", JSON.stringify([l1, l2]));
const map = await T.srvSetting(env, "max_brain_map");
ok(/Maritime › IMO/.test(map) && /SOLAS: Summary of SOLAS/.test(map) && /COLREG/.test(map) && !/BTC position/.test(map), "memory map lists what he knows by folder", map);
const rec = await T.brainRecall(env, [{ id: "n1" }]);
ok(/COLREG/.test(rec.related) && /fact about COLREG/.test(rec.related) && rec.map === map, "recall: the notes linked to SOLAS come with it (digest + facts)", rec.related);
const before = studyCalls; s = await T.brainStudy(env, { maxUnits: 6 });
ok(s.studied === 0 && studyCalls === before, "nothing changed → nothing is studied again (saves the free quota)", JSON.stringify(s));
await db.prepare("UPDATE max_notes SET body = ?, updated_at = ? WHERE id = 'n2'").bind("<p>COLREG Rule 5 requires a proper lookout at all times. Rule 6 safe speed. Related to SOLAS.</p>", now + 5).run();
s = await T.brainStudy(env, { maxUnits: 6 }); ok(s.studied === 1 && studyCalls === before + 1, "an edited note is studied again, only that one", JSON.stringify(s) + studyCalls);
// ---- corrections: a different AI + a source must agree ----
let sus = JSON.parse((await rowOf("n1")).suspects); ok(sus.length === 1 && sus[0].state === "new", "study flagged a suspect statement in SOLAS", JSON.stringify(sus));
sus[0].by = "gemini:gemini-3.5-flash"; await db.prepare("UPDATE max_brain SET suspects = ? WHERE note_id = 'n1'").bind(JSON.stringify(sus)).run();
await T.brainVerify(env, 1);
let b1 = (await db.prepare("SELECT body FROM max_notes WHERE id = 'n1'").first()).body; sus = JSON.parse((await rowOf("n1")).suspects);
ok(sus[0].state === "check" && /every 6 months/.test(b1), "the SAME AI company checked its own flag → NOT fixed, goes to the “Please check” list", JSON.stringify(sus[0]));
sus[0].state = "new"; sus[0].by = "groq:openai/gpt-oss-120b"; await db.prepare("UPDATE max_brain SET suspects = ? WHERE note_id = 'n1'").bind(JSON.stringify(sus)).run();
verdict = "unsure"; await T.brainVerify(env, 1); sus = JSON.parse((await rowOf("n1")).suspects);
ok(sus[0].state === "check" && /every 6 months/.test((await db.prepare("SELECT body FROM max_notes WHERE id = 'n1'").first()).body), "second AI unsure → note unchanged, in the “Please check” list", sus[0].state);
sus[0].state = "new"; await db.prepare("UPDATE max_brain SET suspects = ? WHERE note_id = 'n1'").bind(JSON.stringify(sus)).run();
verdict = "wrong"; await T.brainVerify(env, 1);
b1 = (await db.prepare("SELECT body FROM max_notes WHERE id = 'n1'").first()).body; sus = JSON.parse((await rowOf("n1")).suspects);
ok(/drills every month/.test(b1) && !/every 6 months/.test(b1) && sus[0].state === "fixed" && /imo\.org/.test(sus[0].source), "a different AI + an official source agree → fixed in the note", JSON.stringify(sus[0]) + b1);
const ver = await db.prepare("SELECT body, reason FROM max_note_versions WHERE note_id = 'n1' ORDER BY vid DESC").first();
ok(ver && /every 6 months/.test(ver.body), "the old version is kept (Undo works)", JSON.stringify(ver));
const un = await w.fetch(new Request("https://max.test/api/notes/undo-fix", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://x.test", "X-Max-Pass": "p" }, body: JSON.stringify({ id: "n1" }) }), env);
ok(un.status === 200 && /every 6 months/.test((await db.prepare("SELECT body FROM max_notes WHERE id = 'n1'").first()).body), "Undo puts the old text back", String(un.status));
// ---- exam ----
await T.brainExam(env, 1); st = await T.brainStatus(env);
ok(st.exam.count === 1 && st.exam.score === 100, "exam: Max answered from his notes and graded himself 100%", JSON.stringify(st.exam));
examSaid = "NOT FOUND"; await db.prepare("UPDATE max_brain SET exam = NULL").run();
await T.brainExam(env, 1); st = await T.brainStatus(env);
ok(st.exam.score === 0 && st.exam.gaps.length === 1, "a wrong / not-found answer shows up as a gap", JSON.stringify(st.exam));
const redo = (await db.prepare("SELECT * FROM max_brain WHERE hash = ''").all()).results; ok(redo.length === 1, "…and that note is studied again", String(redo.length));
// ---- in the chat ----
await T.brainStudy(env, { maxUnits: 6 });
const chat = await w.fetch(new Request("https://max.test/api/chat", { method: "POST", headers: { "Content-Type": "application/json", Origin: "https://x.test", "X-Max-Pass": "p" }, body: JSON.stringify({ message: "tell me about safety drills", history: [], useCloudMemory: true }) }), env);
ok(chat.status === 200 && /MAX'S BRAIN MAP/.test(chatSys) && /LINKED NOTES/.test(chatSys) && /fact about COLREG/.test(chatSys), "chat: Max carries his memory map and the linked notes", String(chat.status) + chatSys.slice(-300));
// ---- status endpoint + provider list ----
const stat = await (await w.fetch(new Request("https://max.test/api/brain/status", { headers: { Origin: "https://x.test", "X-Max-Pass": "p" } }), env)).json();
ok(stat.total === 3 && Array.isArray(stat.providers) && stat.providers.includes("groq") && stat.providers.includes("gemini") && stat.usage.geminiCap === 40, "status: shows providers and today's usage", JSON.stringify(stat.providers));
const un2 = await w.fetch(new Request("https://max.test/api/brain/status", { headers: { Origin: "https://x.test" } }), env); ok(un2.status === 401, "no passcode → no access", String(un2.status));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
