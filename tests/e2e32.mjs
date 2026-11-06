// Phone: long core notes (SOLAS, MARPOL, STCW, MLC) — Max gets the sections that match the question, and core notes rank first.
import http from "node:http"; import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerSrc] = process.argv;
const src = fs.readFileSync(workerSrc, "utf8"), i = src.indexOf("const SEED_NOTES = ");
const seeds = JSON.parse(src.slice(i + 19, src.indexOf(";\n", i))).map(({ v, ...n }) => ({ ...n, createdAt: Date.now() - 1e6, updatedAt: Date.now() - 1e6 }));
const other = { id: "n-x", title: "Pilot ladder story", category: "Personal", tags: [], body: "<p>Funny pilot ladder story from Singapore.</p>", createdAt: Date.now(), updatedAt: Date.now() };
const html = fs.readFileSync(pagePath, "utf8").replace(" const isCore=", " window.__t={ex:(...a)=>noteExcerpt(...a),ctx:q=>notesContext(q)}; const isCore=");
if (!html.includes("window.__t=")) { console.log("FAIL hook not injected"); process.exit(1); }
const srv = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": "text/html" }); r.end(html); }).listen(8091);
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([notes]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); localStorage.setItem("max_notes_migrated_v1", "1"); localStorage.setItem("max_notes_v3", JSON.stringify(notes)); } }, [[...seeds, other]]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://127.0.0.1:8091/"); await p.waitForTimeout(900);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const r = await p.evaluate(() => {
  const N = JSON.parse(localStorage.getItem("max_notes_v3")), by = id => N.find(n => n.id === id);
  const c1 = window.__t.ctx("SOLAS chapter 5 regulation 23 pilot ladder");
  return {
    pilot: window.__t.ex(by("note-solas-1974"), "what does SOLAS chapter 5 reg 23 say about pilot ladders"),
    sox: window.__t.ex(by("note-marpol-7378"), "MARPOL annex vi sulphur limit"),
    rest: window.__t.ex(by("note-stcw-1978"), "STCW rest hours"),
    mlc: window.__t.ex(by("note-mlc-2006"), "MLC repatriation"),
    short: window.__t.ex(N.find(n => n.id === "n-x"), "pilot"),
    ctxTitles: c1.items.map(x => x.title), ctxSolas: (c1.items.find(x => x.title === "SOLAS 1974") || {}).text || ""
  };
});
ok(r.pilot.length <= 4800 && /V\/23 Pilot transfer|Reg 23 Pilot transfer/i.test(r.pilot) && /MSC\.572\(110\)/.test(r.pilot) && /What is SOLAS/.test(r.pilot), "SOLAS V/23 question → Ch V part with pilot transfer is sent, plus the 'What is' opening", r.pilot.length + " " + r.pilot.replace(/\n/g," | ").slice(-1500));
ok(/Reg 14 SOx/.test(r.sox) && r.sox.length <= 4800, "MARPOL Annex VI sulphur question → Annex VI Reg 14 is sent", r.sox.replace(/\n/g," | ").slice(0, 1500));
ok(/VIII\/1 Fitness for duty/.test(r.rest), "STCW rest hours → Ch VIII is sent");
ok(/Reg 2\.5 Repatriation/.test(r.mlc), "MLC repatriation → Title 2 is sent", r.mlc.slice(0, 300) + " … len " + r.mlc.length);
ok(r.short === "Funny pilot ladder story from Singapore.", "short notes are sent whole");
ok(r.ctxTitles[0] === "SOLAS 1974", "core SOLAS note ranks first for a SOLAS question", JSON.stringify(r.ctxTitles));
ok(/MSC\.572\(110\)/.test(r.ctxSolas), "the note given to Max includes the pilot-transfer resolution");
ok(!errs.length, "no page errors", errs.join(" | "));
await b.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
