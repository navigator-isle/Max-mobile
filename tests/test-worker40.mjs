// 23 Nov 2026 (Mark): decision journal with a score + two-AI check on high-stakes answers.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
globalThis.fetch = async () => new Response("{}", {status: 404});
const mod = await import(process.argv[2]), T = mod.__test;
let agree = true, secondAnswer = "The deadline is 24 hours.";
const env = {GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")),
  AI: {run: async (m, req) => { const sys = req.messages[0].content;
    if (/compare two answers/i.test(sys)) return {response: JSON.stringify({agree, differences: agree ? [] : ["Max says 5 days, the second AI says 24 hours"]})};
    return {response: JSON.stringify({answer: secondAnswer, key_facts: ["24 hours"]})}; }}};
await T.srvSetting(env, "x", "1");
// 1) paper trades: open positions become calls, closed trades score them
let S = await T.paperLoad(env);
S.books.crypto_swing.positions = [{sym: "ETH", entry: "2026-11-01", ep: 100, qty: 1}];
await T.callsSync(env, S);
let st = T.callsScore((await (async () => JSON.parse(await T.srvSetting(env, "max_calls_v1")))()).items);
ok(st.length === 1 && st[0].open === 1 && st[0].n === 0, "an open paper position is written down as a call", JSON.stringify(st));
S.books.crypto_swing.positions = [];
S.books.crypto_swing.trades = [{sym: "ETH", entry: "2026-11-01", exit: "2026-11-09", ep: 100, xp: 110, pnl: 10}, ...Array.from({length: 11}, (_, i) => ({sym: "C" + i, entry: "2026-10-" + String(i + 1).padStart(2, "0"), exit: "2026-10-30", ep: 1, xp: 1, pnl: i < 4 ? 5 : -5}))];
await T.callsSync(env, S);
const sc = T.callsScore(JSON.parse(await T.srvSetting(env, "max_calls_v1")).items)[0];
ok(sc.n === 12 && sc.right === 5 && sc.pct === 42 && /poor/.test(sc.label), "closed trades are scored, 5 of 12 = 42% is called poor", JSON.stringify(sc));
const pr = await T.callsPrompt(env);
ok(/Crypto: right 42% of 12/.test(pr) && /poor/.test(pr), "once 10 results exist, the track record goes into Max's prompt", pr);
await T.callsSync(env, S);
ok(T.callsScore(JSON.parse(await T.srvSetting(env, "max_calls_v1")).items)[0].n === 12, "running again does not count anything twice");
const fewer = T.callsScore([{area: "pse", state: "scored", right: true, pnl: 1}]);
ok(/too early/.test(fewer[0].label), "with fewer than 10 results Max says too early");
// 2) rates
const before = {cats: [{key: "hysa", items: [{name: "BankA", rateNum: 4}]}]};
await T.callsRates(env, before, {cats: [{key: "hysa", items: [{name: "BankA", rateNum: 5}, {name: "BankB", rateNum: 3}]}]}, Date.parse("2026-11-01"));
let rc = JSON.parse(await T.srvSetting(env, "max_calls_v1")).items.filter(x => x.area === "rate");
ok(rc.length === 2 && rc.every(x => x.state === "open" && x.due === "2026-12-01"), "a raised or new top-3 rate is a call due in 30 days", JSON.stringify(rc));
await T.callsRates(env, before, {cats: [{key: "hysa", items: [{name: "BankA", rateNum: 5.2}]}]}, Date.parse("2026-12-02"));
rc = JSON.parse(await T.srvSetting(env, "max_calls_v1")).items.filter(x => x.area === "rate" && x.state === "scored");
ok(rc.find(x => x.subject === "BankA")?.right === true && rc.find(x => x.subject === "BankB")?.right === false, "after 30 days: a rate that held is right, one that vanished is wrong", JSON.stringify(rc));
// 3) two-AI check
for (const t of ["What is the deadline for the casualty report under 46 CFR 4.05?", "should I buy BDO stock now?", "delete all my old emails", "how much should I invest in MP2", "what is SOLAS chapter II-1?"]) ok(T.HIGH_STAKES.test(t), "high stakes: " + t);
for (const t of ["what's the weather", "play some jazz", "good morning Max"]) ok(!T.HIGH_STAKES.test(t), "not high stakes: " + t);
secondAnswer = "The report is due within 5 days."; agree = true;
let r = await T.twoAiCheck(env, "deadline for the casualty report?", "The report is due within 5 days.", "notes");
ok(r && r.agree && /agrees/.test(r.reply) && r.reply.startsWith("The report"), "agreement: Max's answer stays, with a short checked line", JSON.stringify(r));
secondAnswer = "The deadline is 24 hours."; agree = false;
r = await T.twoAiCheck(env, "deadline for the casualty report?", "The report is due within 5 days.", "notes");
ok(r && !r.agree && /I'm not sure/.test(r.reply) && /5 days/.test(r.reply) && /24 hours/.test(r.reply) && /Where we differ/.test(r.reply), "disagreement: Max says he is not sure and shows both answers", r?.reply);
const two = JSON.parse(await T.srvSetting(env, "max_twoai_v1"));
ok(two.checks === 2 && two.agree === 1 && two.disagree === 1 && two.recent.length === 1, "the checks are counted for the card", JSON.stringify(two));
env.AI = {run: async () => { throw new Error("capacity"); }};
ok((await T.twoAiCheck(env, "q", "a long enough answer here", "n")) === null, "second AI unavailable → no change and no false claim");
console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
