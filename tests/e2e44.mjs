// Phone: old Word/Excel/PowerPoint files, easy folders (⋯ menu: subfolder, rename/move, delete), and a whole folder (.zip) read into notes. (was: home panels — live paper trading and the investment guide, folded on the home screen. — “how much was LTC on November 5 2025” gets the exact number from the source, on screen and spoken.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const seen = [], days = [];
let brainAsked = [];
globalThis.fetch = async (u, o = {}) => { const url = String(u);
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body), parts = b.contents.at(-1).parts;
    const inl = parts.map(x => x.inline_data || x.inlineData).filter(Boolean)[0], txt = inl ? (/^text|^application\/json/.test(inl.mime_type || inl.mimeType) ? Buffer.from(inl.data, "base64").toString("utf8") : "[" + (inl.mime_type || inl.mimeType) + "]") : "";
    const q = parts.map(x => x.text || "").join("\n"); brainAsked.push(txt + "\n" + q);
    const name = (q.match(/named "?([^"\n]+?)"?[.\n]/) || [])[1] || "file";
    const text = /^\[image/.test(txt) ? "" : txt.slice(0, 2000);
    const out = { kind: /^\[image/.test(txt) ? "photo" : "document", title: "Read " + name, topic: "Work › Inbox", summary: "SUMMARY of " + name, points: ["point about " + name], dates: [], amounts: [], text, tags: ["sms"], say: "This is " + name + "." };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(out) }] } }] })); }
  return new Response("{}", { status: 404 }); };
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8077", WK = "http://127.0.0.1:8876";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8876);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { if (q.url.split("?")[0].endsWith("/sheetjs.js")) { r.writeHead(200, { "Content-Type": "text/javascript" }); r.end(fs.readFileSync(path.join(dir, "sheetjs.js"))); return; } const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8077);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", max_notes_v3: JSON.stringify([
 { id: "n-sms1", title: "SMS overview", category: "SMS", tags: [], body: "<p>Safety management system</p>", createdAt: 1, updatedAt: 2, deleted: false },
 { id: "n-old1", title: "Old procedure", category: "SMS › Old", tags: [], body: "<p>old</p>", createdAt: 1, updatedAt: 2, deleted: false },
 { id: "n-old2", title: "Older form", category: "SMS › Old › Forms", tags: [], body: "<p>form</p>", createdAt: 1, updatedAt: 2, deleted: false },
 { id: "n-tmp", title: "Temp note", category: "Temp", tags: [], body: "<p>t</p>", createdAt: 1, updatedAt: 2, deleted: false }]), max_tree_open: JSON.stringify(["SMS", "SMS › Old"]) }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();



