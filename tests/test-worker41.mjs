// 23 Nov 2026: the two-AI check inside a real chat request.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
let main = "Put all of it into stock A; the target is 9% by June.", agree = false, aiCalls = 0;
globalThis.fetch = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: main, remember: [] }) }] } }] }), { status: 200 });
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")),
  AI: { run: async (m, req) => { aiCalls++; const sys = req.messages[0].content;
    if (/compare two answers/i.test(sys)) return { response: JSON.stringify({ agree, differences: agree ? [] : ["stock A at 9% versus bonds at 3%"] }) };
    return { response: JSON.stringify({ answer: "Put it in bonds; the rate is 3%.", key_facts: [] }) }; } } };
const chat = async body => { const r = await w.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify(body) }), env); return { status: r.status, data: await r.json() }; };
let r = await chat({ message: "Should I put my savings into stocks now?", useCloudMemory: true });
ok(r.status === 200 && /I'm not sure/.test(r.data.reply) && /stock A/.test(r.data.reply) && /bonds/.test(r.data.reply) && r.data.twoAi?.agree === false, "regulation question, two AIs disagree → Max says he is not sure and shows both", JSON.stringify(r.data).slice(0, 400));
agree = true; r = await chat({ message: "Should I put my savings into stocks now?", useCloudMemory: true });
ok(/stock A/.test(r.data.reply) && /agrees/.test(r.data.reply) && r.data.twoAi?.agree === true, "two AIs agree → Max's answer with a short checked line", r.data.reply);
aiCalls = 0; main = "Sure, here is some jazz."; r = await chat({ message: "tell me something relaxing about jazz", useCloudMemory: true });
ok(aiCalls === 0 && !r.data.twoAi && r.data.reply === "Sure, here is some jazz.", "an ordinary question is not double-checked (no extra AI calls)", aiCalls + " " + r.data.reply);
const talk = env.MAX_MEMORY.db.prepare("SELECT text FROM max_talk WHERE role='model' ORDER BY id").all();
ok(/I'm not sure/.test(talk[0].text), "the conversation log keeps what Max actually told him", talk[0].text.slice(0, 80));
console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
