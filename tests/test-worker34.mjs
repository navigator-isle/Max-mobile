// 22 Nov 2026: (1) crypto prices kept failing — every exchange answered 429 "too many requests" to Cloudflare. Now: wait and retry,
// ask a backup exchange for just the coin that failed, two more sources (MEXC, CryptoCompare).
// (2) No Max emails arrived for 10 days while Max said "emailed". Now every send is logged (/health "emails") and a send Gmail
// didn't accept is an error, not a silent success.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const DAY = 864e5, d0 = Math.floor(Date.now() / DAY) * DAY, iso = t => new Date(t).toISOString().slice(0, 10);
const bars = Array.from({ length: 250 }, (_, i) => ({ t: d0 - (249 - i) * DAY, c: 100 + i }));
const M = { calls: [], kucoin429: 0, refuse: new Set(), gmail: "ok" };
const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); M.calls.push(url);
  if (/binance|okx|coinbase|kraken/.test(url)) return new Response("blocked", { status: 403 });
  if (url.includes("kucoin.com")) { const sym = (url.match(/symbol=(\w+)-USDT/) || [])[1];
    if (M.kucoin429 > 0) { M.kucoin429--; return new Response("slow down", { status: 429 }); }
    if (M.refuse.has(sym)) return new Response("slow down", { status: 429 });
    return Response.json({ code: "200000", data: bars.map(b => [String(b.t / 1000), "1", String(b.c), "1", "1", "2", "3000"]).reverse() }); }
  if (url.includes("gateio.ws")) return new Response("blocked", { status: 403 });
  if (url.includes("api.mexc.com")) return Response.json(bars.map(b => [b.t, "1", "1", "1", String(b.c + 0.5), "1", b.t + DAY - 1, "9000"]));
  if (url.includes("cryptocompare.com")) return Response.json({ Response: "Success", Data: { Data: bars.map(b => ({ time: b.t / 1000, close: b.c + 0.25, volumeto: 7000 })) } });
  if (/frankfurter|er-api|currency-api/.test(url)) return Response.json({ rates: { PHP: 58 }, usd: { php: 58 } });
  if (url.startsWith("https://oauth2.googleapis.com/token")) { const p = new URLSearchParams(o.body);
    if (p.get("grant_type") === "authorization_code") return Response.json({ access_token: "AT1", expires_in: 3600, refresh_token: "RT", scope: "x", id_token: "h." + b64u({ email: "mark@example.com" }) + ".s" });
    return Response.json({ access_token: "AT2", expires_in: 3600 }); }
  if (url.includes("gmail.googleapis.com")) { if (M.gmail === "401") return Response.json({ error: { message: "no" } }, { status: 401 });
    if (M.gmail === "empty") return Response.json({}); return Response.json({ id: "18c0ffee1234", threadId: "t" }); }
  return new Response("{}", { status: 404 });
};
const mod = await import(process.argv[2]), T = mod.__test, w = mod.default;
// ---------- crypto ----------
ok(T.CRYPTO_SOURCES.length === 8 && T.CRYPTO_SOURCES.includes("mexc") && T.CRYPTO_SOURCES.includes("cryptocompare"), "crypto: main + 7 backups (MEXC and CryptoCompare added)");
for (const src of ["mexc", "cryptocompare"]) { const k = await T.cryptoCandles({ n: 0, max: 9 }, src, "BTC", 160), last = k.closed.at(-1);
  ok(k.closed.length >= 150 && last[0] < iso(Date.now()) && last[1] > 0 && k.live > 0, src + ": daily closes read right", JSON.stringify([k.closed.length, last, k.live])); }
const S = T.paperNew(); S.fxSet = true; S.books.crypto_swing.positions.push({ sym: "SOL", qty: 1, ep: 100, entry: iso(d0 - 5 * DAY), risk: 5, stop: 50 });
M.kucoin429 = 2; M.refuse = new Set(["SOL", "PAXG"]); M.calls = [];
let err = null, msg = ""; try { msg = await T.paperCryptoStep(S, { n: 0, max: 400, wait: 5, gap: 0 }, Date.now()); } catch (e) { err = e; console.log(e.stack.split("\n").slice(0,3).join(" | ")); }
ok(!err && S.cryptoSrc === "kucoin", "KuCoin says “too many requests” twice → Max waits and asks again, and it works", (err && err.message) + " " + S.cryptoSrc);
ok(!err && M.calls.some(u => /mexc\.com.*SOLUSDT/.test(u)) && M.calls.some(u => /mexc\.com.*PAXGUSDT/.test(u)), "a coin Max holds (SOL) that KuCoin refuses is fetched from a backup (MEXC) — the whole run no longer fails", (err && err.message) || "");
ok(!M.calls.some(u => /gateio\.ws.*SOL_USDT/.test(u) && M.calls.filter(x => /gateio/.test(x)).length > 2), "a backup that refuses once is not asked again for every coin");
// ---------- emails ----------
const sqlite = new DatabaseSync(":memory:"), APP = "https://navigator-isle.github.io";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: APP, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "csecret", MAX_OWNER_EMAIL: "mark@example.com" };
const call = async (path, o = {}) => { const r = await w.fetch(new Request("https://x.workers.dev" + path, { method: "GET", headers: o.h || {}, redirect: "manual" }), env); const t = await r.text(); let d = null; try { d = JSON.parse(t); } catch {} return { r, d, t }; };
let g = await call("/auth/google/start?return=" + encodeURIComponent(APP + "/Max-mobile/"));
const state = new URL(g.r.headers.get("Location")).searchParams.get("state");
await call("/auth/google/callback?code=c&state=" + encodeURIComponent(state));
let h = (await call("/health")).d;
ok(/no email sent since/.test(h.emails), "health shows when no email has been sent yet", h.emails);
let r = await T.paperSendEmail(env, "Max paper trading: BUY SPY", "hello");
h = (await call("/health")).d;
ok(r === "emailed" && /“Max paper trading: BUY SPY” sent; 1\/1 recent sends OK/.test(h.emails), "a real send is logged and shown on /health", h.emails);
M.gmail = "empty"; err = null; try { await T.paperSendEmail(env, "Max weekly summary", "x"); } catch (e) { err = e; }
h = (await call("/health")).d;
ok(err && /did not accept/.test(err.message) && /no message id from Gmail; 1\/2 recent sends OK/.test(h.emails), "Gmail answering without a message id is an error now (it used to count as “emailed”)", (err && err.message) + " | " + h.emails);
M.gmail = "401"; err = null; try { await T.paperSendEmail(env, "Max virtual investments", "x"); } catch (e) { err = e; }
h = (await call("/health")).d;
ok(err && /failed: Google/.test(h.emails), "a refused send is an error and logged as failed", (err && err.message) + " | " + h.emails);
ok(!/mark@example\.com/.test(JSON.stringify(h)), "health never shows the email address");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
