// Phone: new notes — Maritime structure, formatting only on selection / Aa, pictures & videos (seen by Max, synced),
// tappable links, Save returns to the list with the note flashing.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const gem = [], analyzeTopics = [], seen = [];
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.includes("generativelanguage") && !url.includes("embed")) { const b = JSON.parse(o.body); gem.push(b); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "ok", action: null }) }] } }] })); }
  return new Response("{}", { status: 404 }); };
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8067", WK = "http://127.0.0.1:8853";
const sqlite = new DatabaseSync(":memory:");
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite) };
const cors = { "Access-Control-Allow-Origin": ORIGIN, "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "*", "Content-Type": "application/json" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x); const body = Buffer.concat(c);
  // Max "looking at" a picture or video, and filing a note: stubbed here (the real ones are tested elsewhere).
  if (req.method === "POST" && req.url === "/api/attachment") { seen.push("image"); res.writeHead(200, cors); res.end(JSON.stringify({ attachment: { summary: "A lifeboat hanging on its davits, falls slack.", details: "Lifeboat on gravity davits; hooks connected; looks like a monthly drill." } })); return; }
  if (req.method === "POST" && req.url === "/api/attachment/upload") { seen.push("video:" + req.headers["content-type"]); res.writeHead(200, cors); res.end(JSON.stringify({ attachment: { summary: "A 10-second clip of a fire drill on deck.", details: "Crew run out a fire hose." } })); return; }
  if (req.method === "POST" && req.url === "/api/analyze-note") { analyzeTopics.push(JSON.parse(body).topics); res.writeHead(200, cors); res.end(JSON.stringify({ summary: "s", analysis: "a", topic: "Maritime › IMO › Conventions", tags: ["solas"] })); return; }
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : body }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8853);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8067);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t, confidence: .9 }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 30); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; window.confirm = () => true; };
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAH0lEQVR4nGP8z0AaYCJR/aiGUQ2jGkY1jGoY1TCqgQYAMXwBH2vP4gAAAABJRU5ErkJggg==", "base64");
const imgFile = path.join(os.tmpdir(), "lifeboat.png"); fs.writeFileSync(imgFile, PNG);
const vidFile = path.join(os.tmpdir(), "drill.mp4"); fs.writeFileSync(vidFile, Buffer.alloc(40000, 7));
const newCtx = async (seed) => { const ctx = await b.newContext({ ...devices["Pixel 7"] });
  await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
    [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", ...seed }, mock.toString()]); return ctx; };
const ctx = await newCtx({});
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t); await p.waitForTimeout(80);
  await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb"); await p.waitForFunction(n => window.__spoken.length > n, n, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(300);
  await p.evaluate(() => document.getElementById("homeStop").click()); await p.waitForTimeout(100); };

