// Phone: dashboard — visitors from Cloudflare Web Analytics, sales log by voice, totals, and "not connected" honesty.
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
  if (url.includes("generativelanguage")) {
    const q = JSON.parse(o.body).contents.at(-1).parts[0].text;
    const m = q.match(/(\d+(?:\.\d+)?)/);
    const action = /log|earned|made/i.test(q) && m ? { type: "log_sale", details: { project: /hobby/i.test(q) ? "Hobby Isle" : "", amount: Number(m[1]), currency: "USD", source: /amazon/i.test(q) ? "Amazon" : "" } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Okay." : "Answer to: " + q, action }) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8052", WK = "http://127.0.0.1:8838";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8838);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8052);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1" }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();

// no analytics key yet → honest
await say("how many visitors on hobby isle today?");
let a = await answer();
ok(await vis("#projectsScreen") && /aren’t connected yet/.test(a) && cfCalls === 0, "without the analytics key: says visitors aren't connected (no made-up numbers)", a);
ok((await p.locator("#projDash").textContent()).includes("analytics not connected"), "dashboard shows 'analytics not connected'");
await p.click("#miniHome");

// sales log by voice
await say("log 4.20 dollars amazon sales for hobby isle");
a = await answer();
ok(/Logged USD 4\.20 from Amazon for Hobby Isle today/.test(a) && /This month so far: USD 4\.20/.test(a), "“log 4.20 dollars amazon sales for hobby isle” → logged with month total", a);
await say("I earned 10 on hobby isle from amazon");
ok((await answer()).includes("This month so far: USD 14.20"), "second sale adds up", await answer());
const note = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).find(n => n.category === "Projects › Sales log"));
ok(note && note.title === "Sales log — Hobby Isle" && (note.body.match(/<p>/g) || []).length === 2, "sales kept as a note under Projects › Sales log (syncs and backs up)", JSON.stringify(note));
await say("how much did I earn this month?");
ok(/Earnings this month: Hobby Isle USD 14\.20/.test(await answer()), "“how much did I earn this month?” → totals from the log", await answer());
await say("what are my hobby isle sales today");
ok(/Hobby Isle earned USD 14\.20 today/.test(await answer()), "per-project, per-period totals", await answer());

// connect analytics
env = { ...env, CF_ANALYTICS_TOKEN: "cft" };
await say("how many visitors on hobby isle today?");
a = await answer();
ok(/Hobby Isle: 37 visitors today \(52 page views\), 260 in the last 7 days/.test(a) && /Top page today: \/gundam\/pg\//.test(a) && /Sales this month: USD 14\.20/.test(a), "with the key: real visitor numbers, top page and sales together", a);
const dash = await p.locator("#projDash").textContent();
ok(dash.includes("37") && dash.includes("visitors today") && dash.includes("$14.20") && dash.includes("1 site tracked"), "dashboard tiles: visitors today and sales this month", dash);
ok((await p.locator(".proj", { hasText: "Hobby Isle" }).locator(".stats").textContent()).includes("Today 37 visitors · 52 views · 7 days 260"), "Hobby Isle card shows its numbers");
await p.screenshot({ path: process.env.SHOT_DIR + "/dashboard.png" });
await p.click("#miniHome");
await say("how are my sites doing?");
ok(/Hobby Isle: 37 visitors today/.test(await answer()), "“how are my sites doing?” → stats", await answer());

// settings: add a tracked site
await p.click("#openConnection"); await p.waitForTimeout(300);
await p.locator("#projAddName").scrollIntoViewIfNeeded();
await p.fill("#projAddName", "My Blog"); await p.fill("#projAddUrl", "https://blog.example.com"); await p.check("#projAddStats"); await p.click("#projAdd");
ok(await p.evaluate(() => JSON.parse(localStorage.getItem("max_projects")).find(x => x.name === "My Blog")?.analytics === true), "a new project can be marked for visitor numbers");
await p.click("#closeConnection");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
