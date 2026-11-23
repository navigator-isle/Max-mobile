// 23 Nov 2026 (Mark): crypto prices must never stop. A source that answers 429/403 is dropped at once and the next one takes over;
// if the hour's request limit runs out, Max carries on next hour (no failure); deep review is gone and its text is cleaned out of notes.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { if (a.length > 100) throw new Error("D1: too many SQL variables"); return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); } async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const M = {calls: [], blocked: new Set(["kucoin.com", "binance.vision"]), okx: 0};
const line = (n, f) => Array.from({length: n}, (_, i) => f(n - i));
const px = s => 100 + (s.charCodeAt(0) % 7) * 10;
globalThis.fetch = async (u, init = {}) => {
  const url = String(u); M.calls.push(url);
  for (const h of M.blocked) if (url.includes(h)) return new Response("busy", {status: 429});
  if (url.includes("okx.com/api/v5/market/candles")) { M.okx++; const sym = url.match(/instId=(\w+)-USDT/)[1], lim = +url.match(/limit=(\d+)/)[1], n = Math.min(lim, 260);
    const rows = line(n, k => [String(Math.floor((Date.now() - k * 864e5) / 864e5) * 864e5), "1", "1", "1", String(px(sym) + (260 - k) * (sym === "BTC" ? 100 : 0.1)), "0", "0", "1e8", "1"]);
    return Response.json({code: "0", data: [...rows].reverse()}); }
  if (url.includes("frankfurter")) return Response.json({rates: {PHP: 58, CAD: 1.4}});
  return new Response("{}", {status: 404});
};
const mod = await import(process.argv[2]), T = mod.__test;
const env = {GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:"))};
const today = new Date().toISOString().slice(0, 10);
let S = await T.paperLoad(env); S.cryptoSrc = "kucoin";                       // the source that worked last, now refusing
let ctx = {n: 0, max: 38, gap: 0};
let msg = await T.paperCryptoStep(S, ctx, today);
ok(/OKX|Coinbase|Kraken|Gate|MEXC|CryptoCompare|Bitget|Bybit/.test(msg) && S.cryptoPartial === false && S.cryptoWork === null, "KuCoin and Binance answer 429 → the next working source takes over and the check finishes", msg);
ok(M.calls.filter(u => u.includes("kucoin")).length <= 2 && M.calls.filter(u => u.includes("binance.vision")).length <= 2, "a refusing source is asked once, not retried for every coin", M.calls.filter(u => /kucoin|binance/.test(u)).length);
ok(S.cryptoSrc && S.cryptoSrc !== "kucoin" && S.books.btc_trend && ctx.n < 38, "the working source is remembered for next time", S.cryptoSrc + " " + ctx.n);
// request limit runs out → progress is saved, not a failure; the next hour finishes
S = await T.paperLoad(env); M.calls = []; S.cryptoWork = null; S.cryptoSrc = "okx";
ctx = {n: 0, max: 8, gap: 0};
msg = await T.paperCryptoStep(S, ctx, today);
ok(S.cryptoPartial === true && /continuing next hour/.test(msg) && S.cryptoWork && Object.keys(S.cryptoWork.U).length >= 3, "out of requests → partial progress is kept and Max continues next hour", msg);
ctx = {n: 0, max: 60, gap: 0}; msg = await T.paperCryptoStep(S, ctx, today);
ok(S.cryptoPartial === false && S.cryptoWork === null && /crypto:/.test(msg), "the next hour finishes the job", msg);
// all sources blocked → a clear error naming every source
M.blocked = new Set(["okx.com", "coinbase.com", "kraken.com", "kucoin.com", "gateio.ws", "mexc.com", "cryptocompare.com", "bitget.com", "bybit.com", "binance.vision"]);
S = await T.paperLoad(env); S.cryptoWork = null; let err = ""; try { await T.paperCryptoStep(S, {n: 0, max: 38, gap: 0}, today); } catch (e) { err = e.message; }
ok(/no source gave BTC/.test(err) && /OKX/.test(err) && /Bybit/.test(err), "every source refusing → one clear error that names them all", err);
// ---------- deep review is gone; its text is cleaned out, old version kept ----------
const db = await T.brainDb(env);
await db.prepare("INSERT INTO max_notes (id, title, category, body, created_at, updated_at, deleted) VALUES (?,?,?,?,1,1,0)").bind("n1", "SOLAS", "Maritime", "<p>Mark text</p><hr><p><b>Added by Max — deep review 2026-11-23</b></p><p><b>Extra</b></p><ul><li>x</li></ul><p><b>Sources (checked 2026-11-23)</b></p><ul><li>a — https://x</li></ul>").run();
const n = await T.deepCleanup(env);
const row = await db.prepare("SELECT body FROM max_notes WHERE id = 'n1'").first();
ok(n === 1 && row.body === "<p>Mark text</p>", "the deep-review text is removed and Mark's own text stays", JSON.stringify(row));
const ver = await db.prepare("SELECT body, reason FROM max_note_versions WHERE note_id = 'n1' ORDER BY vid DESC LIMIT 1").first().catch(() => null);
ok(ver && /deep review/.test(ver.body), "the old version is kept (Undo works)", JSON.stringify(ver));
ok((await T.deepCleanup(env)) === 0, "the clean-up runs only once");
console.log(pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0);
