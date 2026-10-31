// Markets: crypto (fake CoinGecko), PSE stocks (fake PSE Edge, page shaped like the real one), currencies (fake Frankfurter), charts, fallback.
let calls = [], pseDown = false;
const STOCK = `<form><input type="hidden" name="cmpy_id" value="599"><select name="security_id"><option value="520" selected>SM</option></select></form>
<table><tr><th>Status</th><td>Open</td><th>Market Capitalization</th><td>1,020,504,738,540.00</td></tr>
<tr><th>Last Traded Price</th><td>847.00</td><th>Open</th><td>842.00</td></tr>
<tr><th>Previous Close and Date</th><td>845.50 (Oct 29, 2026)</td><th>High</th><td>851.00</td></tr>
<tr><th>Change(% Change)</th><td>down 1.50 (0.18%)</td><th>Low</th><td>840.00</td></tr>
<tr><th>52-Week Low</th><td>720.00</td><th>52-Week High</th><td>901.00</td></tr></table>`;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); calls.push({ url, method: o.method || "GET", body: o.body, ua: (o.headers || {})["User-Agent"] });
  if (url.startsWith("https://api.coingecko.com/api/v3/simple/price")) return new Response(JSON.stringify({ bitcoin: { php: 5800000, usd: 99000, eur: 91000, php_24h_change: -2.5, last_updated_at: 1793400000 }, ethereum: { php: 210000, usd: 3600, eur: 3300, php_24h_change: 1.2, last_updated_at: 1793400000 } }));
  if (url.startsWith("https://api.coingecko.com/api/v3/search")) return new Response(JSON.stringify({ coins: [{ id: "kaspa", symbol: "KAS", name: "Kaspa" }] }));
  if (url.includes("/market_chart")) return new Response(JSON.stringify({ prices: Array.from({ length: 31 }, (_, i) => [1790000000000 + i * 864e5, 5000000 + i * 25000]) }));
  if (url.startsWith("https://edge.pse.com.ph/autoComplete")) { if (pseDown) return new Response("down", { status: 503 }); return new Response(JSON.stringify(/term=SM$/.test(url) ? [{ cmpyId: "154", cmpyNm: "San Miguel Corporation", symbol: "SMC" }, { cmpyId: "599", cmpyNm: "SM Investments Corporation", symbol: "SM" }, { cmpyId: "112", cmpyNm: "SM Prime Holdings, Inc.", symbol: "SMPH" }] : /term=XYZ/.test(url) ? [] : [{ cmpyId: "188", cmpyNm: "Jollibee Foods Corporation", symbol: "JFC" }])); }
  if (url.startsWith("https://edge.pse.com.ph/companyPage/stockData.do")) return new Response(STOCK);
  if (url === "https://edge.pse.com.ph/common/DisclosureCht.ax") return new Response(JSON.stringify({ chartData: [{ CLOSE: 845.5, CHART_DATE: "Oct 28, 2026 00:00:00" }, { CLOSE: 847, CHART_DATE: "Oct 29, 2026 00:00:00" }] }));
  if (url.startsWith("https://api.frankfurter.dev/v1/latest")) { const base = new URL(url).searchParams.get("base"); const r = base === "PHP" ? { USD: 0.017, EUR: 0.0157, JPY: 2.6 } : base === "USD" ? { PHP: 58.5, EUR: 0.92, JPY: 152 } : { PHP: 63.5, USD: 1.087 }; return new Response(JSON.stringify({ base, date: "2026-10-30", rates: r })); }
  if (url.startsWith("https://api.frankfurter.dev/v1/")) return new Response(JSON.stringify({ rates: { "2026-10-29": { PHP: 58.4 }, "2026-10-30": { PHP: 58.5 } } }));
  if (url.includes("generativelanguage")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"name":"SM Investments","price":850.5,"changePct":0.4,"asOf":"Oct 30, 2026 3:00 PM"}' }] } }] }));
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, body) => { const r = await w.fetch(new Request("https://x" + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify(body) }), env); return { status: r.status, data: await r.json() }; };

