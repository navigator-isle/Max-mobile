// Runs the real worker.js against a real SQLite database (D1-compatible shim) and a fake Gemini.
import { DatabaseSync } from "node:sqlite";
const workerPath = process.argv[2];

class Stmt {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args), success: true }; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { success: true, meta: { changes: Number(r.changes) } }; }
}
class D1 {
  constructor(db) { this.db = db; }
  prepare(sql) { return new Stmt(this.db, sql); }
  async batch(stmts) {
    this.db.exec("BEGIN");
    try { const out = []; for (const s of stmts) out.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return out; }
    catch (e) { this.db.exec("ROLLBACK"); throw e; }
  }
}

let lastGeminiBody = null, geminiMode = "ok";
globalThis.fetch = async (u, o) => {
  if (String(u).includes("generativelanguage")) {
    lastGeminiBody = JSON.parse(o.body);
    if (geminiMode === "fail") return new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Fake Gemini reply" }] } }] }), { status: 200 });
  }
  throw new Error("unexpected fetch " + u);
};

const { default: worker } = await import(workerPath);
const ORIGIN = "https://navigator-isle.github.io";
let pass = 0, fail = 0;
const ok = (cond, label, extra = "") => { cond ? pass++ : fail++; console.log((cond ? "PASS " : "FAIL ") + label + (cond ? "" : "  " + extra)); };
async function call(env, path, { method = "GET", body, passcode, origin = ORIGIN } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (origin) headers.Origin = origin;
  if (passcode !== undefined) headers["X-Max-Pass"] = passcode;
  const r = await worker.fetch(new Request("https://max.test" + path, { method, headers, body: body ? JSON.stringify(body) : undefined }), env);
  return { status: r.status, data: await r.json().catch(() => null), cors: r.headers.get("Access-Control-Allow-Origin") };
}

// 1. Old setup (no database, no passcode): existing features must behave exactly as before.
const oldEnv = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN };
let r = await call(oldEnv, "/health");
ok(r.status === 200 && r.data.ok && r.data.database === "not bound" && r.data.passcodeRequired === false, "old setup: /health ok");
ok(!JSON.stringify(r.data).includes('"k"'), "health never shows the key value");
r = await call(oldEnv, "/api/chat", { method: "POST", body: { message: "hello", history: [{ role: "user", text: "hi" }] } });
ok(r.status === 200 && r.data.reply === "Fake Gemini reply", "old setup: chat still works without passcode", JSON.stringify(r.data));
ok(lastGeminiBody.systemInstruction.parts[0].text.includes("\nNo saved memories"), "system prompt uses real line breaks (no literal \\n)");
r = await call(oldEnv, "/api/chat", { method: "POST", body: { message: "hi", includeMemory: true, memories: ["I like tea"] } });
ok(lastGeminiBody.systemInstruction.parts[0].text.includes("I like tea"), "old setup: local memories still passed through");
r = await call(oldEnv, "/api/memory", { passcode: "" });
ok(r.status === 403, "old setup: cloud memory refused without passcode secret");
r = await call(oldEnv, "/api/chat", { method: "POST", origin: "https://evil.example", body: { message: "x" } });
ok(r.status === 403, "wrong website origin still blocked");
r = await call(oldEnv, "/api/chat", { method: "OPTIONS" });

// 2. New setup: database + passcode.
const sqlite = new DatabaseSync(":memory:");
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "anchor-77", MAX_MEMORY: new D1(sqlite) };
r = await call(env, "/health");
ok(r.data.passcodeRequired === true && r.data.database === "bound" && r.data.passcode === undefined, "health without passcode hides DB detail");
r = await call(env, "/health", { passcode: "nope" });
ok(r.data.passcode === "wrong", "health reports wrong passcode");
r = await call(env, "/health", { passcode: "anchor-77" });
ok(r.data.passcode === "accepted" && r.data.database === "ready", "health with passcode: database ready (tables created)", JSON.stringify(r.data));
const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all().map(x => x.name);
ok(tables.includes("max_memories") && tables.includes("max_notes"), "tables created: " + tables.join(", "));

r = await call(env, "/api/chat", { method: "POST", body: { message: "hello" } });
ok(r.status === 401, "chat refused without passcode once MAX_PASSCODE is set");
r = await call(env, "/api/memory", { passcode: "wrong" });
ok(r.status === 401, "memory refused with wrong passcode");

