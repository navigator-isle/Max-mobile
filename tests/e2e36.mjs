// Phone: Max's trading notes (4 zips, ~770 notes) import into the app, fit in phone storage, and Max finds the right note for a question.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, zipDir] = process.argv; const dir = path.dirname(pagePath);
const ZIPS = fs.readdirSync(zipDir).filter(f => /^Max-Trading-\d.*\.zip$/.test(f)).sort().map(f => path.join(zipDir, f));
const html = fs.readFileSync(pagePath, "utf8").replace(" const isCore=", " window.__t={ctx:q=>notesContext(q)}; const isCore=");
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(f === "sw.js" ? fs.readFileSync(path.join(dir, f)) : html); }).listen(8096);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ args: ["--no-sandbox"] }); const ctx = await b.newContext({ ...devices["Galaxy S9+"] });
await ctx.addInitScript(() => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); localStorage.setItem("max_notes_migrated_v1", "1"); localStorage.setItem("max_struct_maritime_v1", "1"); }
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 5); }, cancel() {}, getVoices() { return []; } } }); window.SpeechSynthesisUtterance = function (t) { this.text = t; }; });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://127.0.0.1:8096/"); await p.waitForTimeout(1200);
// pre-fill like a real phone: the 4 core convention notes + some personal notes (~250 KB)
await p.evaluate(() => { const N = []; for (let i = 0; i < 60; i++) N.push({ id: "n" + i, title: "My note " + i, category: "Personal", tags: [], body: "<p>" + "x".repeat(4000) + "</p>", createdAt: 1, updatedAt: 1 }); localStorage.setItem("max_notes_v3", JSON.stringify(N)); });
await p.reload(); await p.waitForTimeout(1000);
const notesCount = () => p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3") || "[]").filter(n => !n.deleted).length);
await p.click("#maxOrb", { button: "right" }); await p.click("[data-go=notes]"); await p.waitForTimeout(300);
let total = 0;
for (const z of ZIPS) {
  const before = await notesCount();
  await p.click("#vaultMoreBtn"); await p.setInputFiles("#vaultInput", z); await p.waitForTimeout(2500);
  const ask = await p.locator("#homeAnswer").textContent(); const n = +(/Import (\d+) note/.exec(ask) || [])[1];
  await p.locator("#dispBody button", { hasText: "Yes" }).first().click(); await p.waitForTimeout(3000);
  const after = await notesCount(); total += n;
  ok(n > 0 && after - before === n, `${path.basename(z)}: ${n} notes imported`, ask + " | before " + before + " after " + after);
}
const used = await p.evaluate(() => { let t = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); t += k.length + localStorage.getItem(k).length; } return t; });
ok(used < 4.6e6, `phone storage used ${(used / 1e6).toFixed(2)}M of ~5.2M characters`, used);
const cats = await p.evaluate(() => [...new Set(JSON.parse(localStorage.getItem("max_notes_v3")).map(n => n.category))].filter(c => c.startsWith("Trading")).sort());
ok(cats.includes("Trading › PSE") && cats.includes("Trading › Crypto") && cats.includes("Trading › Forex") && cats.includes("Trading › Copy trading") && cats.some(c => c.startsWith("Trading › PSE › PSE stocks › ")), "folders: Trading › PSE / Crypto / Forex / Copy trading (+ PSE stocks by sector)", cats.slice(0, 12).join(" | "));
const q = await p.evaluate(() => { const a = window.__t.ctx("What dividends did BDO pay in 2024?"), c = window.__t.ctx("best crypto strategy"), f = window.__t.ctx("forex strategies best to worst");
  return { a: a.items.map(x => x.title), at: (a.items.find(x => x.title === "BDO") || {}).text || "", c: c.items.map(x => x.title), f: f.items.map(x => x.title) }; });
console.log("BDO excerpt length", q.at.length, "has 2024 line:", /2024: ₱144/.test(q.at), "\n", q.at.split("\n").filter(l => /2024|Parts/.test(l)).join("\n").slice(0, 600));
ok(q.a.includes("BDO") && /2024: ₱144/.test(q.at) && /11Mar 0\.75/.test(q.at), "question about BDO 2024 dividends → BDO note with the 2024 line", JSON.stringify(q.a.slice(0, 3)));
ok(q.c.includes("Crypto strategies best to worst"), "best crypto strategy → crypto strategy note", JSON.stringify(q.c.slice(0, 4)));
ok(q.f.includes("Forex strategies best to worst"), "forex question → forex strategy note", JSON.stringify(q.f.slice(0, 4)));
ok(!errs.length, "no page errors", errs.join(" | "));
console.log(`total imported ${total}`); await b.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
