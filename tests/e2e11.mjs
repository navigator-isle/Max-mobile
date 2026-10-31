// Phone: the crew — Secretary (deadlines, briefing), Researcher (watch list, inbox, fact-check), Librarian (report, duplicates, merge) and skill cards.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const researchAsked = [], chats = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url === "https://api.cloudflare.com/client/v4/graphql") { cfCalls++;
    return new Response(JSON.stringify({ data: { viewer: { accounts: [{ today: [{ count: 52, sum: { visits: 37 } }], week: [{ count: 410, sum: { visits: 260 } }],
      pages: [{ count: 20, dimensions: { requestPath: "/gundam/pg/" } }], countries: [{ count: 30, dimensions: { countryName: "US" } }] }] } } })); }
  if (url === "https://hobbyisle.com/" || url.startsWith("https://navigator-isle.github.io") || url.startsWith("https://draft-calculator")) return new Response("ok");
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); const all = JSON.stringify(b);
    if (b.tools) { researchAsked.push(b.contents.at(-1).parts.map(x => x.text).join(" "));
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "TITLE: BWM — what changed\nTOPIC: Maritime › Conventions › BWM\nPOINTS:\n- New guidance on D-2 commissioning tests [1].\nCONFIDENCE: medium" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://www.imo.org/bwm", title: "imo.org" } }] } }] })); }
    const q = b.contents.at(-1).parts[0].text; chats.push(all);
    const reply = /arriving at busan/i.test(q) && /Port arrival: when I say arriving/.test(all) ? "Port arrival skill: Busan — pilot boards at the pilot station; check your pre-arrival checklist." : "Answer to: " + q;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply, action: null }) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8056", WK = "http://127.0.0.1:8842";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8842);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8056);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const now = Date.now();
const d = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0"); };
const longName = n => { const x = new Date(); x.setDate(x.getDate() + n); return x.getDate() + " " + x.toLocaleString("en-GB", { month: "long" }) + " " + x.getFullYear(); };
const body = "Ballast water must be exchanged at least 200 nm from the nearest land in water at least 200 metres deep. Record every operation in the ballast water record book.";
const NOTES = [
  { id: "c1", title: "Safety Equipment Certificate", category: "Ship › Certificates", tags: [], body: "<p><i>📎 From file: cert.jpg (certificate)</i></p><h3>Dates</h3><ul><li>Certificate expires: " + d(12) + "</li></ul>", source: "attachment", createdAt: now, updatedAt: now, deleted: false },
  { id: "c2", title: "Medical", category: "Personal", tags: [], body: "<p>Medical certificate valid until " + longName(40) + ".</p><p>Bought shoes on " + longName(5) + ".</p>", source: "note", createdAt: now, updatedAt: now, deleted: false },
  { id: "c3", title: "Old task", category: "Personal", tags: [], body: "<p>Renew passport by " + d(-3) + "</p>", source: "note", createdAt: now, updatedAt: now, deleted: false },
  { id: "b1", title: "Ballast water exchange", category: "Maritime › BWM", tags: ["bwm"], body: "<p>" + body + "</p>", source: "note", createdAt: now - 5000, updatedAt: now, deleted: false },
  { id: "b2", title: "BWM exchange rules", category: "Unsorted", tags: ["ballast"], body: "<p>" + body + " Keep it on board.</p>", source: "note", createdAt: now, updatedAt: now, deleted: false }];
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



// greeting headline (once a day)
await p.mouse.click(30, 700); await p.waitForTimeout(400);
let a = await answer();
ok(/Good (morning|afternoon|evening), Mark\. 1 overdue; 1 deadline in the next 30 days — first: Certificate expires, in 12 days\./.test(a), "first open of the day: Max greets with what's due", a);

// Secretary
await say("what's expiring?");
a = await answer();
ok(await vis("#displayScreen") && /^Secretary: 1 overdue — Renew passport \(3 days ago\)\. 2 coming up\. Next: Certificate expires, in 12 days; Medical certificate valid until, \d+ \w+ 20\d\d\.$/.test(a) && !/shoes/.test(a), "Secretary finds deadlines in notes and files (ignores dates that aren't deadlines)", a);
await p.click("#miniHome");
await say("brief me");
a = await answer();
ok(/deadlines? in the next 30 days/.test(a) && (await p.locator("#dispBody").textContent()).includes("Waiting for you"), "“brief me” → full briefing on screen", a);
await p.screenshot({ path: process.env.SHOT_DIR + "/briefing.png", fullPage: true });
await p.click("#miniHome");

// Researcher
await say("researcher, keep an eye on BWM updates");
ok(/I’ll keep an eye on BWM/.test(await answer()), "Researcher: watch a topic", await answer());
await say("check my watch list");
a = await answer();
ok(/found updates on 1 topic/.test(a) && /since|last 12 months/.test(researchAsked.at(-1)), "Researcher checks the watch list and puts findings in the inbox", a);
await say("what did the researcher find");
ok(await vis("#researchScreen") && (await p.locator("#resTitle").textContent()).includes("BWM"), "research inbox → opens for your approval", await answer());
await say("discard it");
await p.click("#miniHome");
await say("fact check my ballast note");
ok(await vis("#researchScreen") && /Is this still correct and up to date\? Note "Ballast water exchange"/.test(researchAsked.at(-1)), "Researcher fact-checks a note", researchAsked.at(-1));
await say("discard it");
await p.click("#miniHome");

// Librarian
await say("librarian");
a = await answer();
ok(/^Librarian: you have 5 notes in/.test(a) && /1 not filed/.test(a) && /1 possible duplicate/.test(a), "“librarian” → library report", a);
await p.click("#miniHome");
await say("find duplicate notes");
ok(/found 1 possible duplicate/.test(await answer()), "Librarian finds duplicates", await answer());
await say("merge them");
const notes = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")));
const keep = notes.find(n => n.id === "b1"), drop = notes.find(n => n.id === "b2");
ok(drop.deleted && /Merged from “BWM exchange rules”/.test(keep.body) && /Keep it on board/.test(keep.body) && keep.tags.includes("ballast"), "“merge them” → one note with both texts, nothing lost");

// skills
await p.click("#miniHome");
await say("new skill port arrival: when I say arriving at a port, list its pilot rules and my pre-arrival checklist");
ok(/Learned a new skill: “Port arrival”/.test(await answer()), "teach a skill by voice", await answer());
await say("arriving at busan tomorrow");
ok((await answer()).startsWith("Port arrival skill: Busan"), "Max follows the skill (skills are sent to his brain)", await answer());
await say("show my skills");
ok(/taught me 1 skill: Port arrival/.test(await answer()), "show skills", await answer());

// crew screen + routing
await say("show me my crew");
const crew = await p.locator("#crewBody").textContent();
ok(await vis("#crewScreen") && /Secretary/.test(crew) && /Watching: BWM/.test(crew) && /Librarian/.test(crew) && /Port arrival/.test(crew), "crew screen shows each crew member's work", crew.slice(0, 300));
await p.screenshot({ path: process.env.SHOT_DIR + "/crew.png", fullPage: true });
await say("forget skill port arrival");
ok(/Forgot the skill “Port arrival”/.test(await answer()), "forget a skill", await answer());
await say("secretary, what's due this year");
ok(/^Secretary:/.test(await answer()), "naming a crew member routes the job to them", await answer());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
