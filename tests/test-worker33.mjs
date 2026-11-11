// 11 Nov 2026: notes Max researches himself — new notes drafted from web sources, notes updated on request,
// and the nightly fact-check fixing wrong facts itself (old version kept, one-tap undo).
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const asked = []; let reply = "";
const SRC = { groundingChunks: [{ web: { title: "IMO", uri: "https://www.imo.org/en/About/Conventions/Pages/International-Convention-for-the-Safety-of-Life-at-Sea-(SOLAS),-1974.aspx" } }, { web: { title: "eCFR", uri: "https://www.ecfr.gov/x" } }] };
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); asked.push({ text: b.contents[0].parts.map(x => x.text || "").join("\n"), search: !!(b.tools || []).some(t => t.google_search) });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: typeof reply === "function" ? reply(asked.at(-1).text) : reply }] }, groundingMetadata: SRC }] })); }
  return new Response("{}", { status: 404 });
};
const { default: w, __test: T } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const call = async (path, body) => { const r = await w.fetch(new Request("https://x" + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify(body) }), env); return { status: r.status, data: await r.json() }; };

// 1. Markdown → Max's note layout; exact text fixes
const h = T.mdToNoteHtml("**What is**\n- one\n  - sub\n---\nSee [IMO](https://www.imo.org)");
ok(/<p><b>What is<\/b><\/p>/.test(h) && /<ul><li>one<ul><li>sub/.test(h) && /<hr>/.test(h) && /<a href="https:\/\/www.imo.org">IMO<\/a>/.test(h), "markdown becomes Max's note layout (headings, nested bullets, links)", h);
let f = T.applyNoteFixes("<p>Lifeboat drills every 3 months & monthly musters.</p>", [{ find: "every 3 months", replace: "every month" }, { find: "not in the note", replace: "x" }, { find: "", replace: "x" }]);
ok(f.html === "<p>Lifeboat drills every month & monthly musters.</p>" && f.done.length === 1, "fixes swap only exact text that is really in the note", JSON.stringify(f));
f = T.applyNoteFixes("<p>Fees &amp; charges: 5%</p>", [{ find: "Fees & charges: 5%", replace: "Fees & charges: 4%" }]);
ok(f.html === "<p>Fees &amp; charges: 4%</p>", "works through HTML escaping (& → &amp;)", f.html);

// 2. "Create a note about X" → researched draft
reply = "FOLDER: Maritime › IMO › Codes\nTITLE: Polar Code\n---NOTE---\n**What is the Polar Code**\nThe International Code for Ships Operating in Polar Waters, mandatory under SOLAS chapter XIV and MARPOL Annexes I, II, IV and V since 1 January 2017.\n**Applies to**\n- Passenger and cargo ships under SOLAS operating in Arctic and Antarctic waters\n- Polar Ship Certificate and Polar Water Operational Manual required\n**Key Point**\nCheck the PWOM before entering polar waters and keep ice navigation training up to date.\n**Sources (checked today)**\n- IMO Polar Code page";
let r = await call("/api/note-draft", { topic: "Polar Code", topics: ["Maritime › IMO › Codes"] });
ok(r.status === 200 && r.data.title === "Polar Code" && r.data.folder === "Maritime › IMO › Codes" && /<p><b>What is the Polar Code<\/b><\/p>/.test(r.data.html) && r.data.sources.length === 2 && r.data.searched, "new note: full draft with folder, title and web sources", JSON.stringify(r.data).slice(0, 300));
ok(asked.at(-1).search && /NEW reference note/.test(asked.at(-1).text) && /never invent/i.test(asked.at(-1).text), "the draft is written after a real web search, told never to invent numbers");
reply = "TITLE: x\n---NOTE---\ntoo short";
r = await call("/api/note-draft", { topic: "nothing" });
ok(r.status === 422, "an empty answer is refused, not saved as a note", r.status);

