// Brain choice: Gemini Flash first, Flash-Lite backup, optional Claude with Gemini fallback.
let calls = [], plan = {};
globalThis.fetch = async (u, o) => {
  const url = String(u), b = JSON.parse(o.body);
  const who = url.includes("anthropic") ? "claude" : url.match(/models\/([^:]+):/)[1];
  calls.push({ who, b, headers: o.headers });
  const p = plan[who] || { ok: true };
  if (!p.ok) return new Response(JSON.stringify({ error: { message: p.msg || "nope" } }), { status: p.status || 404 });
  if (who === "claude") return new Response(JSON.stringify({ model: b.model, stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ reply: "Claude here." }) }] }));
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: who + " here.", summary: "s", topic: "T" }) }] } }] }));
};
const fresh = async () => (await import(process.argv[2] + "?" + Math.random())).default;
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const chat = async (w, env, body = { message: "hi", allowActions: true }) => { const r = await w.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }), env); return { status: r.status, data: await r.json() }; };
const health = async (w, env) => (await w.fetch(new Request("https://x/health"), env)).json();

let w = await fresh(); calls = []; plan = {};
let r = await chat(w, { GEMINI_API_KEY: "k" });
ok(r.data.reply === "gemini-3.5-flash here." && r.data.model === "gemini-3.5-flash", "uses Gemini Flash by default", JSON.stringify(r.data));
plan = { "gemini-3.5-flash": { ok: false, status: 429, msg: "Quota exceeded for free tier" } }; calls = [];
r = await chat(w, { GEMINI_API_KEY: "k" });
ok(r.data.reply === "gemini-3.5-flash-lite here." && calls.map(c => c.who).join() === "gemini-3.5-flash,gemini-3.5-flash-lite", "Flash daily limit reached → Flash-Lite answers instead", calls.map(c => c.who).join());
calls = []; r = await chat(w, { GEMINI_API_KEY: "k" });
ok(calls.map(c => c.who).join() === "gemini-3.5-flash-lite", "then skips Flash for a while (no wasted calls)");
ok((await health(w, { GEMINI_API_KEY: "k" })).model === "gemini-3.5-flash-lite", "health shows the model actually in use");

w = await fresh(); plan = { "gemini-3.5-flash": { ok: false, status: 400, msg: "models/gemini-3.5-flash is no longer available to new users" } }; calls = [];
r = await chat(w, { GEMINI_API_KEY: "k" });
ok(r.data.reply === "gemini-3.5-flash-lite here.", "retired model → backup used automatically");
w = await fresh(); plan = { "gemini-3.5-flash": { ok: false, status: 400, msg: "Invalid JSON payload" } }; calls = [];
r = await chat(w, { GEMINI_API_KEY: "k" });
ok(r.status === 502 && calls.length === 1, "a broken request is not retried on every model");
w = await fresh(); plan = { "gemini-3.5-flash": { ok: false, status: 429 }, "gemini-3.5-flash-lite": { ok: false, status: 429, msg: "quota" } }; calls = [];
r = await chat(w, { GEMINI_API_KEY: "k" });
ok(r.status === 429 && r.data.error === "quota", "both out of free quota → clear error");

w = await fresh(); plan = {}; calls = [];
r = await chat(w, { GEMINI_API_KEY: "k", GEMINI_MODEL: "gemini-3.5-pro" });
ok(calls[0].who === "gemini-3.5-pro", "GEMINI_MODEL variable still lets you choose");

// Claude
w = await fresh(); plan = {}; calls = [];
r = await chat(w, { GEMINI_API_KEY: "k", ANTHROPIC_API_KEY: "sk" }, { message: "hello", allowActions: true, history: [{ role: "model", text: "hi" }, { role: "user", text: "a" }, { role: "user", text: "b" }, { role: "model", text: "c" }] });
const cb = calls[0].b;
ok(r.data.reply === "Claude here." && calls[0].who === "claude" && cb.model === "claude-haiku-5-5", "with a Claude key, Max uses Claude Haiku", JSON.stringify(r.data));
ok(calls[0].headers["x-api-key"] === "sk" && calls[0].headers["anthropic-version"] && cb.system.includes("J.A.R.V.I.S"), "Claude call: key header, version, Max's personality");
ok(cb.messages[0].role === "user" && cb.messages.every((m, i) => i === 0 || m.role !== cb.messages[i - 1].role) && cb.messages.at(-1).content.endsWith("hello"), "Claude messages alternate correctly and start with you", JSON.stringify(cb.messages));
ok((await health(w, { GEMINI_API_KEY: "k", ANTHROPIC_API_KEY: "sk" })).brain.startsWith("claude-haiku-5-5"), "health shows Claude as the brain");
plan = { claude: { ok: false, status: 400, msg: "Your credit balance is too low" } }; calls = [];
r = await chat(w, { GEMINI_API_KEY: "k", ANTHROPIC_API_KEY: "sk" });
ok(r.data.reply === "gemini-3.5-flash here." && r.data.claudeProblem.includes("credit balance"), "Claude credit used up → Gemini answers, problem reported");
calls = []; r = await chat(w, { GEMINI_API_KEY: "k", ANTHROPIC_API_KEY: "sk", CLAUDE_MODEL: "claude-sonnet-5-5" });
ok(calls[0].b.model === "claude-sonnet-5-5", "CLAUDE_MODEL variable chooses Sonnet");
// research and analysis use the chain too
w = await fresh(); plan = { "gemini-3.5-flash": { ok: false, status: 404 } }; calls = [];
const an = await (await w.fetch(new Request("https://x/api/analyze-note", { method: "POST", body: JSON.stringify({ text: "note" }) }), { GEMINI_API_KEY: "k" })).json();
ok(an.topic === "T" && calls.at(-1).who === "gemini-3.5-flash-lite", "note analysis also falls back");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
