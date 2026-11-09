// Deal Finder price check: reads the exact version's price from the store's own page (Shopify product data, JSON-LD), flags what it can't confirm.
globalThis.fetch = async (u) => {
  u = String(u); const J = (o) => new Response(JSON.stringify(o), { headers: { "content-type": "application/json" } });
  if (u === "https://beyondthebox.ph/products/ipad-air-11-m4.js") return J({ title: "iPad Air 11-inch (M4)", variants: [
    { title: "Wi-Fi / 128GB / Space Gray", price: 3999000, compare_at_price: null, available: true },
    { title: "Wi-Fi / 256GB / Space Gray", price: 4599000, compare_at_price: 4799000, available: true },
    { title: "Wi-Fi + Cellular / 128GB / Space Gray", price: 4899000, compare_at_price: null, available: false }] });
  if (u === "https://www.abenson.com/ipad-air-m4.html") return new Response(`<html><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Apple iPad Air 11 M4 Wi-Fi 128GB","offers":{"@type":"Offer","price":"39490","priceCurrency":"PHP","availability":"https://schema.org/InStock"}}</script></html>`, { headers: { "content-type": "text/html" } });
  if (u.includes("lazada")) return new Response("<html>robot check</html>", { headers: { "content-type": "text/html" } });
  if (u.startsWith("https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc")) { const r = new Response("", { status: 200 }); Object.defineProperty(r, "url", { value: "https://beyondthebox.ph/products/ipad-air-11-m4" }); return r; }
  return new Response("nope", { status: 404 });
};
const { default: w } = await import(process.argv[2]);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" };
const call = async (product, urls) => (await (await w.fetch(new Request("https://x/api/deal/check", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify({ product, urls }) }), env)).json());
let d = await call("iPad Air M4 11-inch Wi-Fi 128GB", ["https://beyondthebox.ph/products/ipad-air-11-m4?variant=1", "https://www.abenson.com/ipad-air-m4.html", "https://www.lazada.com.ph/products/x.html", "http://127.0.0.1/x"]);
const bb = d.results.find(r => r.store === "beyondthebox.ph"), ab = d.results.find(r => r.store === "abenson.com"), lz = d.results.find(r => /lazada/.test(r.store));
ok(bb && bb.confirmed && bb.price === 39990 && /128GB/.test(bb.variant) && !/Cellular/.test(bb.variant), "Shopify store: picks the exact version asked (Wi-Fi 128GB) → ₱39,990", JSON.stringify(bb));
ok(ab && ab.confirmed && ab.price === 39490 && ab.available === true, "store with product data (JSON-LD): ₱39,490, in stock", JSON.stringify(ab));
ok(lz && !lz.confirmed && /open the link/.test(lz.note), "Lazada/Shopee: not confirmed, says to open the link", JSON.stringify(lz));
ok(d.results.length === 3 && !d.results.some(r => /127\.0\.0\.1/.test(r.url)), "never opens non-store addresses (127.0.0.1, http)");
ok(d.results.every(r => /^\d{4}-\d\d-\d\dT/.test(r.readAt)), "every price has the time it was read");
d = await call("iPad Air M4", ["https://beyondthebox.ph/products/ipad-air-11-m4"]);
ok(!d.results[0].confirmed && /3 versions/.test(d.results[0].note) && /39,990–₱48,990/.test(d.results[0].note), "version not given → not confirmed, shows the price range and asks to pick the version", JSON.stringify(d.results[0]));
d = await call("iPad Air M4 256GB", ["https://beyondthebox.ph/products/ipad-air-11-m4"]);
ok(d.results[0].confirmed && d.results[0].price === 45990 && d.results[0].was === 47990, "256GB → ₱45,990 (was ₱47,990)");
d = await call("iPad Air M4 Wi-Fi 128GB", ["https://vertexaisearch.cloud.google.com/grounding-api-redirect/abc"]);
ok(d.results[0].confirmed && d.results[0].store === "beyondthebox.ph" && d.results[0].price === 39990, "Google search redirect links are followed to the real store page", JSON.stringify(d.results[0]));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
