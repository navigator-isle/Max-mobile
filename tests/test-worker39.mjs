// 23 Nov 2026 (Mark: "I want this to improve max"): findings register (ISM-style non-conformities), daily log, weekly audit,
// examiner that turns proven mistakes into rules, stop/start/continue list.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
globalThis.fetch = async () => new Response("{}", {status: 404});
const mod = await import(process.argv[2]), T = mod.__test;
let aiMode = "exam";
const env = {GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")),
  AI: {run: async (m, req) => { const sys = req.messages[0].content;
    if (/examiner/i.test(sys)) return {response: JSON.stringify({grades: [{i: 0, verdict: "wrong", note: "[Cargo Gear]", fact: "Thorough examination | At least every 12 months by a competent person", rule: "Say the thorough examination of loose gear is at least every 12 months."},
      {i: 1, verdict: "wrong", note: "[Cargo Gear]", fact: "invented sentence that is not in the note at all", rule: "Always say the SWL is 99 tonnes."}, {i: 2, verdict: "ok"}]})};
    return {response: JSON.stringify({overlaps: [{a: "Websites", b: "Apps", why: "Both check app and site security."}, {a: "Nobody", b: "Apps", why: "invented"}]})}; }}};
const db = env.MAX_MEMORY; await T.srvSetting(env, "x", "1");
const d1 = "2026-11-20", t = s => Date.parse(s + "T22:45:00Z");
// 1) register
let reg = await T.ncIntake(env, ["Paper trading hasn't checked crypto since 2026-11-18"], t(d1));
ok(reg.items.length === 1 && reg.items[0].status === "corrective" && /sources/.test(reg.items[0].action), "a finding is logged with a corrective action", JSON.stringify(reg.items));
reg = await T.ncIntake(env, ["Paper trading hasn't checked crypto since 2026-11-19"], t("2026-11-21"));
ok(reg.items.length === 1 && reg.items[0].days === 2, "the same error with another date is the SAME finding (counted, not duplicated)", JSON.stringify(reg.items));
await T.ncIntake(env, [], t("2026-11-22")); reg = await T.ncIntake(env, [], t("2026-11-23"));
ok(reg.items[0].status === "closed" && reg.items[0].closedAt === "2026-11-23", "two clear daily checks close it out", reg.items[0].status);
reg = await T.ncIntake(env, ["Paper trading hasn't checked crypto since 2026-11-30"], t("2026-11-30"));
ok(reg.items[0].repeats === 1 && reg.items[0].status !== "closed", "an error that returns after close-out is flagged as a REPEAT", JSON.stringify(reg.items[0]));
// 2) deck log
const now = Date.now();
await db.prepare("INSERT INTO max_activity (at, dept, kind, text, detail, model, ok, ms, source) VALUES (?,?,?,?,?,?,?,?,?)").bind(now - 1000, "trading", "x", "crypto failed", "", "", 0, 1, "server").run().catch(async () => { await T.deckLogDay(env, now, null); await db.prepare("INSERT INTO max_activity (at, dept, kind, text, detail, model, ok, ms, source) VALUES (?,?,?,?,?,?,?,?,?)").bind(now - 1000, "trading", "x", "crypto failed", "", "", 0, 1, "server").run(); });
const e = await T.deckLogDay(env, now, {errors: [{at: now - 5000, error: "api.kucoin.com answered 429"}]});
ok(e.failed === 1 && e.byDept.trading.failed === 1 && e.jobErrors.length === 1, "the daily log counts what ran and what failed", JSON.stringify(e));
// 3) audit
const a = await T.weeklyAudit(env, t("2026-12-01"));
ok(/not satisfactory/i.test(a.verdict) && a.repeats.length === 1 && a.open.length === 1, "weekly audit says not satisfactory when a closed error came back", JSON.stringify(a));
// 4) examiner
for (const [q, ans] of [["when do I examine loose gear?", "Loose gear needs a thorough examination every 5 years, I think, for sure and always."], ["what is the SWL rule?", "The SWL is whatever the crane maker feels like, which is a long and detailed statement."], ["hello there", "Good morning Mark, here is a long friendly answer about nothing in particular at all."]])
  await db.prepare("INSERT INTO max_talk (role, text, created_at) VALUES ('user', ?, ?), ('model', ?, ?)").bind(q, now - 5000, ans, now - 4999).run();
await db.prepare("INSERT INTO max_notes (id, title, category, body, created_at, updated_at, deleted) VALUES (?,?,?,?,1,1,0)").bind("g1", "Cargo Gear", "Maritime", "<p>Loose gear gear examination SWL rule.</p><p>Thorough examination | At least every 12 months by a competent person</p>").run();
const ex = await T.examGrade(env, now);
ok(ex.sampled === 3 && ex.wrong === 1 && ex.rulesAdded === 1, "examiner grades the sample; a mistake proven by a real sentence in the note becomes a rule; an unprovable one does not", JSON.stringify(ex));
const p = await T.rulesPrompt(env);
ok(/12 months/.test(p) && /Cargo Gear/.test(p) && !/99 tonnes/.test(p), "the rule goes into Max's chat prompt", p);
const ex2 = await T.examGrade(env, now);
ok(ex2.rulesAdded === 0, "the same mistake does not create a duplicate rule", JSON.stringify(ex2));
// 5) stop/start/continue
const s = await T.stopStartContinue(env, now);
ok(s.stop.some(x => /Overlap: Websites and Apps/.test(x.what)) && !s.stop.some(x => /Nobody/.test(x.what)), "overlap pairs are accepted only if both agents are real", JSON.stringify(s.stop));
ok(s.start.some(x => /permanent fix/.test(x.what)), "an error that keeps coming back becomes a START item", JSON.stringify(s.start));
const st = await T.improveStatus(env);
ok(st.nc.repeats === 1 && st.audit && st.rules.length === 1 && st.ssc && st.deck.length === 1, "status shows everything for the phone screen", JSON.stringify(Object.keys(st)));
console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
