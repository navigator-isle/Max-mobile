// Phone: 📎 attachments — send a photo or PDF, Max reads it, answers questions about it, saves to notes only when asked.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const sent = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url === "https://api.cloudflare.com/client/v4/graphql") { cfCalls++;
    return new Response(JSON.stringify({ data: { viewer: { accounts: [{ today: [{ count: 52, sum: { visits: 37 } }], week: [{ count: 410, sum: { visits: 260 } }],
      pages: [{ count: 20, dimensions: { requestPath: "/gundam/pg/" } }], countries: [{ count: 30, dimensions: { countryName: "US" } }] }] } } })); }
  if (url === "https://hobbyisle.com/" || url.startsWith("https://navigator-isle.github.io") || url.startsWith("https://draft-calculator")) return new Response("ok");
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); const all = JSON.stringify(b);
    const file = b.contents?.[0]?.parts?.find(x => x.inline_data);
    let text;
    if (file) { sent.push({ mime: file.inline_data.mime_type, size: file.inline_data.data.length });
      text = JSON.stringify({ kind: "certificate", title: "Safety Equipment Certificate — MV Sample", topic: "Ship › Certificates", summary: "Safety Equipment Certificate for MV Sample, issued by Panama.",
        points: ["Issued by Panama Maritime Authority", "Valid until 1 March 2027"], dates: [{ what: "Certificate expires", date: "2027-03-01" }], amounts: [], text: "SAFETY EQUIPMENT CERTIFICATE\nValid until 1 March 2027\n<script>window.__bad=1</script>", tags: ["certificate"], answer: "", say: "It's the Safety Equipment Certificate for MV Sample." }); }
    else text = JSON.stringify({ reply: all.includes("Valid until 1 March 2027") ? "It expires on 1 March 2027." : "I don't see a file.", action: null });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8054", WK = "http://127.0.0.1:8840";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8840);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8054);
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



// a big photo: resized on the phone, read by Max, shown with its deadline
const big = await p.evaluate(() => { const c = document.createElement("canvas"); c.width = 3000; c.height = 2000; const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 3000, 2000); x.fillStyle = "#000"; x.font = "120px sans-serif"; x.fillText("SAFETY EQUIPMENT CERTIFICATE", 100, 300); return c.toDataURL("image/png").split(",")[1]; });
await p.setInputFiles("#attachInput", { name: "certificate.png", mimeType: "image/png", buffer: Buffer.from(big, "base64") });
await p.waitForFunction(() => /not in your notes yet/.test(document.getElementById("dispSub").textContent), null, { timeout: 15000 }).catch(() => {});
await p.waitForTimeout(400);
let a = await answer();
ok(sent.length === 1 && sent[0].mime === "image/jpeg" && sent[0].size < Buffer.from(big, "base64").length * 1.4, "big photo is shrunk on the phone before sending", JSON.stringify(sent));
ok(await vis("#displayScreen") && /Safety Equipment Certificate for MV Sample/.test(a) && /Certificate expires: 1 March 2027/.test(a) && /Say “save it”/.test(a), "Max says what it is, the deadline, and asks before saving", a);
const disp = await p.locator("#dispBody").textContent();
ok(/FROM FILE/.test(disp) && /⏰ Certificate expires: 1 March 2027/.test(disp) && await p.locator("#dispBody img.att-img").count() === 1, "display shows the photo, key facts and the deadline");
ok(!(await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3") || "[]").some(n => n.source === "attachment"))), "nothing saved before you say so");
await p.click("text=Show full text");
ok((await p.locator("#attText").textContent()).includes("<script>") && await p.evaluate(() => !window.__bad), "full text shown as plain text (nothing in the file can run)");
await p.screenshot({ path: process.env.SHOT_DIR + "/attachment.png" });

// questions about it
await say("when does it expire?");
ok((await answer()).includes("It expires on 1 March 2027"), "questions are answered from the file", await answer());
await say("save it");
let notes = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")));
const saved = notes.find(n => n.source === "attachment");
ok(saved && saved.title === "Safety Equipment Certificate — MV Sample" && saved.category === "Ship › Certificates" && /Valid until 1 March 2027/.test(saved.body) && /&lt;script&gt;/.test(saved.body), "“save it” → filed in notes under its topic, with the full text", JSON.stringify(saved).slice(0, 300));
ok(await vis("#editorScreen") && (await p.locator("#editorBadge").textContent()).length > 0, "opens the saved note");
await p.click("#miniHome");

// a PDF, then discard
await p.setInputFiles("#attachInput", { name: "circular.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%fake\n") });
await p.waitForFunction(() => /not in your notes yet/.test(document.getElementById("dispSub").textContent), null, { timeout: 15000 }).catch(() => {});
ok(sent.at(-1).mime === "application/pdf", "PDFs are sent as PDFs");
await say("discard it");
ok(/Discarded/.test(await answer()) && (await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).filter(n => n.source === "attachment").length)) === 1, "“discard it” → nothing more saved", await answer());

// unsupported file + voice asking to send a file
await p.setInputFiles("#attachInput", { name: "report.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("PK") });
await p.waitForTimeout(500);
ok(/seems damaged/.test(await answer()) && sent.length === 2, "a damaged Word file: says so clearly (nothing sent)", await answer());
await say("I want to send you a document");
ok(/Tap the 📎/.test(await answer()) && await p.locator("#attachBtn.pulse").count() === 1, "“send you a document” → points to the 📎 button", await answer());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
