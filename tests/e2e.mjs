// End-to-end: real Chrome (phone size) + real index.html + real worker.js on a real SQLite database. Gemini is faked.
import http from "node:http";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url);
const { chromium, devices } = require("playwright");

const [, , pagePath, newWorkerPath, oldWorkerPath] = process.argv;
const PAGE_PORT = 8001, NEW_PORT = 8787, OLD_PORT = 8788;
const ORIGIN = `http://127.0.0.1:${PAGE_PORT}`;

// --- D1 shim over SQLite ---
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; }
  bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }

const geminiLog = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => {
  if (String(u).includes("generativelanguage")) {
    const b = JSON.parse(o.body); geminiLog.push(b);
    const q = b.contents.at(-1).parts[0].text;
    const sys = b.systemInstruction?.parts[0].text || "";
    const reply = /ship/i.test(q) && sys.includes("MV Pacific Star") ? "You are on MV Pacific Star." : "Noted. Fake reply to: " + q;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: reply }] } }] }), { status: 200 });
  }
  return realFetch(u, o);
};

const sqlite = new DatabaseSync(":memory:");
const newWorker = (await import(newWorkerPath)).default;
const oldWorker = (await import(oldWorkerPath)).default;
const newEnv = { GEMINI_API_KEY: "test-key", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "anchor-77", MAX_MEMORY: new D1(sqlite) };
const oldEnv = { GEMINI_API_KEY: "test-key", ALLOWED_ORIGIN: ORIGIN };

function serveWorker(worker, env, port) {
  return http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await worker.fetch(new Request("http://127.0.0.1:" + port + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : body }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  }).listen(port);
}
const sNew = serveWorker(newWorker, newEnv, NEW_PORT), sOld = serveWorker(oldWorker, oldEnv, OLD_PORT);
const sPage = http.createServer((req, res) => { res.writeHead(200, { "Content-Type": req.url.includes("sw.js") ? "text/javascript" : "text/html; charset=utf-8" }); res.end(fs.readFileSync(req.url.includes("sw.js") ? pagePath.replace(/index\.html$/, "sw.js") : pagePath)); }).listen(PAGE_PORT);

let pass = 0, fail = 0;
const ok = (c, label, extra = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + label + (c ? "" : "  → " + extra)); };
const browser = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });

// Fake speech so voice can be tested in a headless browser.
const speechMock = ({ transcripts, speechNeverEnds }) => {
  window.__spoken = [];
  window.__transcripts = transcripts || [];
  class FakeRec { start() { const t = window.__transcripts.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); this.onend && this.onend(); }, 50); }
    stop() {} abort() {} }
  window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
  const fakeSynth = { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); if (!window.__speechNeverEnds) setTimeout(() => u.onend && u.onend(), 30); },
    cancel() {}, getVoices() { return []; }, onvoiceschanged: null };
  window.__speechNeverEnds = !!speechNeverEnds;
  Object.defineProperty(window, "speechSynthesis", { value: fakeSynth, configurable: true });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
};

