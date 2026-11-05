// Phone: departments, and the website team — security & SEO check, SEO researcher, content writer.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const gem = [], hits = [];
const PAGE = `<!doctype html><html><head><title>Hobby Isle — Gundam Gunpla kits, guides and the best deals for collectors in 2026</title><meta name="viewport" content="width=device-width"><link rel="canonical" href="https://hobbyisle.com/"></head><body><h1>Hobby Isle</h1><img src="/a.jpg"><img src="/b.jpg" alt="RG Hi-Nu"><a href="/guides">Guides</a><a href="/old-page">Old</a><p>${"word ".repeat(400)}</p></body></html>`;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); hits.push(url);
  if (url === "https://hobbyisle.com/") return new Response(PAGE, { headers: { "strict-transport-security": "max-age=31536000", "content-type": "text/html" } });
  if (url.startsWith("http://hobbyisle.com")) return new Response(null, { status: 301, headers: { location: "https://hobbyisle.com/" } });
  if (url === "https://hobbyisle.com/robots.txt") return new Response("User-agent: *");
  if (url === "https://hobbyisle.com/sitemap.xml") return new Response("no", { status: 404 });
  if (url === "https://hobbyisle.com/guides") return new Response("ok");
  if (url === "https://hobbyisle.com/old-page") return new Response("gone", { status: 404 });
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
    let text;
    if (/SEO researcher/.test(q)) text = JSON.stringify({ ideas: [{ keyword: "best rg gundam kits 2026", intent: "buy", title: "Best RG Gundam Kits to Buy in 2026", why: "High buying intent and few up-to-date lists." }, { keyword: "hg vs rg vs mg", intent: "compare", title: "HG vs RG vs MG: Which Gunpla Grade Is Right for You?", why: "Beginners search this constantly." }], competitors: ["Gundam Planet"], quickWins: ["Add a sitemap.xml"] });
    else if (/You write for the website/.test(q)) text = JSON.stringify({ title: "RG Hi-Nu Gundam Review", metaDescription: "An honest look at the RG Hi-Nu Gundam: build, articulation, and whether it is worth your money in 2026.", slug: "rg-hi-nu-review", keywords: ["rg hi-nu"], outline: ["Build", "Verdict"], bodyMarkdown: "## Build\n\nThe **RG Hi-Nu** is detailed.\n\n## Verdict\n\n1. Great poses\n2. Check current price\n\n*As an affiliate we may earn a commission.*", imageIdeas: [{ shot: "Full front pose", alt: "RG Hi-Nu Gundam front pose", filename: "rg-hi-nu-front.jpg" }], checkFacts: ["Release year of the RG Hi-Nu"] });
    else text = JSON.stringify({ reply: "Answer to: " + q, action: null });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://example.com/gunpla", title: "Gunpla guide" } }] } }] })); }
  return new Response("{}", { status: 404 });
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8063", WK = "http://127.0.0.1:8849";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8849);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8063);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const plans = JSON.stringify([{ id: "a", name: "Manila–Singapore", title: "Manila → Singapore", nm: 1350.4, saved: 2 }, { id: "b", name: "Longview", title: "Longview → Kaohsiung", nm: 5600, saved: 3 }]);
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", pp2_plans: plans }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();

