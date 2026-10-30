// New features: conversation log, continuing after restart, auto-remember, voice style, notes-first.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; }
  bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }

let last = null, nextReply = null;
globalThis.fetch = async (u, o) => {
  last = JSON.parse(o.body);
  const text = nextReply ?? JSON.stringify({ reply: "Understood.", remember: [] });
  nextReply = null;
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });
};
const { default: w } = await import(process.argv[2]);
const sqlite = new DatabaseSync(":memory:");
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(sqlite) };
let pass = 0, fail = 0;
const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const chat = async (body, e = env, pass = "p") => {
  const r = await w.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": pass }, body: JSON.stringify(body) }), e);
  return { status: r.status, data: await r.json() };
};
const sys = () => last.systemInstruction.parts[0].text;

// Auto-remember from normal talk (JSON reply)
nextReply = JSON.stringify({ reply: "Congratulations on the new contract.", remember: ["Mark joins MV Ocean Pearl as Chief Officer in December"] });
let r = await chat({ message: "I signed a contract, I'll join MV Ocean Pearl as Chief Officer in December", useCloudMemory: true, voice: true });
ok(r.data.reply === "Congratulations on the new contract.", "JSON reply is unwrapped for the user", JSON.stringify(r.data));
ok(r.data.autoSaved.length === 1 && sqlite.prepare("SELECT count(*) c FROM max_memories WHERE source='auto'").get().c === 1, "lasting fact saved automatically");
ok(last.generationConfig.responseMimeType === "application/json", "asks Gemini for JSON when memory is on");
ok(sys().includes("spoken conversation") && sys().includes("J.A.R.V.I.S"), "voice mode uses short spoken style + Jarvis personality");
ok(sqlite.prepare("SELECT count(*) c FROM max_talk").get().c === 2, "conversation saved (question + answer)");

// Duplicate and unsafe facts are not saved
nextReply = JSON.stringify({ reply: "Noted.", remember: ["Mark joins MV Ocean Pearl as Chief Officer in December.", "Mark's bank PIN is 4455", "Mark's card 4111111111111111"] });
r = await chat({ message: "again", useCloudMemory: true });
ok(r.data.autoSaved.length === 0, "duplicates, PINs and card numbers are never auto-saved", JSON.stringify(r.data.autoSaved));

// Model forgets JSON → still works
nextReply = "Plain text answer without JSON";
r = await chat({ message: "hello", useCloudMemory: true });
ok(r.status === 200 && r.data.reply === "Plain text answer without JSON", "if Gemini ignores the JSON format, the reply still comes through");

// Continues the conversation after the app restarts (no history sent from the phone)
r = await chat({ message: "What did I just tell you about my contract?", useCloudMemory: true, history: [] });
const roles = last.contents.map(c => c.role).join(",");
ok(last.contents.length === 7 && last.contents[0].parts[0].text.includes("MV Ocean Pearl"), "after restart, earlier conversation is sent from the database", roles);
ok(roles.split(",").every((x, i, a) => i === 0 ? x === "user" : true), "history starts with the user (Gemini requirement)");

// Older conversations found by keyword
for (let i = 0; i < 14; i++) await chat({ message: "small talk " + i, useCloudMemory: true });
r = await chat({ message: "When do I join Ocean Pearl?", useCloudMemory: true });
ok(!last.contents.some(c => c.parts[0].text.includes("Ocean Pearl as Chief")) && sys().includes("Earlier conversations that may relate") && sys().includes("MV Ocean Pearl as Chief Officer"), "old conversation outside recent window recalled by keyword");
ok(sys().includes("Long-term memory") && sys().includes("Mark joins MV Ocean Pearl"), "auto-saved fact used later");

// "remember that" still works, and doesn't double-save
nextReply = JSON.stringify({ reply: "Saved.", remember: ["Mark's daughter is called Ana"] });
r = await chat({ message: "Max remember that my daughter is Ana", useCloudMemory: true });
ok(r.data.savedMemory?.text === "my daughter is Ana" && r.data.autoSaved.length === 0, "explicit 'remember that' saves once, no duplicate");

// Notes first
await w.fetch(new Request("https://x/api/sync", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ notes: [{ id: "n1", title: "Mooring checklist", body: "Check mooring winch brakes before arrival", updatedAt: Date.now() }] }) }), env);
r = await chat({ message: "mooring winch steps?", useCloudMemory: true });
ok(sys().includes("USER'S NOTES (core memory") && sys().includes("mooring winch brakes"), "matching note given to Max as core memory");
ok(sys().indexOf("1) the user's own notes") > -1, "notes come first in knowledge priority");

// Conversation history view + forget
let t = await (await w.fetch(new Request("https://x/api/talk", { headers: { "X-Max-Pass": "p" } }), env)).json();
ok(t.total > 30 && t.recent.length === 20, "conversation history readable", JSON.stringify(t.total));
await w.fetch(new Request("https://x/api/talk", { method: "DELETE", headers: { "X-Max-Pass": "p" } }), env);
t = await (await w.fetch(new Request("https://x/api/talk", { headers: { "X-Max-Pass": "p" } }), env)).json();
ok(t.total === 0, "forget conversation history works");
const m = await (await w.fetch(new Request("https://x/api/memory", { headers: { "X-Max-Pass": "p" } }), env)).json();
ok(m.memories.length === 2, "forgetting conversations keeps saved memories");
r = await (await w.fetch(new Request("https://x/api/talk", { headers: { "X-Max-Pass": "wrong" } }), env));
ok(r.status === 401, "conversation history protected by passcode");

// Without the database: old behaviour, plain text, no JSON
r = await chat({ message: "hi", history: [{ role: "user", text: "a" }, { role: "model", text: "b" }] }, { GEMINI_API_KEY: "k" });
ok(r.data.reply.includes("Understood") || r.status === 200, "no database: still answers");
ok(!last.generationConfig.responseMimeType && last.contents.length === 3, "no database: uses phone history, plain text");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
