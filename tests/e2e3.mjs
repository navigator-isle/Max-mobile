// New: circle screen, commands by meaning, learning, mini Max, research → edit → approve, topic tree, auto-filing, export.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import { DatabaseSync } from "node:sqlite"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { for (const s of st) /^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run(); this.db.exec("COMMIT"); } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const gem = [];
const RESEARCH = `TITLE: Ballast water exchange — BWM\nTOPIC: Maritime › Conventions › BWM\nPOINTS:\n- Ships must meet the D-2 standard [1].\n- Exchange at least 200 nm from land [2].\n- Record every operation.\nCONFLICTS:\n- Your note says 50 nm; sources say 200 nm.\nCONFIDENCE: high — IMO pages`;
globalThis.fetch = async (u, o) => {
  const b = JSON.parse(o.body); gem.push(b);
  const first = b.contents?.[0]?.parts?.[0]?.text || "";
  let text;
  if (b.tools) text = RESEARCH;
  else if (/editing a research draft/.test(first)) text = JSON.stringify({ title: "Ballast water exchange — BWM", topic: "Maritime › Conventions › BWM", points: ["Ships must meet the D-2 standard.", "Exchange at least 200 nm from land, in at least 200 m of water.", "Record every operation."], changed: [2], say: "Point 2 now includes the water depth." });
  else if (/second-brain note/.test(first)) text = JSON.stringify({ topic: /mooring/i.test(first) ? "Maritime › Mooring" : "Personal › Ideas", summary: "Summary.", analysis: "Analysis.", tags: [/mooring/i.test(first) ? "mooring" : "idea"], related: [], questions: [] });
  else { const q = b.contents.at(-1).parts[0].text;
    text = /fingers/i.test(q) ? JSON.stringify({ reply: "Sure — here's the keyboard.", action: { type: "show_keyboard", query: "" } }) :
      /pump/i.test(q) ? JSON.stringify({ reply: "Open the sea suction first, then start pump No. 2.", remember: [] }) : JSON.stringify({ reply: "Answer to: " + q, remember: [] }); }
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, groundingMetadata: b.tools ? { groundingChunks: [{ web: { uri: "https://example.org/imo", title: "imo.org" } }] } : undefined }] }));
};
const worker = (await import(workerPath)).default;
const sqlite = new DatabaseSync(":memory:"); const ORIGIN = "http://127.0.0.1:8021";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite) };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request("http://127.0.0.1:8807" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8807);
const sP = http.createServer((q, r) => { r.writeHead(200, { "Content-Type": q.url.includes("sw.js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(q.url.includes("sw.js") ? pagePath.replace(/index\.html$/, "sw.js") : pagePath)); }).listen(8021);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = [];
  class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 80); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 60); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const t0 = Date.now();
const seedNotes = JSON.stringify([
  { id: "n_ballast", title: "Ballast procedure", category: "Maritime › Ballast", tags: ["ballast", "pumps"], body: "<p>Exchange 50 nm from land. Start ballast pump No. 2 after opening the sea suction. See Ballast water record book.</p>", createdAt: t0, updatedAt: t0 },
  { id: "n_brb", title: "Ballast water record book", category: "Maritime › Ballast", tags: ["ballast"], body: "<p>Record every ballast operation.</p>", createdAt: t0, updatedAt: t0 - 1 },
  { id: "n_moor", title: "Mooring winch checks", category: "Maritime › Mooring", tags: ["mooring"], body: "<p>Check brakes.</p>", createdAt: t0, updatedAt: t0 - 2 },
  { id: "n_fam", title: "Family birthdays", category: "Personal", tags: [], body: "<p>Ana in March.</p>", createdAt: t0, updatedAt: t0 - 3 },
  { id: "n_u1", title: "Mooring rope idea", category: "Unsorted", tags: [], body: "<p>Mooring rope inspection idea.</p>", createdAt: t0, updatedAt: t0 - 4 },
  { id: "n_u2", title: "App idea", category: "Unsorted", tags: [], body: "<p>A new app.</p>", createdAt: t0, updatedAt: t0 - 5 }]);
const ctx = await b.newContext({ ...devices["Pixel 7"], acceptDownloads: true });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: "http://127.0.0.1:8807", max_pass: "pw", max_notes_v3: seedNotes, max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1500);
const vis = sel => p.locator(sel).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  if (await vis("#maxOrb")) await p.click("#maxOrb"); else await p.click("#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n, n, { timeout: 15000 }).catch(() => {});
  await p.evaluate(() => document.getElementById("homeStop").click()); await p.waitForTimeout(150); };
const lastSpoken = () => p.evaluate(() => window.__spoken.at(-1));

// 1. default: just the circle
ok(await vis("#maxOrb") && !(await vis("#typeRow")) && !(await vis("#miniMax")) && !(await vis("#homeTalk")), "default screen: only the circle (no keyboard, no buttons)");
const px = async () => p.evaluate(() => { const c = document.getElementById("orbCanvas"); return c.toDataURL().length + ":" + c.getContext("2d").getImageData(c.width / 2 + Math.round(c.width * 0.41), c.height / 2, 1, 1).data.join(","); });
const f1 = await px(); await p.waitForTimeout(400); const f2 = await px();
ok(f1 !== f2, "circle is animated (dots move)");
await p.screenshot({ path: process.env.SHOT_DIR + "/v3-home.png" });

// 2. commands understood on the phone (no AI call)
let g = gem.length; await say("could you bring up the keyboard");
ok(await vis("#typeRow") && gem.length === g, "“could you bring up the keyboard” → keyboard, instantly (no AI)");
await say("I don't need the keyboard anymore");
ok(!(await vis("#typeRow")), "“I don’t need the keyboard anymore” → hidden");

// 3. new wording → AI understands → Max learns it
g = gem.length; await say("I wanna use my fingers for this one");
ok(await vis("#typeRow") && gem.length === g + 1 && gem.at(-1).systemInstruction.parts[0].text.includes("APP CONTROL"), "unusual wording understood by the AI → keyboard");
await say("hide keyboard"); g = gem.length;
await say("I wanna use my fingers for this one");
ok(await vis("#typeRow") && gem.length === g, "same wording again works instantly — Max learned it");
await say("voice only");

// 4. notes by voice, Max minimized
await say("pull up what I have on ballast in my notes");
ok(await vis("#notesScreen") && await vis("#miniMax") && await p.inputValue("#notesSearch") === "ballast", "notes opened by voice, search filled, Max minimized at the top");
ok((await lastSpoken()).includes("2 notes about ballast") && (await p.locator("#miniSay").textContent()).includes("2 notes"), "Max says how many he found (subtitle in mini Max)", await lastSpoken());
await p.fill("#notesSearch", ""); await p.dispatchEvent("#notesSearch", "input");
const tops = await p.locator(".topic > summary > span:first-child").allTextContents();
ok(tops[0] === "Maritime" && tops.at(-1) === "Unsorted" && tops.includes("Personal"), "notes grouped by topic like Obsidian (Unsorted last)", tops.join(","));
ok(await p.locator(".sub-name", { hasText: "Ballast" }).count() === 1 && await p.locator(".sub-name", { hasText: "Mooring" }).count() === 1, "subtopics inside Maritime");
await p.screenshot({ path: process.env.SHOT_DIR + "/v3-notes.png" });

// 5. talk from mini Max: open a note
await say("open the ballast procedure note");
ok(await vis("#editorScreen") && await p.inputValue("#editorTitle") === "Ballast procedure", "“open the ballast procedure note” → note opens");
ok(await p.locator("#editorLinks button", { hasText: "Ballast water record book" }).count() === 1, "linked notes shown (Obsidian-style)");
// export this note
const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#exportMd")]);
const md = fs.readFileSync(await dl.path(), "utf8");
ok(dl.suggestedFilename() === "Ballast procedure.md" && md.startsWith("---\ntitle: \"Ballast procedure\"") && md.includes("topic: \"Maritime › Ballast\"") && md.includes("[[Ballast water record book]]") && md.includes("Start ballast pump No. 2"), "export to Obsidian .md with topic, tags and [[links]]", md.slice(0, 200));

// 6. notes-first answer with reference
await say("just talk");
ok(await vis("#homeScreen"), "“just talk” → back to the circle");
await say("Which ballast pump do I start?");
ok(await p.locator("#noteRefs button", { hasText: "Ballast procedure" }).count() === 1 && gem.at(-1).systemInstruction.parts[0].text.includes("USER'S NOTES"), "answer shows which note it came from (notes first)");
await p.click("#noteRefs button"); await p.waitForTimeout(200);
ok(await vis("#editorScreen"), "tap the reference to open that note");
await p.click("#miniHome");

// 7. research → edit by voice → approve
await say("look up the ballast water exchange rules for me");
ok(await vis("#researchScreen") && await vis("#miniMax") && (await p.locator("#resPoints li").count()) === 3, "research screen with findings, Max minimized");
ok(gem.at(-1).tools?.[0]?.google_search && (await p.locator("#resSources .src").count()) >= 2 && (await p.locator("#resSources", { hasText: "OFFICIAL" }).count()) === 1, "Max searched the web; sources shown with OFFICIAL / MY NOTE labels");
ok(await vis("#resConflicts") && (await p.locator("#resConflicts").textContent()).includes("50 nm"), "difference with your own note flagged");
ok(sqlite.prepare("SELECT count(*) c FROM max_notes WHERE title LIKE 'Ballast water exchange%'").get().c === 0, "nothing saved to notes before you approve");
await p.screenshot({ path: process.env.SHOT_DIR + "/v3-research.png" });
await say("change point 2 to include the 200 metre depth");
ok((await p.locator("#resPoints li.changed").textContent()).includes("200 m of water") && (await lastSpoken()).includes("Point 2"), "voice edit applied and highlighted");
await say("looks good, save it");
ok(await vis("#editorScreen") && (await p.locator("#editorBadge").textContent()).includes("Research ✓") && await p.inputValue("#editorCategory") === "Maritime › Conventions › BWM", "approve → saved as a research note under the right topic");
await p.waitForTimeout(2500);
ok(sqlite.prepare("SELECT count(*) c FROM max_notes WHERE title='Ballast water exchange — BWM' AND deleted=0").get().c === 1, "approved research synced to the database");

// 8. Max files new notes and organizes old ones
await p.click("#maxOrb", { button: "right" }).catch(() => {}); // not visible here; use menu from home
await p.click("#miniHome"); await p.click("#maxOrb", { button: "right" });
ok(await vis("#quickMenu"), "hold the circle → menu (Keyboard, Notes, Research, Settings)");
await p.click("[data-go=notes]"); await p.click("#newNote");
await p.fill("#editorTitle", "Mooring line wear"); await p.click("#editorBody"); await p.keyboard.type("Mooring lines showing wear at the fairlead.");
await p.click("#editorSave"); await p.waitForTimeout(1200);
ok(await p.inputValue("#editorCategory") === "Maritime › Mooring" && (await p.locator("#editorBadge").textContent()).includes("filed by Max"), "new Unsorted note filed into a topic by Max");
await p.click("#miniHome"); await say("could you organise my notes");
await p.waitForFunction(() => /filed/.test(document.getElementById("organizeBanner").textContent), null, { timeout: 10000 }).catch(() => {});
const cats = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).filter(n => !n.deleted).map(n => n.title + "=" + n.category));
ok(!cats.some(c => c.endsWith("=Unsorted")) && cats.includes("Mooring rope idea=Maritime › Mooring"), "“organise my notes” → all unsorted notes filed", cats.join(" | "));
// export all
const [dl2] = await Promise.all([p.waitForEvent("download"), p.click("#exportAll")]);
const all = fs.readFileSync(await dl2.path(), "utf8");
ok(/^Max-notes-\d{4}-\d\d-\d\d\.md$/.test(dl2.suggestedFilename()) && all.includes("## Maritime › Ballast") && all.includes("### Family birthdays"), "export all notes as one file, grouped by topic");

// 9. settings shows learned phrases
await p.click("#openConnection"); await p.waitForTimeout(300);
ok((await p.locator("#learnedList").textContent()).includes("i wanna use my fingers for this one"), "settings lists phrases Max learned, each can be forgotten");
await p.locator("#learnedList button").first().click();
ok(!(await p.locator("#learnedList").textContent()).includes("fingers"), "forget a learned phrase");
await p.click("#closeConnection");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
