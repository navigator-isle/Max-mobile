// Price on a past date: exact numbers from the source (Binance, PSE Edge, ECB, Yahoo), never from memory or notes.
let calls = [];
const T = s => Date.UTC(...s.split("-").map((x, i) => i === 1 ? x - 1 : +x));
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); calls.push(url);
  if (url.startsWith("https://data-api.binance.vision/api/v3/klines")) { const q = new URL(url).searchParams;
    if (q.get("symbol") !== "LTCUSDT") return new Response('{"code":-1121,"msg":"Invalid symbol."}', { status: 400 });
    return new Response(JSON.stringify([[T("2025-11-04"), "87.42", "88.0", "80.1", "85.20", "1"], [T("2025-11-05"), "85.20000000", "89.97000000", "82.01000000", "89.39000000", "1"]].filter(r => r[0] >= +q.get("startTime") && r[0] <= +q.get("endTime")))); }
  if (url.startsWith("https://query1.finance.yahoo.com/v8/finance/chart/")) { const sym = decodeURIComponent(url.split("/chart/")[1].split("?")[0]);
    if (sym === "GC=F") return new Response(JSON.stringify({ chart: { result: [{ meta: { currency: "USD", gmtoffset: -18000, shortName: "Gold Dec 26" }, timestamp: [1762232400, 1762318800], indicators: { quote: [{ open: [3990, 3939.5], high: [4001, 4000.699951171875], low: [3930, 3935.69995], close: [3960.5, 3992.89990234375] }] } }] } }));
    if (sym === "KAS-USD") return new Response(JSON.stringify({ chart: { result: [{ meta: { currency: "USD", gmtoffset: 0 }, timestamp: [T("2025-11-05") / 1000], indicators: { quote: [{ open: [0.06], high: [0.07], low: [0.05], close: [0.065] }] } }] } }));
    return new Response("{}", { status: 404 }); }
  if (url.startsWith("https://edge.pse.com.ph/autoComplete")) return new Response(JSON.stringify([{ cmpyId: "599", cmpyNm: "SM Investments Corporation", symbol: "SM" }]));
  if (url.startsWith("https://edge.pse.com.ph/companyPage/stockData.do")) return new Response('<select name="security_id"><option value="520" selected>SM</option></select><table><tr><th>Last Traded Price</th><td>561.00</td></tr></table>');
  if (url === "https://edge.pse.com.ph/common/DisclosureCht.ax") { const b = JSON.parse(o.body); calls.push("PSE " + b.startDate + " " + b.endDate);
    return new Response(JSON.stringify({ chartData: [{ OPEN: 701, HIGH: 705, LOW: 699, CLOSE: 702, CHART_DATE: "Dec 22, 2025 00:00:00" }, { OPEN: 706, HIGH: 712.5, LOW: 698, CLOSE: 700, CHART_DATE: "Dec 23, 2025 00:00:00" }] })); }
  if (url.startsWith("https://api.frankfurter.dev/v1/20")) { const day = url.split("/v1/")[1].slice(0, 10); return new Response(JSON.stringify({ base: "USD", date: day, rates: { PHP: 58.799 } })); }
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async body => { const r = await w.fetch(new Request("https://x/api/market/history", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ currencies: ["PHP", "USD"], ...body }) }), env); return { status: r.status, d: await r.json() }; };
let r = await call({ symbol: "LTC", kind: "crypto", date: "2025-11-05" });
ok(r.status === 200 && r.d.close === 89.39 && r.d.open === 85.2 && r.d.high === 89.97 && r.d.low === 82.01 && r.d.day === "2025-11-05" && r.d.sameDay, "LTC on 5 Nov 2025 → Binance candle: close $89.39 (open 85.20, high 89.97, low 82.01)", JSON.stringify(r.d));
ok(/Binance/.test(r.d.source) && /UTC/.test(r.d.note) && r.d.php && r.d.php.close === 5256.04 && r.d.php.rateDay === "2025-11-05", "says the source, UTC day, and the peso value at that day's rate", JSON.stringify(r.d.php));
r = await call({ symbol: "litecoin", date: "2025-11-05" });
ok(r.d.symbol === "LTC" && r.d.close === 89.39, "the coin's name works too (litecoin → LTC)", JSON.stringify(r.d));
r = await call({ symbol: "KAS", kind: "crypto", date: "2025-11-05" });
ok(r.status === 200 && r.d.close === 0.065 && /Yahoo/.test(r.d.source), "coin not on Binance → Yahoo Finance", JSON.stringify(r.d));
r = await call({ symbol: "SM", kind: "pse", date: "2025-12-25" });
ok(r.status === 200 && r.d.close === 700 && r.d.day === "2025-12-23" && r.d.sameDay === false && r.d.currency === "PHP" && !r.d.php, "SM on Christmas 2025 (no trading) → last trading day before it, 23 Dec, ₱700", JSON.stringify(r.d));
ok(calls.includes("PSE 12-13-2025 12-25-2025"), "asks PSE Edge only for the days around that date");
r = await call({ symbol: "USD", kind: "fx", date: "2025-11-05" });
ok(r.status === 200 && r.d.close === 58.799 && r.d.currency === "PHP" && /ECB/.test(r.d.source), "1 USD in pesos on 5 Nov 2025 → ECB 58.799", JSON.stringify(r.d));
r = await call({ symbol: "gold", date: "2025-11-05" });
ok(r.status === 200 && r.d.close === 3992.9 && r.d.day === "2025-11-05" && r.d.name === "Gold (futures)" && /ounce/.test(r.d.note), "gold on 5 Nov 2025 → $3,992.90 per ounce (New York day, not shifted)", JSON.stringify(r.d));
r = await call({ symbol: "LTC", date: "2030-01-01" });
ok(r.status === 502 && /future/.test(r.d.error), "a future date is refused", JSON.stringify(r.d));
r = await call({ symbol: "LTC", date: "2025-02-30" });
ok(r.status === 502 && /Which date/.test(r.d.error), "an impossible date is refused", JSON.stringify(r.d));
r = await call({ symbol: "PSEi", date: "2025-11-05" });
ok(r.status === 502 && /year/.test(r.d.error), "PSEi daily history: says honestly it can't, points to the notes", JSON.stringify(r.d));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
