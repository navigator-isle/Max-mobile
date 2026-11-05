// Phone: Obsidian-style vault — folder tree, reading view, [[links]], importing a vault zip, exporting it back.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath] = process.argv;
const ZIP = new URL("./fixtures/vault.zip", import.meta.url).pathname;
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8095);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"], acceptDownloads: true });
await ctx.addInitScript(() => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); localStorage.setItem("max_notes_migrated_v1", "1"); localStorage.setItem("max_struct_maritime_v1", "1"); }
  window.__spoken = []; window.__q = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://127.0.0.1:8095/"); await p.waitForTimeout(1200);
const notesCount = () => p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3") || "[]").filter(n => !n.deleted).length);
await p.click("#maxOrb", { button: "right" }); await p.click("[data-go=notes]"); await p.waitForTimeout(300);
ok(await p.locator(".vault-bar #newNote").isVisible() && await p.locator("#newFolder").isVisible() && /0 files, 0 folders/.test(await p.locator("#vaultStats").textContent()), "vault screen: toolbar (new note, new folder, sort, collapse, more) and “My vault · 0 files”");
// import
await p.click("#vaultMoreBtn"); await p.setInputFiles("#vaultInput", ZIP); await p.waitForTimeout(800);
ok(/Import 7 notes in 9 folders\?/.test(await p.locator("#homeAnswer").textContent()) && await notesCount() === 0, "asks before importing: 7 notes in 9 folders", await p.locator("#homeAnswer").textContent());
await p.locator("#dispBody button", { hasText: "Yes" }).first().click(); await p.waitForTimeout(600);
ok(await notesCount() === 7 && /7 files, 9 folders/.test(await p.locator("#vaultStats").textContent()), "after yes: 7 notes, 9 folders (settings and pictures skipped)", await p.locator("#vaultStats").textContent());
ok(/skipped 1 file/.test(await p.locator("#homeAnswer").textContent()), "says what it skipped");
ok(await p.locator('.tree-folder[data-path="Work › Ship\'s Apps and Tool › AMOS"]').count() === 1 && await p.locator('.tree-folder[data-path="Work › Chief Officer"]').count() === 1 && await p.locator('.tree-folder[data-path="Maritime › IMO › Conventions"]').count() === 1, "folders kept at any depth, empty folders too (Work › Chief Officer)");
ok(await p.locator('.tree-folder[data-path="My vault"]').count() === 0 && await p.locator(".tree-folder > summary", { hasText: ".obsidian" }).count() === 0, "the vault's own folder name and .obsidian are not shown as folders");
const kids = await p.locator('.tree-folder[data-path="Maritime › IMO"] > .tree-kids > *').allTextContents();
ok(kids[0].startsWith("Codes") && kids[1].startsWith("Conventions") && kids.at(-1).startsWith("IMO"), "folders first, then notes, A to Z (like Obsidian)", kids.join(" | "));
// reading view
await p.locator(".tree-note", { hasText: "Monthly Reports (AMOS)" }).click(); await p.waitForTimeout(300);
ok(await p.locator("#noteRead").isVisible() && !(await p.locator("#editorBody").isVisible()), "opening a note shows the reading view");
ok((await p.locator("#readPath").textContent()) === "Work / Ship's Apps and Tool / AMOS" && (await p.locator("#readTitle").textContent()) === "Monthly Reports (AMOS)", "folder path and big title");
ok(await p.locator("#readBody ol > li").count() === 10 && await p.locator("#readBody b", { hasText: "GOF-06.4 Water Testing Record" }).count() === 1 && await p.locator("#readBody i", { hasText: "(left AMOS Toolbar)" }).count() === 1, "numbered steps, bold and italic kept");
await p.locator("#readBody .wikilink", { hasText: "AMOS" }).click(); await p.waitForTimeout(300);
ok((await p.locator("#readTitle").textContent()) === "AMOS" && /☐ Weekly update/.test(await p.locator("#readBody").textContent()) && /☑ Monthly report/.test(await p.locator("#readBody").textContent()), "[[AMOS]] link opens that note; tasks show as ☐ / ☑");
await p.click("#editorBack"); await p.locator(".tree-note", { hasText: "SOLAS" }).click(); await p.waitForTimeout(200);
ok(/#convention/.test(await p.locator("#readTags").textContent()) && await p.locator("#readBody ul ul li", { hasText: "Lifeboat drills monthly" }).count() === 1, "tags from the note's properties, nested bullets");
await p.click("#editorBack"); await p.locator(".tree-note", { hasText: "MARPOL" }).click(); await p.waitForTimeout(200);
ok(await p.locator("#readBody table tr").count() === 3 && await p.locator("#readBody th").count() === 2, "tables come through");
await p.click("#editorBack"); await p.locator(".tree-note", { hasText: "Sea Service" }).click(); await p.waitForTimeout(200);
ok(await p.locator("#readBody pre", { hasText: "Vessel A" }).count() === 1, "code blocks kept");
// edit
await p.click("#readToggle");
ok(await p.locator("#editorBody").isVisible() && !(await p.locator("#noteRead").isVisible()) && await p.inputValue("#editorCategory") === "Work › Personal Records", "✎ Edit switches to editing (folder = topic)");
await p.click("#editorBody"); await p.keyboard.press("End"); await p.keyboard.type(" Updated."); await p.click("#editorSave"); await p.waitForTimeout(200);
ok(await p.locator("#notesScreen").isVisible(), "Save goes back to the notes list");
await p.locator(".tree-note", { hasText: "Sea Service" }).click(); await p.waitForTimeout(200); ok(/Updated\./.test(await p.locator("#readBody").textContent()), "saved edits show in reading view");
// re-import doesn't duplicate
await p.click("#editorBack"); await p.waitForTimeout(150); await p.click("#vaultMoreBtn"); await p.setInputFiles("#vaultInput", ZIP); await p.waitForTimeout(800);
ok(/7 of them replace notes you already have/.test(await p.locator("#homeAnswer").textContent()), "re-importing warns which notes it would replace");
await p.locator("#dispBody button", { hasText: "Yes" }).first().click(); await p.waitForTimeout(500);
ok(await notesCount() === 7, "…and doesn't create duplicates", await notesCount());
// new folder + note inside it
await p.click("#newFolder"); await p.fill("#newFolderName", "Work › Second Officer"); await p.press("#newFolderName", "Enter"); await p.waitForTimeout(200);
ok(await p.locator('.tree-folder[data-path="Work › Second Officer"]').count() === 1 && /10 folders/.test(await p.locator("#vaultStats").textContent()), "new folder appears in the tree");
await p.click("#newNote"); ok(await p.inputValue("#editorCategory") === "Work › Second Officer" && await p.locator("#editorBody").isVisible(), "✎ makes a new note inside the selected folder");
await p.click("#editorBack");
// export as an Obsidian vault zip
await p.click("#vaultMoreBtn");
const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#exportVault")]);
const zp = await dl.path(), buf = fs.readFileSync(zp);
const names = []; for (let i = 0; i < buf.length - 4; i++) if (buf.readUInt32LE(i) === 0x02014b50) { const nl = buf.readUInt16LE(i + 28); names.push(buf.slice(i + 46, i + 46 + nl).toString("utf8")); }
const local = buf.indexOf(Buffer.from("Max vault/Work/Ship's Apps and Tool/AMOS/Monthly Reports (AMOS).md"));
ok(/\.zip$/.test(dl.suggestedFilename()) && names.length === 7 && names.includes("Max vault/Work/Ship's Apps and Tool/AMOS/Monthly Reports (AMOS).md") && local >= 0 && buf.includes(Buffer.from("1. Monthly Reports")), "export: a vault zip with the same folders, notes as Markdown", names.join(" | "));
// paperclip + voice
await p.click("#vaultMoreBtn");
await p.evaluate(() => window.__q.push("import my obsidian vault")); await p.click("#miniOrb"); await p.waitForTimeout(800);
ok(await p.locator("#vaultMore").isVisible() && /Compress/.test(await p.locator("#miniSay").textContent()), "“import my obsidian vault” → shows how", await p.locator("#miniSay").textContent());
await p.setInputFiles("#attachInput", ZIP); await p.waitForTimeout(800);
ok(/Import 7 notes/.test(await p.locator("#miniSay").textContent()), "a vault zip sent with 📎 goes to the importer");
await p.locator("#dispBody button", { hasText: "No" }).first().click();
// phone tree screenshot for review
await p.click("#maxOrb, #miniHome").catch(() => {});
ok(errs.length === 0, "no script errors", errs.join(" | "));
await b.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
