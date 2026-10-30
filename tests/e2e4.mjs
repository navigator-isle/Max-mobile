// Notes reach Max directly from the phone, "read my … note", long answers spoken fully, offline mode.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const gem = [];
const LONG = Array.from({ length: 14 }, (_, i) => `This is sentence number ${i + 1} of a long, detailed explanation about ballast operations.`).join(" ");
globalThis.fetch = async (u, o) => { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text; const sys = b.systemInstruction.parts[0].text;
  const reply = /pump/i.test(q) && sys.includes("sea suction") ? { reply: "Your Ballast procedure note says: open the sea suction, then start pump No. 2.", used_notes: ["Ballast procedure"] } :
    /what notes/i.test(q) ? { reply: sys.includes("- Family birthdays") ? "You have notes on ballast and family birthdays." : "I don't see any." } :
    /explain/i.test(q) ? { reply: LONG } : { reply: "Answer to: " + q };
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(reply) }] } }] })); };
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8031";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN }; // no database on purpose: notes must come from the phone
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request("http://127.0.0.1:8817" + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8817);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html";
  r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8031);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__recErr = null;
  class R { start() { const t = window.__q.shift(), err = window.__recErr; setTimeout(() => { if (err) this.onerror && this.onerror({ error: err }); else if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 20); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; }; };
const t0 = Date.now();
const notes = JSON.stringify([
  { id: "n_b", title: "Ballast procedure", category: "Maritime › Ballast", tags: ["ballast"], body: "<p>Open the sea suction first. Then start ballast pump No. 2. Record it in the ballast water record book.</p>", createdAt: t0, updatedAt: t0 },
  { id: "n_f", title: "Family birthdays", category: "Personal", tags: [], body: "<p>Ana is in March. Leo is in July.</p>", createdAt: t0, updatedAt: t0 - 1 }]);
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: "http://127.0.0.1:8817", max_notes_v3: notes, max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
console.log("DEBUG", await p.evaluate(()=>JSON.stringify({active:[...document.querySelectorAll(".section-screen.active")].map(e=>e.id),orb:document.getElementById("maxOrb").getBoundingClientRect().width,errs:window.__maxErrors,status:document.getElementById("homeStatus").textContent})));
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); await p.waitForTimeout(100); };
const spokenSince = async n => (await p.evaluate(n => window.__spoken.slice(n), n)).join(" ");

// 1. Max reads notes straight from the phone (no database, nothing synced)
await say("Which pump do I start first?");
ok(gem.at(-1).systemInstruction.parts[0].text.includes("Open the sea suction first"), "your note text goes to Max with the question");
ok((await p.locator("#homeAnswer").textContent()).includes("sea suction") && await p.locator("#noteRefs button", { hasText: "Ballast procedure" }).count() === 1, "Max answers from the note and shows which note");
await say("what notes do I have?");
ok(await vis("#notesScreen") && (await p.locator("#miniSay").textContent()).includes("2 in all: Maritime 1, Personal 1"), "“what notes do I have?” → shows them and says how many per topic", await p.locator("#miniSay").textContent());
await p.click("#miniHome");
await say("do you remember what I wrote about my family?");
ok(gem.at(-1).systemInstruction.parts[0].text.includes("Leo is in July"), "a question about a note sends that note's full text");
// "this note"
await p.click("#maxOrb", { button: "right" }); await p.click("[data-go=notes]");
await p.locator(".note-item", { hasText: "Family birthdays" }).click();
await say("when is Leo's birthday according to this note");
ok(gem.at(-1).systemInstruction.parts[0].text.includes("THE NOTE OPEN ON HIS SCREEN NOW") && gem.at(-1).systemInstruction.parts[0].text.includes("Leo is in July"), "Max sees the note that is open (“this note”)");

// 2. read a note aloud (on the phone, no AI)
await p.click("#miniHome");
let g = gem.length, n0 = await p.evaluate(() => window.__spoken.length);
await say("read my ballast procedure note");
const read = await spokenSince(n0);
ok(gem.length === g && read.includes("Open the sea suction first") && read.includes("record book") && await vis("#editorScreen"), "“read my ballast procedure note” → opens it and reads it aloud", read);
n0 = await p.evaluate(() => window.__spoken.length);
await say("read it");
ok((await spokenSince(n0)).includes("Open the sea suction"), "“read it” on an open note reads that note");

// 3. long answers are spoken completely, in pieces
await p.click("#miniHome");
n0 = await p.evaluate(() => window.__spoken.length);
await say("explain ballast operations in detail");
const pieces = await p.evaluate(n => window.__spoken.slice(n), n0);
ok(pieces.length > 3 && pieces.join(" ").includes("sentence number 14") && pieces.every(x => x.length <= 230), "long answer spoken fully in short pieces (Android won't cut it off)", pieces.length + " pieces");
ok((await p.locator("#homeAnswer").textContent()).includes("sentence number 14"), "full long answer shown on screen");

// 4. offline
await p.waitForTimeout(500);
const swReady = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && (r.active || r.waiting || r.installing)); });
ok(swReady, "app is saved on the phone for offline use");
await ctx.setOffline(true);
await p.evaluate(() => window.dispatchEvent(new Event("offline")));
await p.waitForTimeout(200);
ok((await p.locator("#globalStatus").textContent()) === "Offline", "header shows Offline");
g = gem.length; await say("which pump do I start");
ok(gem.length === g && (await p.locator("#homeAnswer").textContent()).includes("I’m offline, but your note “Ballast procedure” says") && (await p.locator("#homeAnswer").textContent()).includes("pump No. 2"), "offline: Max answers from your notes on the phone", await p.locator("#homeAnswer").textContent());
await say("show my notes");
ok(await vis("#notesScreen"), "offline: screen commands still work");
await p.click("#miniHome");
await p.evaluate(() => { window.__recErr = "network"; });
await p.click("#maxOrb"); await p.waitForTimeout(400);
ok(await vis("#typeRow") && /No internet for voice/.test(await p.locator("#homeStatus").textContent()), "offline voice: Max opens the keyboard instead");
await p.evaluate(() => { window.__recErr = null; });
await p.reload(); await p.waitForTimeout(1000);
ok(await vis("#maxOrb") && (await p.locator(".note-item").count()) >= 0 && (await p.title()).includes("Max"), "offline: app still opens after closing it", await p.title());
await ctx.setOffline(false);
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