async function openPhone(storage, mockOpts = {}) {
  const ctx = await browser.newContext({ ...devices["Pixel 7"] });
  await ctx.addInitScript(([st, mo, fn]) => {
    if (!sessionStorage.getItem("__seeded")) { sessionStorage.setItem("__seeded", "1"); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }
    (new Function("return " + fn)())(mo);
  }, [storage, mockOpts, speechMock.toString()]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await page.goto(ORIGIN + "/");
  return { ctx, page, errors };
}
const text = (p, sel) => p.locator(sel).textContent();
const wait = ms => new Promise(r => setTimeout(r, ms));

// ---- 1. First launch on the NEW worker, with old data left from earlier versions ----
const oldNotes = JSON.stringify([{ id: "note_1_old", title: "Old engine note", category: "Maritime", body: "Line one\nLine <two>", createdAt: 1000, updatedAt: 1000, analysis: null }]);
let { ctx, page, errors } = await openPhone({ jarvis_api_base_v2: "http://127.0.0.1:" + NEW_PORT, max_notes_v1: oldNotes, jarvis_mem_v2: JSON.stringify(["I prefer metric units"]) });
await wait(800);
ok((await text(page, "#homeStatus")).startsWith("Ready"), "starts and shows Ready", await text(page, "#homeStatus"));
ok(errors.length === 0, "no script errors on startup", errors.join(" | "));
ok(await text(page, "#globalStatus") === "Connected · passcode needed", "header shows passcode needed", await text(page, "#globalStatus"));
ok((await page.evaluate(() => window.__spoken.length)) === 0, "no speech before the first tap (Android rule)");
await page.click("#maxOrb",{button:"right"}); await page.click('[data-go=notes]');
ok(await page.locator(".note-item strong", { hasText: "Old engine note" }).count() === 1, "older notes (v1) now appear in Notes");
ok((await page.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3"))[0].body)) === "Line one<br>Line &lt;two&gt;", "old note text converted safely");
await page.click("#miniHome");

// Greeting on first tap of the empty area; not on the circle
await page.mouse.click(30, 250);
await wait(200);
ok((await page.evaluate(() => window.__spoken[0] || "")).includes("I’m Max"), "greeting spoken on first tap");

// Voice without passcode → clear message
await page.evaluate(() => window.__transcripts.push("hello"));
await page.click("#maxOrb"); await wait(700);
ok((await text(page, "#homeAnswer")).includes("passcode"), "voice without passcode explains what to do", await text(page, "#homeAnswer"));

// Enter passcode in settings and test
await page.click("#openConnection");
await page.fill("#maxPassInput", "anchor-77");
await page.click("#testWorkerUrl"); await wait(1500);
const result = await text(page, "#connectionResult");
ok(result.includes("SUCCESS") && result.includes("Memory database: ready") && result.includes("Notes sync: done"), "connection test: memory database ready + notes synced", result);
ok(await text(page, "#globalStatus") === "Connected · memory on", "header shows memory on");
ok(sqlite.prepare("SELECT count(*) c FROM max_notes WHERE title='Old engine note'").get().c === 1, "old note uploaded to database");
ok(sqlite.prepare("SELECT count(*) c FROM max_memories WHERE text='I prefer metric units'").get().c === 1, "old saved memory uploaded once");
await wait(300);
ok(await page.locator("#memList .mem-row").count() === 1, "memory list visible in settings");
await page.fill("#memAddText", "My birthday month is March"); await page.click("#memAdd"); await wait(500);
ok(await page.locator("#memList .mem-row").count() === 2, "add memory from settings");
await page.click("#closeConnection");

// Voice: remember, then recall
await page.evaluate(() => window.__transcripts.push("Max, remember that my ship is MV Pacific Star"));
await page.click("#maxOrb"); await wait(900);
ok(sqlite.prepare("SELECT count(*) c FROM max_memories WHERE text='my ship is MV Pacific Star'").get().c === 1, "voice 'remember that…' saved to database");
await page.evaluate(() => window.__transcripts.push("What ship am I on?"));
await page.click("#maxOrb"); await wait(900);
ok((await text(page, "#homeAnswer")) === "You are on MV Pacific Star.", "Max recalls it on the next question", await text(page, "#homeAnswer"));
const lastReq = geminiLog.at(-1);
ok(lastReq.contents.length === 3, "voice keeps conversation history (earlier exchange + question)", String(lastReq.contents.length));
ok((await page.evaluate(() => window.__spoken.at(-1))) === "You are on MV Pacific Star.", "answer is spoken");

// Notes: create, sync, delete
await page.click("#maxOrb",{button:"right"}); await page.click('[data-go=notes]'); await page.click("#newNote");
await page.fill("#editorTitle", "Ballast procedure");
await page.click("#editorBody"); await page.keyboard.type("Open sea suction first, then start ballast pump No.2.");
await page.click("#editorSave"); await wait(2500);
ok(sqlite.prepare("SELECT count(*) c FROM max_notes WHERE title='Ballast procedure' AND deleted=0").get().c === 1, "new note synced to database");
await page.evaluate(() => window.__transcripts.push("Which ballast pump do I start?"));
await page.click("#miniHome"); await page.click("#maxOrb"); await wait(900);
ok(geminiLog.at(-1).systemInstruction.parts[0].text.includes("Open sea suction first"), "voice question uses the matching note");
await ctx.close();

// ---- 2. Second phone: empty storage, same passcode → gets everything from the cloud ----
({ ctx, page, errors } = await openPhone({ jarvis_api_base_v2: "http://127.0.0.1:" + NEW_PORT, max_pass: "anchor-77" }));
await wait(1500);
await page.click("#maxOrb",{button:"right"}); await page.click('[data-go=notes]'); await wait(800);
ok(await page.locator(".note-item strong", { hasText: "Ballast procedure" }).count() === 1, "second phone receives notes from database");
await page.locator(".note-item", { hasText: "Ballast procedure" }).click();
page.once("dialog", d => d.accept());
await page.click("#editorDelete"); await wait(2500);
ok(sqlite.prepare("SELECT deleted d, body FROM max_notes WHERE title='Ballast procedure'").get().d === 1, "delete on second phone reaches database");
ok(errors.length === 0, "second phone: no script errors", errors.join(" | "));
await ctx.close();

// ---- 3. Bad stored data must not freeze startup ----
({ ctx, page, errors } = await openPhone({ jarvis_api_base_v2: "http://127.0.0.1:" + NEW_PORT, max_notes_v3: '{"not":"a list"}', jarvis_chat_v2: "{broken json", max_notes_v1: "[null, 5]" }));
await wait(800);
ok((await text(page, "#homeStatus")).startsWith("Ready"), "corrupt saved data: still starts", await text(page, "#homeStatus"));
await ctx.close();
({ ctx, page, errors } = await openPhone({ max_notes_v3: JSON.stringify([{ id: "x1", title: "No body", updatedAt: 5 }, null, { id: "x2", body: 42 }]) }));
await wait(500);
await page.click("#maxOrb",{button:"right"}); await page.click('[data-go=notes]');
ok(await page.locator(".note-item").count() === 2 && errors.length === 0, "notes with missing fields still list (this used to crash startup)", errors.join(" | "));
await ctx.close();

// ---- 4. Current (old) worker.js still works with the new page ----
({ ctx, page, errors } = await openPhone({ jarvis_api_base_v2: "http://127.0.0.1:" + OLD_PORT }, { transcripts: ["hello Max"] }));
await wait(800);
ok(await text(page, "#globalStatus") === "Connected", "old Worker: connected", await text(page, "#globalStatus"));
await page.click("#maxOrb"); await wait(800);
ok((await text(page, "#homeAnswer")).startsWith("Noted. Fake reply to: hello Max"), "old Worker: voice chat still works", await text(page, "#homeAnswer"));
await page.click("#openConnection"); await page.click("#testWorkerUrl"); await wait(800);
ok((await text(page, "#connectionResult")).includes("older version"), "old Worker: test tells you to upload the new worker.js");
ok(errors.length === 0, "old Worker: no script errors", errors.join(" | "));
await ctx.close();

// ---- 5. Worker unreachable (no internet at sea) ----
({ ctx, page, errors } = await openPhone({ jarvis_api_base_v2: "http://127.0.0.1:9" }));
await wait(1500);
ok((await text(page, "#homeStatus")).startsWith("Ready") && await text(page, "#globalStatus") === "Offline", "no connection: app still opens, header says Offline", await text(page, "#globalStatus"));
await page.click("#maxOrb",{button:"right"}); await page.click('[data-go=notes]'); await page.click("#newNote"); await page.click("#editorBody"); await page.keyboard.type("offline note"); await page.click("#editorSave");
ok((await page.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).length)) === 1, "no connection: notes still save on the phone");
await ctx.close();

// ---- 6. Android speech that never reports 'end' must not leave the circle stuck ----
({ ctx, page, errors } = await openPhone({ jarvis_api_base_v2: "http://127.0.0.1:" + OLD_PORT }, { transcripts: ["hi"], speechNeverEnds: true }));
await wait(500); await page.click("#maxOrb"); await wait(600);
ok(await page.locator("#maxOrb.speaking").count() === 1, "circle animates while speaking");
await wait(7000);
ok(await page.locator("#maxOrb.speaking").count() === 0 && /^(Ready|Standing by|Listening)/.test(await text(page, "#homeStatus")), "circle un-sticks by itself", await text(page, "#homeStatus"));
await page.screenshot({ path: process.env.SHOT_DIR + "/home.png" });
await page.click("#openConnection"); await page.screenshot({ path: process.env.SHOT_DIR + "/settings.png" });
await ctx.close();

await browser.close(); sNew.close(); sOld.close(); sPage.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
