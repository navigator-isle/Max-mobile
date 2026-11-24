// 24 Nov 2026: answers from notes only, hidden errors, free AI meter.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const NOTE = "Casualty reporting. The written casualty report must be sent to the flag state within 5 days of the incident. Keep a copy on board.";
let aiMode = "good", aiCalls = 0, geminiStatus = 200;
globalThis.fetch = async () => geminiStatus === 429 ? new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 })
  : new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Generic answer from the web of the model.", remember: [] }) }] } }] }), { status: 200 });
const { default: w, __test: T } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", GROQ_API_KEY: "g", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")),
  AI: { run: async (m, req) => { const sys = req.messages[0].content;
    if (/ONLY from the NOTES/.test(sys)) { aiCalls++;
      if (aiMode === "good") return { response: JSON.stringify({ found: true, answer: "Send it within 5 days.", quote: "The written casualty report must be sent to the flag state within 5 days of the incident.", note: "Casualty reporting" }) };
      if (aiMode === "made-up") return { response: JSON.stringify({ found: true, answer: "Send it within 24 hours.", quote: "The written casualty report must be sent within 24 hours of the incident.", note: "Casualty reporting" }) };
      return { response: JSON.stringify({ found: false }) };
    }
    return { response: JSON.stringify({ answer: "x", agree: true, differences: [] }) }; } } };
const call = (path, method = "GET", body, pass = "p") => w.fetch(new Request("https://x" + path, { method, headers: { "Content-Type": "application/json", ...(pass ? { "X-Max-Pass": pass } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }).then(async r => ({ status: r.status, data: await r.json().catch(() => ({})) }));
const chat = (message, notes) => call("/api/chat", "POST", { message, useCloudMemory: true, ...(notes ? { notes: { index: [], items: [{ id: "n1", title: "Casualty reporting", category: "Maritime", text: NOTE }] } } : {}) });

// ---- answers from notes only ----
let r = await chat("What is the deadline for the written casualty report under the regulations?", true);
ok(r.status === 200 && /within 5 days/.test(r.data.reply) && /From your note “Casualty reporting”/.test(r.data.reply) && /must be sent to the flag state within 5 days/.test(r.data.reply) && r.data.fromNotes?.verified === true, "regulation question → answer, the note's name and the exact quote", r.data.reply);
aiMode = "made-up"; r = await chat("What is the deadline for the written casualty report under the regulations?", true);
ok(/isn't in your verified notes/.test(r.data.reply) && r.data.notInNotes === true && !/24 hours/.test(r.data.reply), "an invented quote is caught in code → “not in your notes”, the made-up rule is never shown", r.data.reply);
aiMode = "none"; r = await chat("What does the STCW convention say about hours of rest?", true);
ok(/isn't in your verified notes/.test(r.data.reply) && r.data.notInNotes === true, "the AI finds nothing in the notes → Max says so instead of guessing", r.data.reply);
aiCalls = 0; r = await chat("What does the MARPOL convention say about garbage?", false);
ok(/isn't in your verified notes/.test(r.data.reply) && aiCalls === 0, "no notes at all → says so at once (no AI call)", aiCalls + " " + r.data.reply);
aiMode = "good"; r = await chat("Search the web for the latest MARPOL regulations", true);
ok(!/From your note/.test(r.data.reply) && r.data.fromNotes === undefined, "“search the web” skips the notes-only rule", r.data.reply);
r = await chat("tell me something relaxing about jazz", true);
ok(r.data.reply === "Generic answer from the web of the model." && r.data.fromNotes === undefined, "an ordinary question is untouched", r.data.reply);

// ---- hidden errors ----
let q = await call("/api/quiet", "POST", { items: [{ w: "loadNotes", m: "TypeError: Cannot read properties of undefined (reading 'x')", n: 1 }] }, "");
ok(q.status === 401, "reporting hidden errors needs the passcode", q.status);
q = await call("/api/quiet", "POST", { items: [{ w: "loadNotes", m: "TypeError: Cannot read properties of undefined (reading 'x')", n: 1 }, { w: "tidy", m: "weird but minor", n: 1 }] });
ok(q.status === 200 && q.data.kinds === 2, "the app reports its swallowed errors", JSON.stringify(q.data));
let g = await call("/api/quiet");
ok(g.data.problems.length === 1 && /loadNotes/.test(g.data.problems[0]) && !/tidy/.test(g.data.problems[0]), "a real bug (Cannot read…) shows at once; a one-off minor error does not", JSON.stringify(g.data.problems));
await call("/api/quiet", "POST", { items: [{ w: "tidy", m: "weird but minor", n: 3 }] });
g = await call("/api/quiet");
ok(g.data.problems.some(p => /tidy/.test(p) && /4×|3×|4|3/.test(p)), "the same minor error repeating 3+ times a day shows up", JSON.stringify(g.data.problems));
await env.MAX_MEMORY.prepare("INSERT OR REPLACE INTO max_settings (key, value, updated_at) VALUES (?,?,?)").bind("max_srv_status_report", JSON.stringify({ at: Date.now(), sites: [], apps: [{ name: "Max", up: true }, { name: "Other", up: true }] }), Date.now()).run();
const st = await call("/api/home/status");
const me = (st.data.apps || []).find(a => a.name === "Max"), other = (st.data.apps || []).find(a => a.name === "Other");
ok(me && me.errors && me.errors.some(e => /loadNotes/.test(e)) && !(other.errors || []).length, "the Security screen lists them under the Max app", JSON.stringify(st.data.apps));

// ---- free AI meter ----
T.aiNote(env, "groq", true);
for (let i = 0; i < 3; i++) T.aiNote(env, "groq", false, 429, "quota exceeded");
let m = await T.aiMeter(env);
const gm = m.list.find(x => x.name === "groq");
ok(gm && gm.ok >= 1 && gm.fail >= 3 && gm.limitHits >= 3 && /quota/.test(gm.lastErr) && ["failing", "resting"].includes(gm.status), "meter counts answers, failures and limit hits per AI", JSON.stringify(gm));
const h = await call("/health", "GET", null, "");
ok(h.data.aiMeter && Array.isArray(h.data.aiMeter.list) && h.data.aiMeter.list.length >= 2 && !JSON.stringify(h.data.aiMeter).includes('"k"'), "the Security screen gets the meter from /health (no secrets)", JSON.stringify(h.data.aiMeter).slice(0, 160));
geminiStatus = 429; aiMode = "good";
r = await chat("tell me something relaxing about jazz", false);
m = await T.aiMeter(env);
const gm2 = m.list.find(x => x.name === "gemini");
ok(gm2.status === "resting" && gm2.restMin > 0 && m.alerts.some(a => /out of quota or busy/.test(a)), "when Gemini hits its limit the meter shows it resting, with minutes left", JSON.stringify(gm2));
console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
