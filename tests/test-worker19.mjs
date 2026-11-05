// Smarter free brain: hard questions → strongest free model with deep thinking, then a second AI (different company) checks.
let gem = [], groq = [], wai = [], plan = {}, reviewVerdict = null;
const GOOD = "Under SOLAS the lifeboat drill is monthly; MARPOL Annex I covers oil. The difference is safety versus pollution.";
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("generativelanguage")) { const m = url.match(/models\/([^:]+):/)[1], b = JSON.parse(o.body); gem.push({ m, think: b.generationConfig?.thinkingConfig, sys: b.systemInstruction?.parts?.[0]?.text || "", last: b.contents.at(-1).parts[0].text });
    const p = plan[m]; if (p) { if (p === 404) return new Response(JSON.stringify({ error: { message: "models/" + m + " is not found" } }), { status: 404 });
      if (p === 429) return new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
      if (p === "nothink" && b.generationConfig?.thinkingConfig) return new Response(JSON.stringify({ error: { message: "Thinking level is not supported for this model." } }), { status: 400 }); }
    const last = b.contents.at(-1).parts[0].text;
    let reply;
    if (/strict, careful reviewer/.test(b.systemInstruction?.parts?.[0]?.text || "")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ verdict: "ok", issues: [], confidence: "high" }) }] } }] }));
    if (/A second AI .* reviewed your answer/.test(last)) reply = plan.keep ? "Step 1: 12 knots × 10 hours = 120 nm. So it is 120 nm." : "Step 1: 12 knots × 10 hours = 120 nm. Corrected: the distance is 120 nm.";
    else if (/knots/.test(last)) reply = "Step 1: 12 knots × 10 hours = 150 nm. So it is 150 nm.";
    else if (/remind/.test(last)) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Reminder set for 9.", action: { type: "add_task", details: { title: "call" } } }) }] } }] }));
    else reply = /SOLAS/.test(last) ? GOOD : "Hello! " + m;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply, used_notes: [], action: null }) }] } }] })); }
  if (url === "https://api.groq.com/openai/v1/chat/completions") { const b = JSON.parse(o.body); const sys = b.messages[0].content, user = b.messages.at(-1).content; groq.push({ model: b.model, sys, user });
    if (/strict, careful reviewer/.test(sys)) { const v = reviewVerdict || (/150 nm/.test(user) ? { verdict: "wrong", issues: ["12 knots × 10 hours is 120 nm, not 150 nm"], confidence: "high" } : { verdict: "ok", issues: [], confidence: "high" });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(v) } }] })); }
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ reply: "Groq answering: SOLAS drills are monthly, explained in detail for you here.", used_notes: [] }) } }] })); }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const AI = { run: async (model, input) => { wai.push(model); return { response: JSON.stringify({ verdict: "ok", issues: [], confidence: "high" }) }; } };
const base = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", GROQ_API_KEY: "g", AI };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const chat = async (message, extra = {}, env = base) => { const r = await w.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ message, allowActions: true, ...extra }) }), env); return { status: r.status, data: await r.json() }; };
const reset = () => { gem = []; groq = []; wai = []; plan = {}; reviewVerdict = null; };
const fresh = async () => (await import(process.argv[2] + "?v=" + Math.random())).default;

