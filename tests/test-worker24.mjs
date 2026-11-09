// Shopping agent (Deal Finder): every Sunday it re-checks watched products on the stores' own pages and reports confirmed prices.
import { DatabaseSync } from "node:sqlite";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); return o; } }
let prompts = [];
globalThis.fetch = async (u, o = {}) => {
  u = String(u); const J = x => new Response(JSON.stringify(x), { headers: { "content-type": "application/json" } });
  if (u.includes("generativelanguage")) { const t = JSON.parse(o.body).contents.map(c => c.parts.map(p => p.text || "").join("")).join("\n"); prompts.push(t);
    if (/Best buy now in the Philippines/.test(t)) return J({ candidates: [{ content: { parts: [{ text: "Beyond the Box ₱39,990 https://beyondthebox.ph/products/ipad-air-11-m4 ; Lazada ₱38,500" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://www.lazada.com.ph/products/ipad.html", title: "Lazada" } }] } }] });
    if (/writing your weekly report/.test(t)) return J({ candidates: [{ content: { parts: [{ text: JSON.stringify({ status: ["1 product watched"], details: ["iPad Air M4: lowest confirmed ₱39,990 at beyondthebox.ph"], todo: [], sources: [] }) }] } }] });
    return J({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }); }
  if (u === "https://beyondthebox.ph/products/ipad-air-11-m4.js") return J({ title: "iPad Air 11-inch (M4)", variants: [{ title: "Wi-Fi / 128GB", price: 3999000, compare_at_price: null, available: true }, { title: "Wi-Fi / 256GB", price: 4599000, compare_at_price: null, available: true }] });
  if (u.includes("lazada")) return new Response("<html>robot</html>", { headers: { "content-type": "text/html" } });
  return new Response("{}", { status: 404 });
};
const { default: w } = await import(process.argv[2]);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", MAX_MEMORY: new D1(new DatabaseSync(":memory:")) };
const H = { "Content-Type": "application/json", "X-Max-Pass": "p" };
await w.fetch(new Request("https://x/api/sync", { method: "POST", headers: H, body: JSON.stringify({ notes: [], memories: [], settings: [{ key: "max_deals", value: JSON.stringify({ items: { ipad: { q: "iPad Air M4 Wi-Fi 128GB", watch: true, history: [{ at: Date.now() - 7 * 864e5, low: 41990 }] }, tv: { q: "Samsung TV", watch: false, history: [] } } }), updated: Date.now() }] }) }), env);
const r = await w.fetch(new Request("https://x/api/agents/run", { method: "POST", headers: H, body: JSON.stringify({ agent: "shopping", email: false }) }), env);
const d = await r.json(); const rep = d.report || {}; if (process.env.DBG) console.log(JSON.stringify(d).slice(0, 1500), prompts.length);
const t = JSON.stringify(rep.tables || []);
ok(r.status === 200 && rep.agent === "shopping" || rep.id === "shopping" || /Shopping/.test(d.rendered || ""), "Shopping agent runs and writes a report", JSON.stringify(d).slice(0, 300));
ok(/39,990/.test(t) && /beyondthebox\.ph/.test(t) && /128GB/.test(t), "report table has the confirmed price read from the store page (₱39,990, exact version)", t.slice(0, 300));
ok(!/38,500/.test(t), "the Lazada price from the search text is NOT shown as confirmed");
ok(prompts.filter(p => /Best buy now in the Philippines/.test(p)).length === 1, "only watched products are checked (1 of 2)");
const wr = prompts.find(p => /writing your weekly report/.test(p)) || "";
ok(/lastWeekLowest/.test(wr) && /41990/.test(wr) && /notConfirmed/.test(wr), "the report writer sees last week's price and the not-confirmed list");
const list = await (await w.fetch(new Request("https://x/api/agents", { headers: H }), env)).json();
ok((list.agents || []).some(a => a.id === "shopping" && /Sun/.test(a.reportDay || "Sun")), "Shopping is listed with Max's agents (weekly, Sunday)", JSON.stringify(list).slice(0, 200));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
