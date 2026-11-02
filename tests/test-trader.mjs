// Paper trader engine: fees, lots, next-open fills, risk limits, cash never negative, full offline run.
import * as L from "../trader/lib.mjs";
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { execFileSync } from "node:child_process";
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
ok(Math.abs(L.fee("pse", 10000, "buy") - 29.5) < 1e-9, "COL buy fee on ₱10,000 = ₱29.50 (₱25 commission + VAT + PSE/SCCP)", L.fee("pse", 10000, "buy"));
ok(Math.abs(L.fee("pse", 10000, "sell") - 39.5) < 1e-9, "COL sell adds the 0.1% stock transaction tax", L.fee("pse", 10000, "sell"));
ok(Math.abs(L.fee("pse", 2000, "buy") - 22.7) < 1e-9, "COL minimum commission ₱20 (+VAT)", L.fee("pse", 2000, "buy"));
ok(L.fee("crypto", 1000, "buy") === 1, "Binance spot fee 0.1%");
ok(L.boardLot(8.9) === 100 && L.boardLot(37) === 100 && L.boardLot(860) === 10 && L.boardLot(1.2) === 1000 && L.boardLot(0.3) === 10000, "PSE board lots");
ok(L.roundQty("pse", 1449, 8.99) === 1400 && L.roundQty("crypto", 0.12345678, 100) === 0.123456, "quantities rounded to board lots / 6 decimals");
// synthetic market: one stock that breaks out on volume at day 260
const day = i => new Date(Date.UTC(2025, 0, 1) + i * 864e5).toISOString().slice(0, 10);
const bars = []; let p = 10;
for (let i = 0; i < 320; i++) { const up = i < 250 ? 0.002 : i === 260 ? 0.06 : 0.004; const o = p; p = p * (1 + up); bars.push([day(i), o, Math.max(o, p) * 1.005, Math.min(o, p) * 0.995, p, i === 260 ? 3e7 : 8e6]); }
const data = L.prepare({ TEST: bars }, { TEST: "middle" });
const book = L.newBook({ id: "b", market: "pse", template: "breakout", params: { N: 20, volx: 1.5, stopATR: 3, maxDays: 60, trailATR: 0, risk: 1, maxPos: 6 }, universe: ["TEST"], startCash: 100000, created: day(0) });
let prev = null, boughtOn = null;
for (const b of bars) { const ev = L.stepBook(book, L.makeCtx("pse", data, b[0], prev)); for (const e of ev) if (e.type === "buy") boughtOn = { date: b[0], price: e.price }; prev = b[0]; if (book.cash < -1e-6) break; }
ok(boughtOn && boughtOn.date === day(261), "signal on the breakout day's close → filled at the NEXT day's open", JSON.stringify(boughtOn));
ok(boughtOn && Math.abs(boughtOn.price - bars[261][1] * 1.003) < 1e-9, "fill = next open + slippage", boughtOn?.price);
ok(book.cash >= 0, "cash never negative");
const pos = book.positions.TEST; ok(pos && pos.qty % 100 === 0 && pos.qty * pos.entry <= 25000 + 1e-6, "position in board lots, at most 25% of the account", JSON.stringify(pos));
ok(pos && pos.stop > 0 && pos.stop < pos.entry, "every breakout trade has a stop below entry");
// allocation caps and drops losers
const w = L.allocate({ a: 3, b: 1, c: -1 }); ok(w.a <= 0.4 && w.b > 0 && !("c" in w) && Object.values(w).reduce((s, x) => s + x, 0) <= 1.0001, "allocation: max 40% each, losing strategies get nothing", JSON.stringify(w));
ok(Object.keys(L.allocate({ a: -1, b: -0.5 })).length === 0, "when every strategy is losing, the account stays in cash");
// mutate stays in bounds
const r = L.rng(1); let inb = true; for (let k = 0; k < 200; k++) { const q = L.mutate("breakout", { N: 20, volx: 1.5, stopATR: 3, maxDays: 60, trailATR: 0, risk: 1 }, r); const B = L.TEMPLATES.breakout.bounds; for (const [kk, [lo, hi]] of Object.entries(B)) if (q[kk] < lo || q[kk] > hi) inb = false; }
ok(inb, "researcher's variants always stay inside safe limits");
// whole runner offline on synthetic PSE + crypto data
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "trader-")); fs.mkdirSync(path.join(dir, "bars/pse"), { recursive: true }); fs.mkdirSync(path.join(dir, "bars/crypto"), { recursive: true });
const walk = (seed, start, n, vol) => { const g = L.rng(seed); let x = start; const out = []; for (let i = 0; i < n; i++) { const o = x; x = x * Math.exp((g() - 0.48) * vol); out.push([day(i), o, Math.max(o, x) * 1.01, Math.min(o, x) * 0.99, x, 5e6 + g() * 3e7]); } return out; };
const syms = ["SM", "ALI", "BDO", "AC", "ICT", "JFC", "PCOR", "CEB", "MAC", "DITO"]; syms.forEach((s, i) => fs.writeFileSync(path.join(dir, `bars/pse/${s}.json`), JSON.stringify(walk(i + 1, 10 + i * 30, 700, 0.03))));
["BTC", "ETH", "SOL", "XRP"].forEach((s, i) => fs.writeFileSync(path.join(dir, `bars/crypto/${s}.json`), JSON.stringify(walk(50 + i, 100 * (i + 1), 700, 0.05))));
fs.writeFileSync(path.join(dir, "universe.json"), JSON.stringify(Object.fromEntries(syms.map(s => [s, { cmpyId: "1", securityId: "1" }]))));
const env = { ...process.env, TRADER_OFFLINE: "1", TRADER_TODAY: day(699) };
const out = execFileSync("node", ["trader/run.mjs", "bootstrap", dir], { env, encoding: "utf8" });
const S = JSON.parse(fs.readFileSync(path.join(dir, "summary.json"), "utf8"));
ok(S.paperOnly === true && S.markets.pse?.start === 100000 && S.markets.crypto?.start > 0, "bootstrap: two pretend ₱100,000 accounts (crypto held in USDT)", JSON.stringify(Object.keys(S.markets)));
ok(S.markets.pse.strategies.length === 6 && S.markets.crypto.strategies.length === 5, "starts with 6 PSE and 5 crypto strategies, each with a backtest prior");
ok(/Paper trading started/.test(out) && S.replay?.pse && S.replay?.crypto, "test run over 2026 so far is saved and reported");
const out2 = execFileSync("node", ["trader/run.mjs", "research", dir], { env: { ...env, TRADER_TODAY: day(700) }, encoding: "utf8" });
ok(/research: tested \d+ variants/.test(out2) && /Week in review/.test(out2), "weekly researcher runs and writes a week-in-review", out2.slice(-300));
const st = JSON.parse(fs.readFileSync(path.join(dir, "state.json"), "utf8"));
const neg = Object.values(st.markets).some(m => m.master.cash < -1e-6 || Object.values(m.books).some(b => b.cash < -1e-6));
ok(!neg, "no account or strategy ever goes below zero cash");
const src = fs.readFileSync(new URL("../trader/lib.mjs", import.meta.url), "utf8") + fs.readFileSync(new URL("../trader/run.mjs", import.meta.url), "utf8");
ok(!/api\/v3\/order|signature=|X-MBX-APIKEY|apiKey|secretKey/i.test(src), "no exchange order endpoint or API key anywhere in the trader (paper only)");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
