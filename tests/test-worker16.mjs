// The brain's router: each request goes to the right specialist department, with that department's rules and live data.
// Also the sturdier brain chain: a hiccup gets one retry, and an empty Gemini answer goes to a free backup brain.
const summary = JSON.parse(await (await import("node:fs/promises")).readFile(new URL("./fixtures/trader-summary.json", import.meta.url), "utf8"));
let sysSeen = "", gemMode = "ok", gemCalls = 0, groqCalls = 0;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { gemCalls++; const b = JSON.parse(o.body); sysSeen = b.systemInstruction?.parts?.[0]?.text || "";
    if (gemMode === "hiccup" && gemCalls === 1) return new Response(JSON.stringify({ error: { message: "backend error" } }), { status: 503 });
    if (gemMode === "empty") return new Response(JSON.stringify({ candidates: [{ content: { parts: [] }, finishReason: "SAFETY" }] }));
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Done.", used_notes: [], action: null }) }] } }] })); }
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/summary.json")) return new Response(JSON.stringify(summary));
  if (url === "https://api.groq.com/openai/v1/chat/completions") { groqCalls++; return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reply: "Backup here.", used_notes: [] }) } }] })); }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const base = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, body, env = base, method = "POST") => { const r = await w.fetch(new Request("https://x" + path, { method, headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: body ? JSON.stringify(body) : undefined }), env); return { status: r.status, data: await r.json() }; };
const chat = (message, extra = {}, env) => call("/api/chat", { message, allowActions: true, ...extra }, env);

const cases = [
  ["how is my paper trading doing?", "trading"], ["kumusta ang crypto ko", "trading"], ["what's the RSI strategy", "trading"],
  ["any new reviews on Passage Planner?", "apps"], ["send a new build to the closed test", "apps"],
  ["write a blog post for Hobby Isle about gunpla tools", "web"], ["check my website security headers", "web"],
  ["remind me tomorrow at 9 to call the agency", "schedule"], ["any important emails?", "email"], ["paalala bukas 8am", "schedule"],
  ["summarize my notes about ballast water", "notes"], ["organize my vault folders", "notes"],
  ["I want to start a workout habit", "training"], ["help me study for the MARINA exam", "training"],
  ["what's the capital of Norway", "general"], ["tell me a joke", "general"]];
for (const [q, want] of cases) { const r = await chat(q); ok(r.status === 200 && r.data.dept?.id === want, `"${q}" → ${want}`, JSON.stringify(r.data.dept)); }

let r = await chat("how is my paper trading doing?");
ok(/SPECIALIST ON DUTY: Trading desk/.test(sysSeen) && /never place real trades/.test(sysSeen), "the trading specialist gets its own rules");
ok(/TRADING DESK DATA \(Max's own paper trading/.test(sysSeen) && /"total":"₱/.test(sysSeen) && /PSE dividend top-10/.test(sysSeen), "…and the live paper-account numbers, so it never has to guess", sysSeen.slice(sysSeen.indexOf("TRADING DESK DATA"), sysSeen.indexOf("TRADING DESK DATA") + 300));
ok(/app_control|APP CONTROL/i.test(sysSeen) && /add_event/.test(sysSeen), "every app action is still available to the specialist (nothing removed)");
ok(r.data.dept.name === "Trading desk" && r.data.dept.icon === "📈", "the answer says which desk handled it");
r = await chat("write a blog post for Hobby Isle");
ok(/Website team/.test(sysSeen) && /never invent reviews/.test(sysSeen) && !/TRADING DESK DATA/.test(sysSeen), "the website team gets its own rules (no fake reviews) and not the trading data");
r = await chat("why is that one first?", { lastDept: "trading" });
ok(r.data.dept.id === "trading" && r.data.dept.how === "follow-up", "a short follow-up stays with the same desk", JSON.stringify(r.data.dept));
r = await chat("what's the capital of Norway", { lastDept: "trading" });
ok(r.data.dept.id === "general", "a new unrelated question does not stick to the last desk", JSON.stringify(r.data.dept));
r = await chat("why is that one first?");
ok(r.data.dept.id === "general", "…but without a recent desk it goes to Max in general");
r = await chat("what's the capital of Norway");
ok(!/SPECIALIST ON DUTY/.test(sysSeen), "general questions get plain Max (no specialist text)");
r = await chat("hello", { coach: { name: "Fitness coach", brief: "b", file: "" } });
ok(r.data.dept.id === "training", "a coaching session always goes to the coach desk");
r = await chat("remind me at 9 and how is my crypto", {});
ok(r.status === 200 && ["schedule", "trading", "general"].includes(r.data.dept.id), "mixed requests still get answered", JSON.stringify(r.data.dept));

gemMode = "hiccup"; gemCalls = 0;
r = await chat("tell me a joke");
ok(r.status === 200 && r.data.reply === "Done." && gemCalls === 2 && /gemini-3.5-flash$/.test(r.data.model), "a one-off Gemini hiccup gets one quick retry on the same brain", gemCalls + " " + r.data.model);
gemMode = "empty"; groqCalls = 0;
r = await chat("tell me a joke", {}, { ...base, GROQ_API_KEY: "g" });
ok(r.status === 200 && r.data.reply === "Backup here." && groqCalls === 1 && /groq/.test(r.data.model), "an empty Gemini answer goes to a free backup brain instead of an error", JSON.stringify(r.data).slice(0, 200));
gemMode = "ok";
r = await call("/health", null, { ...base, GROQ_API_KEY: "g" }, "GET");
ok(Array.isArray(r.data.brainChain) && r.data.brainChain[0] === "gemini-3.5-flash" && r.data.brainChain.some(m => m.startsWith("groq:")) && r.data.departments.length === 11, "health shows the full brain chain and the eleven desks", JSON.stringify(r.data.brainChain));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
