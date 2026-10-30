// Research, research edits, app actions by meaning, topic filing.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
let calls = [], mode = "ok";
const RESEARCH_TEXT = `**TITLE:** Ballast water exchange — BWM
TOPIC: Maritime › Conventions › BWM
POINTS:
- Ships must meet the D-2 performance standard [1].
- Exchange (D-1) should be done at least 200 nm from land [2, 3].
- Record every operation in the Ballast Water Record Book.
CONFLICTS:
- Your note says 50 nm, sources say 200 nm.
CONFIDENCE: high — official IMO pages`;
globalThis.fetch = async (u, o) => {
  const b = JSON.parse(o.body); calls.push(b);
  if (b.tools && mode === "notools") return new Response(JSON.stringify({ error: { message: "Search tool not supported" } }), { status: 400 });
  const text = b.tools || mode === "notools" && /Research this/.test(b.contents[0].parts[0].text) ? RESEARCH_TEXT :
    /editing a research draft/.test(b.contents[0].parts[0].text) ? JSON.stringify({ title: "Ballast water exchange — BWM", topic: "Maritime › Conventions › BWM", points: ["Ships must meet the D-2 performance standard.", "Exchange at least 200 nm from land, in 200 m depth.", "Record every operation."], changed: [2], say: "Point 2 now includes the depth." }) :
    /second-brain note/.test(b.contents?.[0]?.parts?.[0]?.text || "") ? JSON.stringify({ topic: "Maritime › Mooring", summary: "s", analysis: "a", tags: ["mooring"], related: [], questions: [] }) :
    JSON.stringify({ reply: "Opening your notes.", remember: [], action: { type: "show_notes", query: "mooring" } });
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, groundingMetadata: b.tools ? { groundingChunks: [{ web: { uri: "https://vertexaisearch.example/1", title: "imo.org" } }, { web: { uri: "https://vertexaisearch.example/2", title: "someblog.com" } }, { web: { uri: "https://vertexaisearch.example/3", title: "imo.org" } }] } : undefined }] }));
};
const { default: w } = await import(process.argv[2]);
const sqlite = new DatabaseSync(":memory:");
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(sqlite) };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const post = async (path, body, pw = "p", e = env) => { const r = await w.fetch(new Request("https://x" + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": pw }, body: JSON.stringify(body) }), e); return { status: r.status, data: await r.json() }; };

await post("/api/sync", { notes: [{ id: "n1", title: "Ballast procedure", body: "Exchange 50 nm from land, ballast pump No.2", updatedAt: Date.now() }] });
let r = await post("/api/research", { topic: "ballast water exchange rules", topics: ["Maritime › Ballast"] });
const d = r.data.draft;
ok(r.status === 200 && d.title === "Ballast water exchange — BWM" && d.topic === "Maritime › Conventions › BWM", "research: title and topic parsed (even with **bold** labels)", JSON.stringify(r.data).slice(0, 300));
ok(d.points.length === 3 && d.points[1] === "Exchange (D-1) should be done at least 200 nm from land.", "research: points cleaned of [1] markers", JSON.stringify(d.points));
ok(d.conflicts[0].includes("50 nm"), "research: conflict with your note reported");
ok(d.searched === true && calls.at(-1).tools?.[0]?.google_search, "research uses Google Search");
ok(d.sources.filter(s => s.kind === "official").length === 1 && d.sources.some(s => s.kind === "web") && d.sources.some(s => s.kind === "note" && s.noteId === "n1"), "sources: official / web / your note, duplicates removed", JSON.stringify(d.sources));
ok(calls.at(-1).contents[0].parts[0].text.includes("Exchange 50 nm from land"), "your own note is checked during research");

mode = "notools";
r = await post("/api/research", { topic: "ballast water exchange rules" });
ok(r.status === 200 && r.data.draft.searched === false && /low/.test(r.data.draft.confidence), "if web search is unavailable: still answers, marked low confidence", JSON.stringify(r.data.draft?.confidence));
mode = "ok";
r = await post("/api/research", { topic: "" });
ok(r.status === 400, "empty research topic refused");
r = await post("/api/research", { topic: "x" }, "wrong");
ok(r.status === 401, "research needs the passcode");

r = await post("/api/research-edit", { draft: d, instruction: "add the 200 metre depth to point 2" });
ok(r.status === 200 && r.data.points[1].includes("200 m depth") && r.data.changed[0] === 2 && r.data.say.includes("Point 2"), "voice edit of research applied, changed point reported", JSON.stringify(r.data));
r = await post("/api/research-edit", { instruction: "x" });
ok(r.status === 400, "edit without a draft refused");

r = await post("/api/chat", { message: "can you pull up what I wrote about mooring", useCloudMemory: true, allowActions: true, screen: "home", voice: true });
ok(r.data.action?.type === "show_notes" && r.data.action.query === "mooring", "chat returns an app action understood by meaning", JSON.stringify(r.data));
ok(calls.at(-1).systemInstruction.parts[0].text.includes('on the "home" screen') && calls.at(-1).systemInstruction.parts[0].text.includes("ANY wording"), "Max is told the current screen and to understand any wording");
r = await post("/api/chat", { message: "hello", useCloudMemory: true });
ok(r.data.action === null && !calls.at(-1).systemInstruction.parts[0].text.includes("APP CONTROL"), "older app (no allowActions): no actions");
r = await post("/api/chat", { message: "open notes" , allowActions: true }, "p", { GEMINI_API_KEY: "k" });
ok(r.data.action?.type === "show_notes" && r.data.reply === "Opening your notes.", "actions work without the database too");
// unknown action types are dropped
const old = globalThis.fetch; globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "ok", action: { type: "delete_everything" } }) }] } }] }));
r = await post("/api/chat", { message: "x", allowActions: true, useCloudMemory: true });
ok(r.data.action === null, "unknown or unsafe actions are ignored");
globalThis.fetch = old;

r = await post("/api/analyze-note", { title: "Mooring winch", text: "Check brakes", topics: ["Maritime › Ballast", "Maritime › Mooring"] });
ok(r.data.topic === "Maritime › Mooring" && calls.at(-1).contents[0].parts[0].text.includes("Maritime › Mooring"), "note analysis suggests a topic, reusing your existing ones");

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