const disp = () => p.locator("#dispBody").textContent();
await say("show my departments");
const crew = await p.locator("#crewBody").textContent();
ok(await vis("#crewScreen") && ["APPS", "WEBSITES", "TRADING", "NOTES", "SCHEDULE", "TRAINING", "MUSIC", "ACTIVITY"].every(x => crew.includes(x)), "“show my departments” → seven departments and the activity log", crew.slice(0, 200));
ok(/Passage Planner — on Google Play/.test(crew) && /Quick Draft Calculator — website only/.test(crew) && /SEO researcher/.test(crew) && /paper trader/.test(crew), "each lists its workers and apps");
let g = gem.length;
await say("check hobby isle security");
let a = await answer(); const t = await disp();
ok(gem.length === g && /Hobby Isle scored \d+ out of 100/.test(a), "“check Hobby Isle security” → audit with a score, no AI needed", a);
ok(/old-page \(404\)/.test(t) && /sitemap\.xml/.test(t) && /1 of 2 pictures have no alt text/.test(t) && /No affiliate disclosure/.test(t) && /Missing Content-Security-Policy/.test(t), "finds broken links, missing sitemap, alt text, disclosure, security headers", t.slice(0, 400));
ok(/✓ http:\/\/ sends visitors to the secure https/.test(t) && /✓ HSTS/.test(t), "and lists what's already fine");
await p.locator("#dispBody button", { hasText: "Save to notes" }).first().click(); await p.waitForTimeout(200);
ok(await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3") || "[]").some(n => n.category === "Websites › Hobby Isle › Audits")), "audit saved under Websites › Hobby Isle › Audits");
await say("seo ideas for hobby isle");
a = await answer();
ok(/found 2 ideas for Hobby Isle\. The top one: Best RG Gundam Kits/.test(a) && /Gundam \/ Gunpla/.test(JSON.stringify(gem.at(-1))) && gem.at(-1).tools?.[0]?.google_search, "SEO researcher searches the web with the site's niche", a);
ok(/BUY/.test(await disp()) && /Gunpla guide/.test(await disp()), "ideas with intent and sources on screen");
await p.locator("#dispBody button", { hasText: "Write this post" }).first().click(); await p.waitForTimeout(1500);
ok(/Draft — RG Hi-Nu Gundam Review/.test(await p.locator("#dispTitle").textContent()) && /nothing is published/.test(await p.locator("#dispSub").textContent()), "“Write this post” → a draft, clearly not published");
await say("write a review of the rg hi-nu");
a = await answer(); const dt = await disp();
ok(/Here’s a draft for Hobby Isle: “RG Hi-Nu Gundam Review”/.test(a) && /flagged 1 fact/.test(a) && /review article/.test(JSON.stringify(gem.at(-1))), "“write a review of …” → review draft, facts to double-check flagged", a);
ok(/Meta description \(\d+\)/.test(dt) && /alt: “RG Hi-Nu Gundam front pose”/.test(dt) && /Check these before publishing/.test(dt) && await p.locator("#dispBody h2", { hasText: "Verdict" }).count() >= 1, "SEO title/meta, picture alt text + file names, formatted post");
ok(/no fake reviews, no invented personal experiences/.test(JSON.stringify(gem.at(-1))), "writer is told: no fake reviews or invented experiences");
for (const t of ["draft an email to ana about the meeting", "write a note about engine oil"]) { await say(t); ok(!/Here’s a draft for Hobby Isle/.test(await answer()), "“" + t + "” is not a website post", await answer()); await say("no"); }
// The brain's router: the answer shows which desk handled it, and a follow-up stays with that desk.
const lastChat = () => gem.filter(g => g.systemInstruction).at(-1);
const chip = () => p.evaluate(() => [...document.querySelectorAll("#noteRefs .desk-chip")].map(x => x.textContent).join("|"));
await say("what does a doji candlestick mean");
ok(/Trading desk/.test(await chip()) && /SPECIALIST ON DUTY: Trading desk/.test(JSON.stringify(lastChat())), "a trading question is answered by the 📈 Trading desk, and the phone shows it", await chip());
await say("why does it matter");
ok(/Trading desk/.test(await chip()) && /SPECIALIST ON DUTY: Trading desk/.test(JSON.stringify(lastChat())), "a follow-up stays with the same desk", await chip());
await say("what is the capital of norway");
ok((await chip()) === "" && !/SPECIALIST ON DUTY/.test(JSON.stringify(lastChat())), "a general question goes to Max himself (no desk label)", await chip());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
