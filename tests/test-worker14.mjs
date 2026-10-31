// Free backup brains: when Gemini's limit is used up, Groq answers, then Cloudflare Workers AI. Files and web search still need Gemini.
let groqMode = "ok", groqCalls = [], gemCalls = 0;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { gemCalls++; return new Response(JSON.stringify({ error: { code: 429, message: "Resource has been exhausted (e.g. check quota)." } }), { status: 429 }); }
  if (url === "https://api.groq.com/openai/v1/chat/completions") { const b = JSON.parse(o.body); groqCalls.push({ b, auth: o.headers.Authorization });
    if (groqMode === "limit") return new Response(JSON.stringify({ error: { message: "Rate limit reached" } }), { status: 429 });
    const sys = b.messages[0].content;
    const text = /JSON/.test(sys) ? "```json\n" + JSON.stringify({ reply: "Hello from the backup brain.", used_notes: [], remember: [] }) + "\n```" : "plain answer";
    return new Response(JSON.stringify({ choices: [{ message: { content: text } }] })); }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
let aiCalls = [];
const AI = { run: async (model, input) => { aiCalls.push(model); if (model.includes("glm")) throw new Error("3040: Capacity temporarily exceeded"); return { response: JSON.stringify({ reply: "Hello from Workers AI.", used_notes: [] }) }; } };
const base = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, body, env, method = "POST") => { const r = await w.fetch(new Request("https://x" + path, { method, headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: body ? JSON.stringify(body) : undefined }), env); return { status: r.status, data: await r.json() }; };

let r = await call("/api/chat", { message: "hello max", allowActions: true }, { ...base, GROQ_API_KEY: "gk", AI });
ok(r.status === 200 && r.data.reply === "Hello from the backup brain." && /groq:openai\/gpt-oss-120b/.test(r.data.model), "Gemini out → Groq answers (same reply format)", JSON.stringify(r.data).slice(0, 200));
ok(groqCalls[0].auth === "Bearer gk" && groqCalls[0].b.messages[0].role === "system" && /JSON/.test(groqCalls[0].b.messages[0].content), "Groq gets Max's instructions and his notes as a system message");
r = await call("/health", null, { ...base, GROQ_API_KEY: "gk", AI }, "GET");
ok(/free backups: groq, workers-ai/.test(r.data.brain), "health lists the free backups", r.data.brain);
groqMode = "limit"; groqCalls = []; aiCalls = [];
r = await call("/api/chat", { message: "hello again", allowActions: true }, { ...base, GROQ_API_KEY: "gk", AI });
ok(r.status === 200 && r.data.reply === "Hello from Workers AI." && aiCalls[0].includes("glm") && aiCalls[1].includes("gemma"), "Groq also out → Cloudflare Workers AI (tries the next model if one is busy)", JSON.stringify(r.data).slice(0, 200) + " " + aiCalls);
r = await call("/api/chat", { message: "and again", allowActions: true }, { ...base, GROQ_API_KEY: "gk", AI });
ok(groqCalls.length === 2 && aiCalls.filter(m => m.includes("glm")).length === 1, "a backup that is out is skipped for a while (no wasted calls)", groqCalls.length + " " + aiCalls);
groqCalls = []; aiCalls = [];
r = await call("/api/attachment", { name: "a.jpg", mime: "image/jpeg", data: "iVBORw0KGgo=" }, { ...base, GROQ_API_KEY: "gk", AI });
ok(r.status === 429 && groqCalls.length === 0 && aiCalls.length === 0, "photos and files are never sent to the backups (they need Gemini)");
r = await call("/api/research", { topic: "BWM" }, { ...base, GROQ_API_KEY: "gk", AI });
ok(groqCalls.length === 0 && r.status !== 200, "web research is never faked by a backup (needs Gemini's search)");
r = await call("/api/chat", { message: "hi" }, base);
ok(r.status !== 200, "without backups: the limit message comes through as before");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