const FX = path.join(path.dirname(new URL(import.meta.url).pathname), "fixtures", "old-office");
const notes = () => p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3") || "[]").filter(n => !n.deleted));
const spoken = () => p.evaluate(() => window.__spoken.at(-1) || "");
const lastAsked = () => brainAsked.at(-1) || "";
// 1. old Office files are read on the phone (no more "save it as .docx")
for (const [f, mark, label] of [["bunker.doc", "OLDDOCMARK", "Word 97–2003 .doc"], ["drills.xls", "OLDXLSMARK", "Excel 97–2003 .xls"], ["training.ppt", "OLDPPTMARK", "PowerPoint 97–2003 .ppt"]]) {
  const n0 = brainAsked.length;
  await p.setInputFiles("#attachInput", path.join(FX, f));
  await p.waitForFunction(n => window.__spoken.length && true, null).catch(() => {});
  for (let i = 0; i < 40 && brainAsked.length === n0; i++) await p.waitForTimeout(150);
  await p.waitForTimeout(400);
  const asked = lastAsked();
  ok(asked.includes(mark) && !/old Office format/.test(await p.evaluate(() => window.__spoken.join(" "))), label + " → text read on the phone and sent to Max", asked.slice(0, 200));
}
ok(/Café “quotes” ñ/.test(brainAsked.find(x => x.includes("OLDDOCMARK")) || ""), ".doc keeps special characters (é, ñ, curly quotes)");
ok(/Fire,Monthly,SOLAS III\/19 OLDXLSMARK/.test(brainAsked.find(x => x.includes("OLDXLSMARK")) || ""), ".xls rows come through as rows");
ok(!/Click to edit Master/.test(brainAsked.find(x => x.includes("OLDPPTMARK")) || "x"), ".ppt: slide text only, no template junk");
// 2. folders: ⋯ menu on a folder
await p.evaluate(() => { document.getElementById("homeStop")?.click(); });
await say("show my notes"); await p.waitForTimeout(500);
ok(await vis("#notesScreen"), "notes screen open");
const menu = name => p.locator(`#noteList details.tree-folder > summary:has(span:text-is("${name}")) .f-menu`).first();
await menu("SMS").click(); await p.waitForTimeout(200);
ok(await vis("#folderSheet") && /SMS · 4 notes|SMS · 3 notes/.test(await p.locator("#fsInfo").textContent()), "⋯ on a folder opens its menu, with how many notes", await p.locator("#fsInfo").textContent());
await p.click("#fsNewSub"); await p.fill("#fsInput", "CSM SMS"); await p.click("#fsOk"); await p.waitForTimeout(300);
ok(await p.evaluate(() => JSON.parse(localStorage.getItem("max_folders") || "[]").includes("SMS › CSM SMS")) && await p.locator('#noteList details[data-path="SMS › CSM SMS"]').count() === 1, "“New folder inside” → SMS › CSM SMS appears in the tree");
await menu("Old").click(); await p.click("#fsRename"); await p.fill("#fsInput", "SMS / Archive"); await p.click("#fsOk"); await p.waitForTimeout(300);
let ns = await notes();
ok(ns.find(n => n.id === "n-old1").category === "SMS › Archive" && ns.find(n => n.id === "n-old2").category === "SMS › Archive › Forms" && await p.locator('#noteList details[data-path="SMS › Old"]').count() === 0, "rename (typed with /) moves the folder, its subfolders and notes", JSON.stringify(ns.map(n => n.category)));
await menu("Archive").click(); await p.click("#fsDelete"); await p.waitForTimeout(150);
ok(/has 2 notes/.test(await p.locator("#fsDelText").textContent()), "delete asks what to do with the notes");
await p.click("#fsDelUp"); await p.waitForTimeout(300); ns = await notes();
ok(ns.find(n => n.id === "n-old1").category === "SMS" && ns.find(n => n.id === "n-old2").category === "SMS › Forms", "“keep the notes” → folder gone, notes moved up one level", JSON.stringify(ns.map(n => n.category)));
await menu("Temp").click(); await p.click("#fsDelete"); await p.click("#fsDelAll"); await p.waitForTimeout(300);
ok(!(await notes()).some(n => n.id === "n-tmp") && await p.locator('#noteList details[data-path="Temp"]').count() === 0, "“delete the folder AND its notes” removes both");
await menu("SMS").click(); await p.screenshot({ path: process.env.SHOT_DIR + "/folder-sheet.png" }); await p.click("#fsNewNote"); await p.waitForTimeout(300);
ok(await vis("#editorScreen") && await p.inputValue("#editorCategory") === "SMS", "“New note in this folder” opens a new note already in that folder");
await p.click("#metaSummary"); await p.waitForTimeout(150);
const optsList = await p.locator("#editorFolderPick option").allTextContents();
ok(optsList.includes("SMS › CSM SMS") && optsList.some(o => /New folder/.test(o)), "editor: folder can be picked from a list (no typing ›)", optsList.join("|"));
await p.selectOption("#editorFolderPick", "SMS › CSM SMS");
ok(await p.inputValue("#editorCategory") === "SMS › CSM SMS", "picking from the list sets the folder");
await p.click("#editorBack").catch(() => {}); p.once("dialog", d => d.accept()); await p.waitForTimeout(300);
// 3. a whole folder as .zip → into SMS
if (!(await vis("#notesScreen"))) { await say("show my notes"); await p.waitForTimeout(400); }
await menu("SMS").click(); await p.click("#fsImport");
ok(await vis("#fsPickFolder") && await vis("#fsPickFiles"), "“Add files or a whole folder” offers folder or files/.zip");
const nAsk = brainAsked.length;
await p.setInputFiles("#importFilesInput", path.join(FX, "csm-sms.zip"));
await p.waitForFunction(() => window.__spoken.some(s => /^Finished:/.test(s)), null, { timeout: 30000 }).catch(() => {});
const fin = await p.evaluate(() => window.__spoken.find(s => /^Finished:/.test(s)) || "");
ns = await notes();
const imp = ns.filter(n => n.source === "import");
const byName = f => imp.find(n => n.file?.name === f);
ok(/^Finished: 4 files added to SMS\. 1 couldn’t be read: tool\.exe/.test(fin), "zip: 4 files read, the .exe skipped (junk like .DS_Store ignored)", fin);
ok(byName("bunker.doc")?.category === "SMS › CSM SMS › Section 4" && byName("drills.xls")?.category === "SMS › CSM SMS" && byName("readme.txt")?.category === "SMS › CSM SMS", "notes keep the same folders as the zip (SMS › CSM SMS › Section 4)", JSON.stringify(imp.map(n => [n.file?.name, n.category])));
ok(/OLDDOCMARK/.test(byName("bunker.doc")?.body || "") && /SUMMARY of bunker/.test(byName("bunker.doc")?.body || "") && byName("bunker.doc")?.title === "bunker", "each note has Max’s summary and the full text, titled by file name");
ok(/<figure class="note-media" data-media="m/.test(byName("photo.png")?.body || ""), "pictures are kept inside the note (viewable)");
ok(brainAsked.slice(nAsk).filter(x => /OLDXLSMARK|OLDDOCMARK|ZIPTXTMARK|\[image/.test(x)).length === 4, "Max read each file once");
// re-import → updated, not duplicated
await say("show my notes"); await p.waitForTimeout(400);
await menu("SMS").click(); await p.click("#fsImport");
await p.evaluate(() => { window.__spoken.length = 0; });
await p.setInputFiles("#importFilesInput", path.join(FX, "csm-sms.zip"));
await p.waitForFunction(() => window.__spoken.some(s => /^Finished:/.test(s)), null, { timeout: 30000 }).catch(() => {});
ok((await notes()).filter(n => n.source === "import").length === 4, "adding the same folder again updates the notes (no duplicates)");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