let r = await call("/api/market/quotes", { items: [{ symbol: "BTC" }, { symbol: "eth" }], currencies: ["PHP", "USD", "EUR"] });
const btc = r.data.quotes.find(q => q.symbol === "BTC");
ok(btc.price === 5800000 && btc.currency === "PHP" && btc.equiv.USD === 99000 && btc.equiv.EUR === 91000 && btc.changePct === -2.5, "crypto: price in pesos + dollar and euro equivalents + 24h change", JSON.stringify(btc));
ok(calls.filter(c => c.url.includes("/simple/price")).length === 1 && calls.find(c => c.url.includes("/simple/price")).url.includes("vs_currencies=php,usd,eur"), "all coins in one request (keeps under the free limit)");
r = await call("/api/market/quotes", { items: [{ symbol: "SM", kind: "pse" }], currencies: ["PHP", "USD", "JPY"] });
const sm = r.data.quotes[0];
ok(sm.symbol === "SM" && sm.name === "SM Investments Corporation" && sm.price === 847 && sm.currency === "PHP", "PSE: picks SM (not SMC or SMPH) and reads the last price", JSON.stringify(sm));
ok(sm.changePct === -0.18 && sm.change === -1.5, "“down 1.50 (0.18%)” is read as a fall, not a rise");
ok(Math.abs(sm.equiv.USD - 847 * 0.017) < 0.001 && Math.abs(sm.equiv.JPY - 847 * 2.6) < 0.01 && sm.high52 === 901 && sm.prevClose === 845.5, "PSE: dollar and yen equivalents, 52-week range, previous close");
ok(calls.filter(c => /edge\.pse/.test(c.url)).every(c => /^MaxPersonalAssistant/.test(c.ua)), "PSE Edge is asked with an honest app name (no fake browser)");
r = await call("/api/market/quotes", { items: [{ symbol: "SM", kind: "pse" }], currencies: ["USD", "PHP"] });
ok(r.data.quotes[0].currency === "USD" && Math.abs(r.data.quotes[0].price - 847 * 0.017) < 0.001 && r.data.quotes[0].equiv.PHP === 847, "show a PSE stock in dollars first if he prefers");
r = await call("/api/market/quotes", { items: [{ symbol: "XYZ", kind: "pse" }] });
ok(/No PSE company called XYZ/.test(r.data.quotes[0].error), "unknown ticker → clear message");
r = await call("/api/market/quotes", { items: [{ symbol: "KAS", kind: "crypto" }] });
ok(calls.some(c => c.url.includes("/search?query=kas")), "less common coins are looked up by name");
r = await call("/api/market/quotes", { items: [{ symbol: "USD", kind: "fx" }], currencies: ["PHP", "USD"] });
ok(r.data.quotes[0].price === 58.5 && r.data.quotes[0].currency === "PHP", "currency: 1 USD in pesos");
r = await call("/api/market/convert", { amount: 100, from: "USD", to: ["PHP", "EUR"] });
ok(r.data.values.PHP === 5850 && r.data.values.EUR === 92, "convert 100 dollars to pesos and euros");
r = await call("/api/market/convert", { amount: 0.5, from: "BTC", to: ["PHP", "USD"] });
ok(r.data.values.PHP === 2900000 && r.data.values.USD === 49500, "convert 0.5 bitcoin to pesos and dollars", JSON.stringify(r.data));
r = await call("/api/market/chart", { symbol: "BTC", days: 30, currencies: ["PHP"] });
ok(r.data.points.length === 31 && r.data.currency === "PHP" && r.data.points[0][1] === 5000000, "crypto chart: 30 days in pesos");
r = await call("/api/market/chart", { symbol: "SM", kind: "pse", days: 90, currencies: ["PHP"] });
const chartReq = JSON.parse(calls.filter(c => c.url.endsWith("DisclosureCht.ax")).at(-1).body);
ok(r.data.points.length === 2 && r.data.points[1][1] === 847 && chartReq.cmpy_id === "599" && chartReq.security_id === "520" && /^\d\d-\d\d-\d{4}$/.test(chartReq.startDate), "PSE chart: daily closes from PSE Edge (dates as MM-dd-yyyy)", JSON.stringify(chartReq));
r = await call("/api/market/chart", { symbol: "USD", kind: "fx", days: 30, currencies: ["PHP"] });
ok(r.data.points.length === 2 && r.data.currency === "PHP", "currency chart: USD → PHP");
pseDown = true;
r = await call("/api/market/quotes", { items: [{ symbol: "JFC", kind: "pse" }] });
ok(r.data.quotes[0].price === 850.5 && /web search/.test(r.data.quotes[0].source), "PSE Edge down → web search fallback, clearly labelled", JSON.stringify(r.data.quotes[0]));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