reset(); let r = await chat("hi max, good morning");
ok(r.data.brain.mode === "fast" && gem[0].m === "gemini-3.5-flash" && !gem[0].think && !r.data.check && groq.length === 0, "an everyday question → the usual fast brain, no extra checks (saves free quota)", JSON.stringify({ b: r.data.brain, m: gem.map(g => g.m), groq: groq.length }));
reset(); r = await chat("Explain why SOLAS requires monthly lifeboat drills and compare it with what MARPOL Annex I covers.");
ok(r.data.brain.mode === "deep" && gem[0].m === "gemini-3.8-flash" && gem[0].think?.thinkingLevel === "high", "a hard question → the strongest free model with deep thinking", JSON.stringify({ b: r.data.brain, g: gem[0] }));
ok(r.data.check && r.data.check.verdict === "ok" && r.data.check.by === "groq:openai/gpt-oss-120b" && !r.data.check.fixed && r.data.reply === GOOD, "…then a second AI from another company checks it (holds up → answer unchanged)", JSON.stringify(r.data.check));
ok(groq[0].user.includes("ANSWER TO CHECK") && groq[0].user.includes(GOOD) && groq[0].user.includes("HIS QUESTION"), "the reviewer sees the question and the answer");
reset(); r = await chat("Calculate step by step: how far do we go at 12 knots in 10 hours?");
ok(r.data.check?.verdict === "wrong" && r.data.check.fixed === true && /120 nm/.test(r.data.reply) && !/150 nm/.test(r.data.reply), "a wrong answer is caught, Max thinks again and fixes it", JSON.stringify({ c: r.data.check, reply: r.data.reply }));
ok(gem.some(g => /A second AI \(groq:openai\/gpt-oss-120b\) reviewed your answer/.test(g.last) && g.think), "Max reconsiders with the reviewer's points, thinking deeply");
reset(); plan.keep = true; reviewVerdict = { verdict: "wrong", issues: ["I think it is 130 nm"], confidence: "high" };
r = await chat("Calculate step by step: how far do we go at 12 knots in 10 hours?");
ok(r.data.check.fixed === true || /120 nm/.test(r.data.reply), "if Max disagrees with the reviewer he can keep his own reasoning (he decides, not the reviewer)", JSON.stringify(r.data));
reset(); reviewVerdict = { verdict: "wrong", issues: ["maybe"], confidence: "low" };
r = await chat("Explain why SOLAS requires monthly lifeboat drills and compare it with what MARPOL Annex I covers.");
ok(!r.data.check.fixed && gem.length === 1, "an unsure reviewer doesn't make Max change his answer", gem.length);
reset(); r = await chat("double check that", { history: [{ role: "user", text: "How far at 12 knots for 10 hours?" }, { role: "model", text: "Step 1: 12 knots × 10 hours = 150 nm." }] });
ok(r.status === 200 && /^After a second check:/.test(r.data.reply) && /120 nm/.test(r.data.reply) && r.data.check.fixed, "“double check that” → a second AI checks the last answer and Max corrects it", r.data.reply);
reset(); r = await chat("are you sure?", { history: [{ role: "user", text: "Explain SOLAS drills" }, { role: "model", text: GOOD }] });
ok(/it holds up/.test(r.data.reply) && r.data.check.verdict === "ok" && gem.length === 0, "“are you sure?” → it holds up (no need to answer again)", r.data.reply);
reset(); r = await chat("sigurado ka ba?");
ok(r.status === 200 && r.data.reply && !r.data.check, "with nothing to check, he just answers normally");
let w2 = await fresh(); reset(); plan["gemini-3.8-flash"] = "nothink";
r = await (async () => { const x = await w2.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ message: "Explain why SOLAS requires monthly lifeboat drills and compare it with MARPOL Annex I.", allowActions: true }) }), base); return { data: await x.json() }; })();
ok(r.data.model === "gemini-3.8-flash" && gem.filter(g => g.m === "gemini-3.8-flash").length === 2 && !gem[1].think, "a model that doesn't take the deep-thinking setting is asked again without it", JSON.stringify(gem.map(g => [g.m, !!g.think])));
w2 = await fresh(); reset(); plan["gemini-3.8-flash"] = 404;
r = await (async () => { const x = await w2.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ message: "Explain why SOLAS requires monthly lifeboat drills and compare it with MARPOL Annex I.", allowActions: true }) }), base); return { data: await x.json() }; })();
ok(r.data.model === "gemini-3.6-flash", "if the strongest isn't available, the next strongest free model answers", r.data.model);
w2 = await fresh(); reset(); for (const m of ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]) plan[m] = 429;
r = await (async () => { const x = await w2.fetch(new Request("https://x/api/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ message: "Explain why SOLAS requires monthly lifeboat drills and compare it with MARPOL Annex I.", allowActions: true }) }), base); return { data: await x.json() }; })();
ok(/^groq:/.test(r.data.model) && r.data.check && /^workers-ai:/.test(r.data.check.by), "if Groq answered (Gemini out), the checker is from a different company (Cloudflare)", JSON.stringify({ m: r.data.model, c: r.data.check }));
reset(); r = await chat("Explain why SOLAS requires monthly lifeboat drills and compare it with MARPOL Annex I.", {}, { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" });
ok(r.status === 200 && r.data.reply === GOOD && r.data.check === null, "with no second AI set up, hard questions still get answered (just unchecked)", JSON.stringify(r.data.check));
reset(); r = await chat("think hard: remind me to call the agency at 9");
ok(!r.data.check && r.data.action?.type === "add_task", "when Max takes an action, there's nothing to fact-check (no extra call)", JSON.stringify(r.data.check));
reset(); r = await chat("think carefully about this one: is it ok?");
ok(r.data.brain.mode === "deep", "“think hard / think carefully” always uses the deep brain");
const h = await (await w.fetch(new Request("https://x/health"), base)).json();
ok(Array.isArray(h.deepChain) && h.deepChain[0] === "gemini-3.8-flash" && h.checker === "groq:openai/gpt-oss-120b", "health shows the deep chain and the checker", JSON.stringify({ d: h.deepChain, c: h.checker }));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
