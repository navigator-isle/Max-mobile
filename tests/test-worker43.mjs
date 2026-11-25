// 25 Nov 2026: Gemini quota (shared resting, backoff), OpenRouter/Cloudflare failures, lessons Max has learned.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };

const gemCalls = []; let gemMode = "429", orMode = "a", groqOk = false, gemBodies = [];
const mkJson = (o, status = 200) => new Response(JSON.stringify(o), { status });
globalThis.fetch = async (url, o = {}) => {
  url = String(url);
  if (url.includes("generativelanguage.googleapis.com")) { gemCalls.push(url); gemBodies.push(o.body || "");
    if (gemMode === "429") return mkJson({ error: { message: "You exceeded your current quota, please check your plan and billing details." } }, 429);
    if (gemMode === "daily") return mkJson({ error: { message: "quota", details: [{ violations: [{ quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier" }] }] } }, 429);
    if (gemMode === "delay") return mkJson({ error: { message: "slow down", details: [{ "@type": "RetryInfo", retryDelay: "37s" }] } }, 429);
    return mkJson({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Fine.", remember: [] }) }] } }] }); }
  if (url.includes("openrouter.ai/api/v1/models")) return mkJson({ data: [{ id: "deepseek/a:free" }, { id: "qwen/b:free" }] });
  if (url.includes("openrouter.ai/api/v1/chat/completions")) { const m = JSON.parse(o.body).model;
    if (orMode === "401") return mkJson({ error: { message: "No auth credentials found" } }, 401);
    if (m === "deepseek/a:free") return mkJson({ error: { message: "No endpoints found for deepseek/a:free" } }, 404);
    return mkJson({ choices: [{ message: { content: "Sure! Here you go:\n```json\n{\"ok\": true, \"note\": \"has } brace\",}\n```\nHope that helps." } }] }); }
  if (url.includes("api.groq.com")) return groqOk ? mkJson({ choices: [{ message: { content: JSON.stringify({ ok: "groq" }) } }] }) : mkJson({ error: { message: "x" } }, 500);
  throw new Error("unexpected " + url);
};
const { default: w, __test: T } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const resetRest = () => { T.skipUntil.clear(); T.backupSkip.clear(); };
const gem = async () => T.gemini(env, { contents: [{ role: "user", parts: [{ text: "hi" }] }] });
const chainLen = T.modelChain(env).length;

// ---- reading Google's 429 ----
ok(T.quotaWait({ error: { details: [{ retryDelay: "37s" }] } }).kind === "exact" && T.quotaWait({ error: { details: [{ retryDelay: "37s" }] } }).ms === 39000, "a per-minute limit: Max waits exactly what Google says (+2 s)");
ok(T.quotaWait({ error: { details: [{ violations: [{ quotaId: "RequestsPerDay" }] }] } }).kind === "daily", "a daily limit is recognised");
ok(T.quotaWait({ error: { message: "You exceeded your current quota" } }).kind === "short", "an unexplained 429 gets a short rest that then doubles");
const reset = T.nextQuotaReset(Date.UTC(2026, 10, 25, 10, 0)), reset2 = T.nextQuotaReset(Date.UTC(2026, 10, 25, 7, 50));
ok(reset === Date.UTC(2026, 10, 26, 8, 5) && reset2 === Date.UTC(2026, 10, 26, 8, 5), "a daily limit rests until Google's reset (midnight Pacific), at least 30 min", new Date(reset).toISOString() + " " + new Date(reset2).toISOString());

// ---- Gemini out of quota: stops asking ----
resetRest(); gemCalls.length = 0; gemMode = "429";
let r1 = await gem();
ok(r1.ok === false && r1.status === 429 && gemCalls.length === chainLen, "first request tries each Gemini model once", gemCalls.length + "/" + chainLen);
gemCalls.length = 0; await gem(); const probe = gemCalls.length;
gemCalls.length = 0; for (let i = 0; i < 6; i++) await gem();
ok(probe <= 1 && gemCalls.length === 0, "then Max stops asking: at most one probe, and none for the next 6 requests (before: every model, every time)", probe + " then " + gemCalls.length);
const r3 = await gem();
ok(r3.ok === false && r3.status === 429 && r3.resting === true && /resting/i.test(r3.data.error.message), "callers get a clear 'resting' answer, not a crash", JSON.stringify(r3.data));
// daily quota: no probe at all
resetRest(); T.restNReset?.(); gemMode = "daily"; gemCalls.length = 0; await gem(); const first = gemCalls.length; gemCalls.length = 0; await gem(); await gem();
ok(first === chainLen && gemCalls.length === 0, "a daily quota is left alone until the reset (no probes)", first + " / " + gemCalls.length);
const left = Math.min(...T.modelChain(env).map(m => (T.skipUntil.get(m) || 0) - Date.now()));
ok(left > 25 * 60e3, "…and the meter shows how long (minutes until the reset)", Math.round(left / 60e3));
// shared across server copies: a brand-new instance reads the rest from the database
const savedUntil = T.skipUntil.get(T.modelChain(env)[0]); T.skipUntil.clear();
await T.restLoad(env, true);
ok(T.skipUntil.get(T.modelChain(env)[0]) === savedUntil, "resting is saved in the database: a fresh server copy knows it too", savedUntil + " vs " + T.skipUntil.get(T.modelChain(env)[0]));
// escalation
resetRest(); const ms = []; for (let i = 0; i < 4; i++) ms.push(await T.restSet(env, "b:zz", 10 * 60e3));
ok(ms.join() === [10, 20, 40, 80].map(x => x * 60e3).join(), "each new failure doubles the rest: 10, 20, 40, 80 min", ms.join());
await T.restClear(env, "b:zz"); const again = await T.restSet(env, "b:zz", 10 * 60e3);
ok(again === 10 * 60e3 && true, "a success clears it, so the next rest starts at 10 min again", again);
// success returns
resetRest(); gemMode = "ok"; gemCalls.length = 0; const g2 = await gem();
ok(g2.ok === true && T.skipUntil.size === 0, "when Gemini works again the rest is cleared", g2.ok + " " + T.skipUntil.size);

// ---- reading AI answers ----
const J = T.extractJson;
ok(J('Here:\n```json\n{"a":1,"b":"x } y",}\n```\nDone').data?.b === "x } y", "JSON with words, fences, a brace inside text and a trailing comma is read");
ok(J('{"a":1}').data.a === 1 && J('no json here') === null, "plain JSON works; no JSON → null");
ok(J('{"notes":[{"id":"1","summary":"abc').cut === true, "an answer that stops half way is named 'cut off' (not just 'unreadable')");

// ---- OpenRouter: bad free model → next model; rejected key → rests hours ----
resetRest(); const envOR = { OPENROUTER_API_KEY: "or", MAX_MEMORY: env.MAX_MEMORY };
const br = await T.brainAsk(envOR, "sys", "q", 500);
ok(br.data && br.data.ok === true && /qwen\/b|openrouter/.test(br.model), "OpenRouter's first free model said 404 → Max moves to the next one and gets an answer", JSON.stringify(br));
const br2 = await T.brainAsk(envOR, "sys", "q", 500);
ok(br2.data && br2.data.ok === true, "the bad model is remembered, the next question goes straight to the good one");
resetRest(); orMode = "401";
const br3 = await T.brainAsk(envOR, "sys", "q", 500);
const restLeft = (T.backupSkip.get("p:openrouter") || 0) - Date.now();
ok(br3.error && restLeft > 5.5 * 3600e3, "a rejected key rests that AI for 6 hours instead of failing on every question", Math.round(restLeft / 3600e3) + " h");
const mt = await T.aiMeter({ ...envOR });
const orRow = mt.list.find(x => x.name === "openrouter");
ok(orRow && /401/.test(orRow.lastErr) && orRow.lesson === "provider-auth", "the meter shows the real reason (401) and the matching lesson", JSON.stringify(orRow));

// ---- study questions use Gemini last (keeps the chat quota) ----
resetRest(); gemMode = "ok"; groqOk = true; gemCalls.length = 0;
const envG = { GROQ_API_KEY: "g", GEMINI_API_KEY: "k", MAX_MEMORY: env.MAX_MEMORY };
for (let i = 0; i < 6; i++) await T.brainAsk(envG, "sys", "q", 500);
ok(gemCalls.length === 0, "study questions go to the other free AIs first; Gemini is not touched while they answer", gemCalls.length);

// ---- what Max has learned ----
const L = T.lessonFor;
ok(L("429 You exceeded your current quota, please check your plan and billing details.", "gemini")?.id === "gemini-quota", "lesson: Gemini quota");
ok(L("429 Rate limit exceeded: free-models-per-day", "openrouter")?.id === "provider-rate-limit", "lesson: another AI's free limit");
ok(L("404 No endpoints found [deepseek]", "openrouter")?.id === "openrouter-free-model", "lesson: OpenRouter free model unavailable");
ok(L("answer was not valid JSON", "cloudflare")?.id === "answer-unreadable" && L("answer cut off before it finished", "cloudflare")?.id === "answer-unreadable", "lesson: unreadable AI answer");
ok(L("ReferenceError: Cannot access 'jget' before initialization")?.id === "startup-order", "lesson: the start-up bug that was fixed on 24 Nov");
ok(L('Max app: "doPaste" failed 3× today — x')?.id === "hidden-errors", "lesson: hidden app error");
ok(L("SyntaxError: Invalid or unexpected token")?.id === "css-in-js" && L("Error: listen EADDRINUSE")?.id === "tests-overlap", "lessons: mistakes made while changing the code");
ok(T.LESSONS.length >= 14 && T.LESSONS.every(l => l.title && l.cause && l.fix), "every lesson says what happened and how it was fixed", T.LESSONS.length);
const prompt = T.lessonsForPrompt("why is gemini failing with quota errors again?");
ok(/KNOWN PROBLEMS AND HOW THEY WERE SOLVED/.test(prompt) && /Gemini ran out/.test(prompt) && T.lessonsForPrompt("what time is the meeting?") === "", "when asked about problems Max gets the lessons; for other chat he does not");
gemMode = "ok"; gemBodies.length = 0;
const call = (path, method = "GET", body, pass = "p") => w.fetch(new Request("https://x" + path, { method, headers: { "Content-Type": "application/json", ...(pass ? { "X-Max-Pass": pass } : {}) }, body: body ? JSON.stringify(body) : undefined }), env, { waitUntil() {} }).then(async r => ({ status: r.status, data: await r.json().catch(() => ({})) }));
const ch = await call("/api/chat", "POST", { message: "why is Gemini failing with quota errors again?", useCloudMemory: true });
ok(ch.status === 200 && gemBodies.some(b => /KNOWN PROBLEMS AND HOW THEY WERE SOLVED/.test(b) && /resting is now saved|Resting is now saved/i.test(b)), "in chat, Max really sees the lessons when you ask about a problem", ch.status);
ok((await call("/api/lessons", "GET", null, "")).status === 401 && (await call("/api/lessons")).data.lessons.length >= 14, "lessons list needs the passcode");
await T.quietAdd(env, [{ w: "startup", m: "ReferenceError: Cannot access 'zz' before initialization", n: 1 }]);
resetRest(); gemMode = "429"; await gem();
const h = await call("/health", "GET", null, "");
ok(Array.isArray(h.data.lessons) && h.data.lessons.some(l => l.id === "startup-order") && h.data.lessons.some(l => l.id === "gemini-quota") && h.data.lessonsAll.length === T.LESSONS.length, "the Security screen gets the matching lessons for what is wrong right now", JSON.stringify((h.data.lessons || []).map(l => l.id)));
console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