// Save from chat ("remember that ...") and recall in the next request.
r = await call(env, "/api/chat", { method: "POST", passcode: "anchor-77", body: { message: "Max, remember that my ship is MV Pacific Star.", useCloudMemory: true } });
ok(r.status === 200 && r.data.savedMemory && r.data.savedMemory.text === "my ship is MV Pacific Star", "voice/chat 'remember that' saves to database", JSON.stringify(r.data));
r = await call(env, "/api/chat", { method: "POST", passcode: "anchor-77", body: { message: "Tandaan mo na ayaw ko ng kape", useCloudMemory: true } });
ok(r.data.savedMemory?.text === "ayaw ko ng kape", "Filipino 'tandaan mo na' saves", JSON.stringify(r.data.savedMemory));
r = await call(env, "/api/chat", { method: "POST", passcode: "anchor-77", body: { message: "What ship am I on?", useCloudMemory: true } });
const sys = lastGeminiBody.systemInstruction.parts[0].text;
ok(!r.data.savedMemory && sys.includes("my ship is MV Pacific Star") && r.data.memoriesUsed === 2, "recall: saved memories reach Gemini on a later question");
r = await call(env, "/api/chat", { method: "POST", passcode: "anchor-77", body: { message: "remember to ask", useCloudMemory: false } });
ok(!r.data.savedMemory, "no saving when app does not ask for cloud memory");

// Memory API
r = await call(env, "/api/memory", { method: "POST", passcode: "anchor-77", body: { text: "Prefers short answers" } });
const memId = r.data.memory.id;
r = await call(env, "/api/memory", { passcode: "anchor-77" });
ok(r.data.memories.length === 3, "memory list has 3 items");
r = await call(env, "/api/memory?id=" + memId, { method: "DELETE", passcode: "anchor-77" });
r = await call(env, "/api/memory", { passcode: "anchor-77" });
ok(r.data.memories.length === 2 && !r.data.memories.some(m => m.id === memId), "memory delete works");

// Notes sync: newer wins, deletions spread, notes recalled in chat.
const t = Date.now();
const note = { id: "n_1_abc", title: "Ballast procedure", category: "Maritime", tags: ["ballast", "BWM"], body: "<p>Open sea suction valve first, then start <b>ballast pump</b> No.2.</p>", createdAt: t, updatedAt: t, analysis: { summary: "Steps for ballasting." } };
r = await call(env, "/api/sync", { method: "POST", passcode: "anchor-77", body: { notes: [note], memories: [] } });
ok(r.status === 200 && r.data.notes.length === 1 && r.data.notes[0].analysis.summary === "Steps for ballasting.", "notes sync: upload works");
r = await call(env, "/api/sync", { method: "POST", passcode: "anchor-77", body: { notes: [{ ...note, body: "OLD", updatedAt: t - 5000 }] } });
ok(r.data.notes[0].body.includes("sea suction"), "notes sync: older copy does not overwrite newer");
r = await call(env, "/api/sync", { method: "POST", passcode: "anchor-77", body: { notes: [{ ...note, title: "Ballast procedure v2", updatedAt: t + 1000 }] } });
ok(r.data.notes[0].title === "Ballast procedure v2", "notes sync: newer copy wins");
r = await call(env, "/api/chat", { method: "POST", passcode: "anchor-77", body: { message: "What is my ballast pump order?", useCloudMemory: true } });
ok(r.data.notesUsed?.[0] === "Ballast procedure v2" && lastGeminiBody.systemInstruction.parts[0].text.includes("Open sea suction valve"), "chat recalls related note text", JSON.stringify(r.data.notesUsed));
r = await call(env, "/api/sync", { method: "POST", passcode: "anchor-77", body: { notes: [{ ...note, deleted: true, updatedAt: t + 2000 }] } });
ok(r.data.notes[0].deleted === true, "notes sync: deletion marker stored for other devices");
r = await call(env, "/api/chat", { method: "POST", passcode: "anchor-77", body: { message: "ballast pump order?", useCloudMemory: true } });
ok(r.data.notesUsed.length === 0, "deleted note no longer used in chat");
r = await call(env, "/api/sync", { method: "POST", passcode: "anchor-77", body: { notes: [{ id: "bad id with spaces!", title: "x", updatedAt: t }, { id: "n_sql'); DROP TABLE max_notes;--", title: "y" }] } });
ok(r.status === 200 && sqlite.prepare("SELECT count(*) c FROM max_notes").get().c === 1, "bad ids ignored, nothing injected");

// Gemini failure after a 'remember': memory is still saved and the app is told.
geminiMode = "fail";
r = await call(env, "/api/chat", { method: "POST", passcode: "anchor-77", body: { message: "remember that dinner is 7pm", useCloudMemory: true } });
ok(r.status === 429 && r.data.savedMemory?.text === "dinner is 7pm", "Gemini quota error still reports the saved memory");
geminiMode = "ok";

// Existing table with different columns: clear error instead of silent failure.
const bad = new DatabaseSync(":memory:");
bad.exec("CREATE TABLE max_notes (id TEXT PRIMARY KEY, content TEXT)");
const badEnv = { ...env, MAX_MEMORY: new D1(bad) };
const { default: fresh } = await import(workerPath + "?fresh");
const rb = await fresh.fetch(new Request("https://max.test/health", { headers: { Origin: ORIGIN, "X-Max-Pass": "anchor-77" } }), badEnv);
const hb = await rb.json();
ok(String(hb.database).startsWith("error: Table max_notes exists but is missing columns"), "mismatched old table is reported clearly", hb.database);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
