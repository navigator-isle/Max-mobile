// Phone: display screen (notes first, then web), research → notes by voice, projects overview with what's missing.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url === "https://api.cloudflare.com/client/v4/graphql") { cfCalls++;
    return new Response(JSON.stringify({ data: { viewer: { accounts: [{ today: [{ count: 52, sum: { visits: 37 } }], week: [{ count: 410, sum: { visits: 260 } }],
      pages: [{ count: 20, dimensions: { requestPath: "/gundam/pg/" } }], countries: [{ count: 30, dimensions: { countryName: "US" } }] }] } } })); }
  if (url === "https://hobbyisle.com/" || url.startsWith("https://navigator-isle.github.io") || url.startsWith("https://draft-calculator")) return new Response("ok");
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body);
    const text = b.tools ? "TITLE: ISPS Code security levels\nTOPIC: Maritime › Conventions › ISPS\nPOINTS:\n- There are three security levels [1].\n- Level 1 is normal operations.\nCONFIDENCE: high — IMO" :
      JSON.stringify({ reply: "Answer to: " + b.contents.at(-1).parts[0].text, action: null });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, groundingMetadata: b.tools ? { groundingChunks: [{ web: { uri: "https://www.imo.org/isps", title: "imo.org" } }] } : undefined }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8053", WK = "http://127.0.0.1:8839";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8839);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8053);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const now = Date.now();
const NOTES = [
  { id: "n1", title: "SOLAS Chapter II-2 fire safety", category: "Maritime › Conventions › SOLAS", tags: ["solas", "fire"], body: "<p>Chapter II-2 covers fire protection, detection and extinction.</p><ul><li>Fire drills monthly</li></ul><script>window.__bad=1</script>", source: "note", createdAt: now, updatedAt: now, deleted: false },
  { id: "n2", title: "Hobby Isle launch plan", category: "Projects › Hobby Isle", tags: ["hobby isle"], body: "<p>Add RG list next, then Pokémon section.</p>", source: "note", createdAt: now, updatedAt: now, deleted: false },
  { id: "n3", title: "Hobby Isle: Add a Pokémon menu", category: "Projects › Change requests", tags: [], body: "<p>Add a Pokémon menu</p>", source: "max", createdAt: now, updatedAt: now, deleted: false }];
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", max_notes_v3: JSON.stringify(NOTES) }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();


// display from notes first
let g = 0;
await say("show me SOLAS chapter II-2 on the screen");
let a = await answer();
ok(await vis("#displayScreen") && /From your notes, SOLAS Chapter II-2 fire safety/.test(a) && cfCalls === 0, "“show me … on the screen” → found in notes, shown and read out", a);
ok((await p.locator("#dispBody").textContent()).includes("Fire drills monthly") && await p.evaluate(() => !window.__bad) && await p.locator("#dispBody script").count() === 0, "note shown on the display screen, safely (no scripts)");
await p.screenshot({ path: process.env.SHOT_DIR + "/display-notes.png" });
await say("search the web too");
ok(await vis("#researchScreen") && (await p.locator("#resPoints li").count()) === 2, "“search the web too” → research for the same topic", await answer());
await p.click("#miniHome");

// display falls back to the web when notes have nothing
await say("display the ISPS code security levels");
a = await answer();
ok(/Nothing in your notes about ISPS code security levels, so I looked it up on the web/.test(a) && await vis("#researchScreen"), "not in notes → looks it up on the web, waits for approval", a);
await say("approve it");
let notes = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")));
ok(notes.some(n => n.title === "ISPS Code security levels" && n.source === "research" && n.category === "Maritime › Conventions › ISPS"), "approved → saved to notes under its topic");
await p.click("#miniHome");

// research and add to notes in one sentence
await say("search about the ISPS code levels and add it to my notes");
ok(await vis("#researchScreen") && /Say approve to save it/.test(await answer()), "“search about … and add it to my notes” → research, then asks before saving", await answer());
await say("discard it");
await p.click("#miniHome");

// projects overview
await say("how many projects do I have?");
a = await answer();
ok(await vis("#displayScreen") && /^You have 10 projects: 4 websites and 6 inside Claude\./.test(a), "“how many projects do I have?” → count, websites vs inside Claude", a);
const disp = await p.locator("#dispBody").textContent();
ok(await p.locator(".disp-card").count() === 10 && (await p.locator("#dispSub").textContent()).includes("10 projects"), "overview: one card per project");
const hobby = await p.locator(".disp-card", { hasText: "Hobby Isle" }).first().textContent();
ok(/ONLINE/.test(hobby) && /1 change request waiting: Add a Pokémon menu/.test(hobby) && /No sales logged this month/.test(hobby) && /Visitor numbers not connected/.test(hobby) && /note about it/.test(hobby), "Hobby Isle card: online, change request waiting, no sales, analytics missing, its notes", hobby);
ok(/No GitHub repo linked/.test(await p.locator(".disp-card", { hasText: "Quick Draft Calculator" }).textContent()) && /Lives inside Claude/.test(await p.locator(".disp-card", { hasText: "SeaLex" }).textContent()), "what's missing: no repo / inside Claude");
ok(/No notes about it yet/.test(await p.locator(".disp-card", { hasText: "SeaLex" }).textContent()) && /No notes about it yet/.test(await p.locator(".disp-card", { hasText: "Passage Planner" }).textContent()), "notes are matched to the right project only");
await p.screenshot({ path: process.env.SHOT_DIR + "/overview.png", fullPage: true });
await p.click("#miniHome");
await say("what's missing on hobby isle?");
a = await answer();
ok(/^Hobby Isle is online\./.test(a) && /What’s missing:/.test(a) && await p.locator(".disp-card").count() === 1, "“what's missing on Hobby Isle?” → just that project", a);
await p.click("#miniHome");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
