// Phone: Word / Excel / PowerPoint read on the phone, videos, links (typed, spoken, shared from other apps), old formats explained.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import { fileURLToPath } from "node:url"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const seen = [], uploaded = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url === "https://api.cloudflare.com/client/v4/graphql") { cfCalls++;
    return new Response(JSON.stringify({ data: { viewer: { accounts: [{ today: [{ count: 52, sum: { visits: 37 } }], week: [{ count: 410, sum: { visits: 260 } }],
      pages: [{ count: 20, dimensions: { requestPath: "/gundam/pg/" } }], countries: [{ count: 30, dimensions: { countryName: "US" } }] }] } } })); }
  if (url === "https://hobbyisle.com/" || url.startsWith("https://navigator-isle.github.io") || url.startsWith("https://draft-calculator")) return new Response("ok");
  if (url === "https://generativelanguage.googleapis.com/upload/v1beta/files") return new Response("{}", { headers: { "x-goog-upload-url": "https://upload.example/u1" } });
  if (url === "https://upload.example/u1") { let n = 0; for await (const c of o.body) n += c.length; uploaded.push(n); return new Response(JSON.stringify({ file: { name: "files/v1", uri: "https://g/files/v1", state: "ACTIVE" } })); }
  if (url.endsWith("/files/v1")) return new Response("{}");
  if (url === "https://www.imo.org/en/bwm") return new Response("<html><head><title>BWM update</title></head><body><p>The D-2 standard applies to all ships from 8 September 2024.</p></body></html>", { headers: { "Content-Type": "text/html" } });
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); const p0 = b.contents?.[0]?.parts?.[0] || {};
    let content = "", kind = "file";
    if (p0.inline_data) { content = Buffer.from(p0.inline_data.data, "base64").toString("utf8"); kind = /converted to text on his phone/.test(b.contents[0].parts[1].text) ? b.contents[0].parts[1].text.match(/sent you a ([\w ]+?) \(converted/)[1] : "file"; }
    else if (p0.file_data) { content = p0.file_data.file_uri; kind = "video"; }
    else if (p0.text && /^WEB PAGE/.test(p0.text)) { content = p0.text; kind = "web page"; }
    else { const q = b.contents.at(-1).parts[0].text; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Answer to: " + q, action: null }) }] } }] })); }
    seen.push({ kind, content });
    const text = JSON.stringify({ kind, title: kind + " read", topic: "Inbox", summary: "Read a " + kind + ".", points: [content.slice(0, 200)], dates: [], amounts: [], text: content.slice(0, 2000), tags: [], say: "I read the " + kind + "." });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8055", WK = "http://127.0.0.1:8841";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8841);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8055);
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




const fx = n => fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", n));
const send = async (name, mimeType, buffer) => { const n = seen.length; await p.setInputFiles("#attachInput", { name, mimeType, buffer });
  await p.waitForFunction(n => document.getElementById("dispSub").textContent.includes("not in your notes yet") || /Couldn’t/.test(document.getElementById("dispTitle").textContent) || document.getElementById("miniSay").textContent.includes("I can"), n, { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(300); };
const last = () => seen.at(-1) || {};

await send("crew-list.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", fx("crew-list.docx"));
ok(last().kind === "Word document" && /Crew Change Plan\nJoining date: 15 Nov 2026 & Manila/.test(last().content) && /Rank \| Name\n2\/O \| Mark Jun/.test(last().content), "Word: text and tables read on the phone", JSON.stringify(last()).slice(0, 300));
ok(/I read the Word document/.test(await answer()), "Max reports on the Word file");
await send("stores.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fx("stores.xlsx"));
ok(last().kind === "Excel spreadsheet" && /=== Sheet: Bunkers ===\nFuel,ROB \(mt\)\nVLSFO,412.5/.test(last().content) && /=== Sheet: Stores ===\n"Item, name",,Qty/.test(last().content), "Excel: every sheet read as a table, columns kept in place", JSON.stringify(last().content));
await send("briefing.pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation", fx("briefing.pptx"));
ok(last().kind === "PowerPoint" && /=== Slide 1 ===\nArrival briefing[\s\S]*=== Slide 2 ===\nPort of Singapore\nPilot at 0600\n\(Speaker notes: Remind crew about ISPS level 2\)/.test(last().content), "PowerPoint: slides in order, with speaker notes", JSON.stringify(last().content));
await say("save it");
ok((await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).some(n => n.source === "attachment" && /Pilot at 0600/.test(n.body)))), "Office file saved to notes with its text");
await p.click("#miniHome");

const before = seen.length;
await send("old.doc", "application/msword", Buffer.from("x"));
ok(seen.length === before && /save it as .docx or PDF/.test(await answer()), "old .doc: explains how to save it so Max can read it", await answer());

// video
await send("drill.mp4", "video/mp4", Buffer.alloc(120000, 3));
ok(uploaded.at(-1) === 120000 && last().kind === "video" && /I read the video/.test(await answer()), "video: uploaded whole and watched", JSON.stringify(uploaded));
ok(await p.locator("#dispBody video.att-img").count() === 1, "video preview shown");
await say("discard it");

// link through the 📎 sheet
await p.click("#attachBtn");
ok(await vis("#attachSheet"), "📎 opens: file, or paste a link");
await p.fill("#linkInput", "https://www.imo.org/en/bwm"); await p.click("#linkGo");
await p.waitForFunction(() => document.getElementById("dispSub").textContent.includes("not in your notes yet"), null, { timeout: 15000 }).catch(() => {});
ok(last().kind === "web page" && /D-2 standard applies/.test(last().content) && (await p.locator(".att-link").textContent()).includes("imo.org/en/bwm"), "pasted link: page read, address shown");
await p.screenshot({ path: process.env.SHOT_DIR + "/link.png" });
await say("save it");
const ln = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).find(n => n.source === "attachment" && n.file?.url));
ok(ln && ln.sources[0].url === "https://www.imo.org/en/bwm" && /href="https:\/\/www.imo.org\/en\/bwm"/.test(ln.body), "saved with the link as its source");
await p.click("#miniHome");

// spoken link
const k = seen.length;
await say("read www imo dot org slash en slash bwm");
ok(seen.length === k + 1 && /D-2/.test(last().content), "spoken “read www imo dot org slash en slash bwm” → reads the page", await answer());
await say("discard it");
await say("summarize www.imo.org/en/bwm please");
ok(seen.length === k + 2, "“summarize www.imo.org/en/bwm” → reads the page", await answer());
await say("discard it");

// shared from another app (Android share menu)
const k2 = seen.length;
await p.goto(ORIGIN + "/?share=link&text=" + encodeURIComponent("Check this https://www.imo.org/en/bwm"));
await p.waitForFunction(() => document.getElementById("dispSub").textContent.includes("not in your notes yet"), null, { timeout: 15000 }).catch(() => {});
ok(seen.length === k2 + 1 && !p.url().includes("share"), "a link shared to Max from another app is read straight away");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
