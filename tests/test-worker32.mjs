// 11 Nov 2026: 5 categories × ₱50,000 — migration keeps every PSE stock, adds cash; new books: forex currencies, copy trading, US ETFs.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
// Virtual investments (11 Nov 2026): 4 × ₱100,000 — MP2, high-yield savings, government bonds, time deposits.
const DAY = 864e5, iso = t => new Date(t).toISOString().slice(0, 10);
globalThis.fetch = async () => new Response("{}", {status: 404});
const mod = await import(process.argv[2]), T = mod.__test;
const env = {MAX_MEMORY: new D1(new DatabaseSync(":memory:")), MAX_OWNER_EMAIL: "me@example.com"};
const g = T.GUIDE_SEED;
ok(T.vPick(g, "mp2").name === "Pag-IBIG MP2", "MP2 → Pag-IBIG MP2");
const h = T.vPick(g, "hysa"); ok(h && !/OwnBank|Group/.test(h.name) && h.rateNum === 3.5, "savings: OwnBank (₱50k cap) and group stashes left out → the best that pays on ₱100,000", h && h.name);
ok(/Treasury bills/.test(T.vPick(g, "bonds").name), "bonds: the RTB offer is closed → 1-year T-bills");
const td = T.vPick(g, "deposits"); ok(/Metrobank/.test(td.name) && T.vTermDays(td) === 180, "time deposit: Metrobank 6%, 180-day term (not-re-verified rates left out)", td.name + " " + T.vTermDays(td));
ok(T.vCap({conditions: "Basic account max ₱50,000 until upgraded"}) === 50000 && T.vCap({conditions: "first ₱100k only"}) === 100000 && T.vCap({conditions: "No cap"}) === null, "reads money caps from the conditions");
const start = iso(Date.now() - 200 * DAY);
let r = await T.investStep(env, start);
let v = await T.investView(env);
ok(v.parts.length === 4 && v.total === 400000 && v.journal.filter(e => e.kind === "OPEN").length === 4, "day 1: 4 × ₱100,000 opened", JSON.stringify(v.parts.map(p => p.product?.name)));
r = await T.investStep(env, iso(Date.now()));
v = await T.investView(env);
const p = k => v.parts.find(x => x.key === k);
ok(Math.abs(p("mp2").php - 100000 * (1 + 0.0712 * 200 / 365)) < 30 && p("mp2").taxPaid === 0, "MP2 after 200 days: about +3.9%, tax-free", p("mp2").php);
ok(Math.abs(p("hysa").php - 100000 * (1 + 0.035 * 0.8 * 200 / 365)) < 120 && p("hysa").taxPaid > 0, "savings after 200 days: 3.5% − 20% tax, paid monthly", p("hysa").php);
ok(v.journal.some(e => e.kind === "MATURED" && e.book === "deposits") && v.journal.filter(e => e.kind === "OPEN" && e.book === "deposits").length === 2, "time deposit matured after 180 days → interest credited, rolled into the best deposit then", JSON.stringify(v.journal.filter(e => e.book === "deposits").map(e => e.kind)));
ok(v.total > 400000 && v.total < 400000 * 1.04, "total grows like real interest (no magic)", v.total);
// 22 Nov 2026: each product is credited the way it really pays
ok(T.vCredit("hysa", {name: "Maya Savings"}) === "daily" && T.vCredit("hysa", {name: "MariBank Savings"}) === "daily" && T.vCredit("hysa", {name: "UNO #UNOready"}) === "daily" && T.vCredit("hysa", {name: "CIMB GSave"}) === "monthly", "savings: Maya, MariBank, UNO credit daily; others monthly");
ok(T.vCredit("bonds", {name: "RTB 32 (5 years)"}) === "quarterly payout" && T.vCredit("bonds", {name: "Treasury bills (1 year)"}) === "maturity" && T.vCredit("deposits", {name: "Metrobank TD"}) === "maturity" && T.vCredit("mp2", {}) === "yearly", "RTB pays every 3 months; T-bills and time deposits at maturity; MP2 yearly");
ok(p("hysa").credit && p("hysa").creditText && p("deposits").creditText, "the app is told how each account is credited", JSON.stringify([p("hysa").credit, p("hysa").creditText]));
{ // daily crediting compounds; an RTB coupon is paid out and does not compound
  const env2 = env; await T.srvSetting(env2, "max_invest_paper", "null");
  const g2 = JSON.parse(JSON.stringify(T.GUIDE_SEED));
  const sav = g2.cats.find(c => c.key === "savings"); sav.items = [{name: "Maya Savings", rate: "4% a year", rateNum: 4, tax: "20%", withdraw: "any day", conditions: ""}];
  const gov = g2.cats.find(c => c.key === "government"); gov.items = gov.items.filter(i => /mp2/i.test(i.name)).concat([{name: "RTB 32 (5 years)", rate: "6% a year, paid quarterly", rateNum: 6, tax: "20%", conditions: ""}]);
  await T.srvSetting(env2, "max_invest_guide", JSON.stringify(g2));
  const s0 = iso(Date.now() - 365 * DAY); await T.investStep(env2, s0); await T.investStep(env2, iso(Date.now()));
  const v2 = await T.investView(env2), q = k => v2.parts.find(x => x.key === k);
  const dailyExpect = 100000 * Math.pow(1 + 0.04 * 0.8 / 365, 365), simple = 100000 * (1 + 0.04 * 0.8);
  ok(q("hysa").product.name === "Maya Savings" && q("hysa").credit === "daily" && Math.abs(q("hysa").php - dailyExpect) < 3 && q("hysa").php > simple, "Maya credits daily → interest earns interest: 1 year at 4% (after tax) = " + q("hysa").php, q("hysa").php + " vs " + Math.round(dailyExpect));
  const coupons = v2.journal.filter(e => e.book === "bonds" && /coupon/.test(e.text));
  ok(/RTB/.test(q("bonds").product.name) && coupons.length === 4 && q("bonds").paidOut > 4700 && q("bonds").paidOut < 4900 && Math.abs(q("bonds").php - (100000 + 100000 * 0.06 * 0.8)) < 25, "RTB: 4 coupons in a year, paid out (₱1,200 each after tax), not compounded", JSON.stringify([coupons.length, q("bonds").paidOut, q("bonds").php]));
}
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