// 3. "Update my note X with …" → researched edit; a shorter result is refused
const old = "<p><b>MARPOL Annex VI</b></p><p>" + "Sulphur limit 0.50% outside ECAs since 2020. ".repeat(12) + "</p>";
reply = "CHANGES: added the Mediterranean SOx ECA (1 May 2025)\n---NOTE---\n**MARPOL Annex VI**\n" + "Sulphur limit 0.50% outside ECAs since 2020. ".repeat(12) + "\n**Mediterranean ECA**\nThe Mediterranean Sea SOx ECA took effect on 1 May 2025 (0.10% sulphur).";
r = await call("/api/note-improve", { note: { title: "MARPOL Annex VI", body: old }, instruction: "add the new Mediterranean ECA" });
ok(r.status === 200 && /Mediterranean/.test(r.data.html) && /Mediterranean SOx ECA/.test(r.data.changes) && r.data.title === "MARPOL Annex VI", "update: the note keeps its content and gains the new section", JSON.stringify(r.data).slice(0, 200));
ok(/keep everything in the note that is still correct/.test(asked.at(-1).text) && /add the new Mediterranean ECA/.test(asked.at(-1).text), "the edit request keeps what's correct and does only what Mark asked");
reply = "CHANGES: shortened\n---NOTE---\n**MARPOL Annex VI**\nSulphur 0.50%. And a little more text so that it is over two hundred characters long but still far shorter than the old note was, which means it must be refused by Max so nothing is lost from the note.";
r = await call("/api/note-improve", { note: { title: "MARPOL Annex VI", body: old }, instruction: "update it" });
ok(r.status === 422, "an update that would lose much of the note is refused", r.status);

// 4. Nightly fact-check corrects a wrong fact, keeps the old version; undo puts it back
const body = "<p><b>SOLAS drills</b></p><p>Every crew member takes part in at least one abandon ship drill and one fire drill every 3 months. Lifeboats are lowered to the water at least once every 3 months.</p>";
await w.fetch(new Request("https://x/api/sync", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ notes: [{ id: "n-drills", title: "SOLAS drills", category: "Maritime › Safety", tags: [], body, createdAt: 1, updatedAt: 2 }], memories: [] }) }), env);
reply = JSON.stringify({ verdict: "wrong", summary: "Drill frequency is monthly.", issues: [{ claim: "every 3 months", problem: "SOLAS III/19.3.2 requires monthly drills", correct: "every month", source: "SOLAS III/19", find: "one fire drill every 3 months", replace: "one fire drill every month" }] });
const msg = await T.notesDailyCheck(env, 8);
let row = await env.MAX_MEMORY.prepare("SELECT body, updated_at FROM max_notes WHERE id = ?").bind("n-drills").first();
ok(msg === "checked 1" && /one fire drill every month\./.test(row.body) && /once every 3 months/.test(row.body), "fact-check fixed only the wrong sentence", row && row.body);
const vers = (await env.MAX_MEMORY.prepare("SELECT * FROM max_note_versions WHERE note_id = ?").bind("n-drills").all()).results;
ok(vers.length === 1 && vers[0].body === body, "the old version is kept");
const checks = JSON.parse((await env.MAX_MEMORY.prepare("SELECT value FROM max_settings WHERE key = 'max_srv_notecheck'").first())?.value || "{}");
ok(/fixed/.test(checks["n-drills"]?.verdict) && checks["n-drills"].fixed?.changes?.length === 1, "the check shows it was fixed, with the change", JSON.stringify(checks["n-drills"]).slice(0, 300));
const act = (await env.MAX_MEMORY.prepare("SELECT * FROM max_activity").all().catch(() => ({ results: [] }))).results.filter(a => /fixed note/.test(JSON.stringify(a)));
ok(act.length === 1, "Mark sees it in the activity list", act.length);
r = await call("/api/notes/undo-fix", { id: "n-drills" });
row = await env.MAX_MEMORY.prepare("SELECT body FROM max_notes WHERE id = ?").bind("n-drills").first();
const c2 = JSON.parse((await env.MAX_MEMORY.prepare("SELECT value FROM max_settings WHERE key = 'max_srv_notecheck'").first()).value)["n-drills"];
ok(r.status === 200 && row.body === body && c2.fixed.undone && /undone/.test(c2.verdict), "undo restores Mark's version", JSON.stringify(r.data));
// no sources → never auto-change
await env.MAX_MEMORY.prepare("UPDATE max_notes SET updated_at = ? WHERE id = ?").bind(Date.now() + 10, "n-drills").run();
SRC.groundingChunks = [];
await T.notesDailyCheck(env, 8);
row = await env.MAX_MEMORY.prepare("SELECT body FROM max_notes WHERE id = ?").bind("n-drills").first();
ok(row.body === body, "without web sources, Max only reports — he never changes the note");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