await say("show my notes");
const tree = await p.evaluate(() => [...document.querySelectorAll("#noteList details.tree-folder")].map(d => d.dataset.path));
ok(["Maritime › IMO › Conventions", "Maritime › IMO › Codes", "Maritime › US Regulations › USCG & CFR", "Maritime › School Subjects › Ship Stability", "Maritime › Job by Rank › Master", "Maritime › Job by Rank › Chief Officer", "Maritime › Job by Rank › Second Officer", "Maritime › Job by Rank › Third Officer"].every(f => tree.includes(f)), "the Maritime structure is set up (IMO, US regulations, school subjects, job by rank)", tree.join(" | "));
await p.click("#newNote");
ok(!(await vis("#fmtBar")) && !(await vis("#insertMenu")) && !(await vis("#edMore")), "a new note shows no formatting buttons until they're needed");
await p.fill("#editorTitle", "Lifeboat drill");
await p.click("#editorBody"); await p.keyboard.type("Monthly lifeboat drill. Rules at https://www.imo.org/en/About/Conventions for details.");
await p.evaluate(() => { const t = document.getElementById("editorBody").firstChild; const r = document.createRange(); r.setStart(t, 0); r.setEnd(t, 7); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
await p.waitForTimeout(150);
ok(await vis("#fmtBar") && await p.evaluate(() => document.getElementById("fmtBar").classList.contains("floating")), "selecting text shows the formatting bar next to it");
await p.click('#fmtBar [data-cmd="bold"]');
ok(/<b>Monthly<\/b>|<strong>Monthly<\/strong>/.test(await p.evaluate(() => document.getElementById("editorBody").innerHTML)), "…and B makes the selected text bold");
await p.evaluate(() => getSelection().collapseToEnd()); await p.waitForTimeout(150);
ok(!(await vis("#fmtBar")), "no selection → the bar goes away");
await p.click("#fmtBtn"); ok(await vis("#fmtBar") && !(await p.evaluate(() => document.getElementById("fmtBar").classList.contains("floating"))), "Aa opens all formatting as a menu");
await p.click("#fmtBtn"); ok(!(await vis("#fmtBar")), "…and closes it");
await p.click("#insertBtn"); ok(await vis("#insPhoto") && await vis("#insVideo") && await vis("#insLink"), "＋ offers picture, video and link");
const [chooser] = await Promise.all([p.waitForEvent("filechooser"), p.click("#insPhoto")]); await chooser.setFiles(imgFile);
await p.waitForFunction(() => /lifeboat hanging/.test(document.getElementById("editorBody").innerText), null, { timeout: 8000 }).catch(() => {});
ok(await p.locator("#editorBody figure.note-media img.media-el").count() === 1, "the picture appears in the note");
ok(/📷 A lifeboat hanging on its davits/.test(await p.evaluate(() => document.getElementById("editorBody").innerText)) && await p.locator("#editorBody figure details").count() === 1, "Max looks at it and writes what he sees under it");
await p.click("#insertBtn"); const [ch2] = await Promise.all([p.waitForEvent("filechooser"), p.click("#insVideo")]); await ch2.setFiles(vidFile);
await p.waitForFunction(() => /fire drill on deck/.test(document.getElementById("editorBody").innerText), null, { timeout: 8000 }).catch(() => {});
ok(await p.locator("#editorBody figure[data-kind=video] video.media-el").count() === 1 && seen.includes("video:video/mp4"), "a video can be added too, and Max watches it", JSON.stringify(seen));
await p.click("#editorSave"); await p.waitForTimeout(500);
ok(await vis("#notesScreen") && await p.locator("#noteList .tree-note.just-saved").count() === 1, "Save goes back to the notes list with the saved note flashing");
ok(/Saved ✓ “Lifeboat drill”/.test(await p.evaluate(() => document.body.innerText)), "…and says it was saved");
const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).find(n => n.title === "Lifeboat drill"));
ok(/data-media="m/.test(saved.body) && !/<img|<video|blob:/.test(saved.body), "the note keeps the picture's place and caption, not a heavy copy", saved.body.slice(0, 300));
ok(/<a [^>]*href="https:\/\/www\.imo\.org\/en\/About\/Conventions"/.test(saved.body), "web addresses become links", saved.body);
ok(/📁|Maritime/.test(await p.evaluate(() => document.getElementById("noteList").innerText)) && analyzeTopics.length && analyzeTopics[0].includes("Maritime › Job by Rank › Third Officer"), "Max files new notes into your Maritime folders", JSON.stringify(analyzeTopics[0]?.slice(0, 5)));
await p.waitForTimeout(1500);
const rows = sqlite.prepare("SELECT id, count(*) c FROM max_media GROUP BY id").all();
ok(rows.length === 2, "the picture and video were copied to Max's database (for your laptop)", JSON.stringify(rows));
await p.locator("#noteList .tree-note", { hasText: "Lifeboat drill" }).click(); await p.waitForTimeout(600);
ok(await vis("#noteRead") && await p.locator("#readBody a.ext-link, #readBody a").first().getAttribute("href") === "https://www.imo.org/en/About/Conventions" && await p.locator("#readBody a").first().getAttribute("target") === "_blank", "in the note, the link is highlighted and opens when tapped");
ok(await p.locator("#readBody img.media-el").count() === 1 && await p.locator("#readBody video.media-el").count() === 1, "pictures and videos show in the reading view");
await p.waitForTimeout(300); await p.screenshot({ path: path.join(process.env.SHOT_DIR, "notes-read-media.png") });
await p.click("#readBody img.media-el"); ok(await vis(".media-viewer"), "tap a picture to see it full screen"); await p.click(".media-viewer");
await p.click("#readToggle"); await p.click("#editorBody a"); await p.waitForTimeout(100);
ok(await vis("#linkPop") && await p.locator("#linkPopOpen").getAttribute("href") === "https://www.imo.org/en/About/Conventions", "while editing, tapping a link shows “Open ↗”");
await p.click("#edMoreBtn"); ok(await vis("#editorAnalyze") && await vis("#editorDelete") && await vis("#exportMd"), "⋯ holds Analyze, Dictate, Export and Delete");
await p.click("#edMoreBtn");
await p.click("#editorBack"); await p.waitForTimeout(300);
await say("tell me about the boat in my lifeboat drill picture, is it ready for the drill?");
const ctxText = JSON.stringify(gem.filter(g => g.systemInstruction).at(-1) || {});
ok(/lifeboat hanging on its davits/.test(ctxText), "Max includes what's in the picture when he answers from your notes", ctxText.slice(0, 200));
await p.screenshot({ path: path.join(process.env.SHOT_DIR, "notes-media.png") });
// laptop: same notes, empty picture storage → fetched from Max's database
const notesJson = await p.evaluate(() => localStorage.getItem("max_notes_v3"));
const ctx2 = await newCtx({ max_notes_v3: notesJson }); const p2 = await ctx2.newPage(); p2.on("pageerror", e => errs.push("laptop: " + e.message));
await p2.goto(ORIGIN + "/"); await p2.waitForTimeout(1000);
await p2.evaluate(() => window.__q.push("show my notes")); await p2.click("#maxOrb"); await p2.waitForTimeout(900); await p2.evaluate(() => document.getElementById("homeStop").click());
await p2.locator("#noteList .tree-note", { hasText: "Lifeboat drill" }).click(); await p2.waitForTimeout(1500);
ok(await p2.locator("#readBody img.media-el").count() === 1, "on another device the picture comes from Max's database");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await ctx2.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
