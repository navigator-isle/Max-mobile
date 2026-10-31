// Phone: projects — open by voice, check if up, change requests (with and without GitHub), merge only after "yes", passage plans.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const gh = [], gem = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://api.github.com")) {
    gh.push({ url, method: o.method || "GET", body: o.body ? JSON.parse(o.body) : null });
    if (url.endsWith("/issues") && o.method === "POST") return new Response(JSON.stringify({ number: 12, title: JSON.parse(o.body).title, html_url: "u" }), { status: 201 });
    if (url.includes("/issues?state=open")) return new Response(JSON.stringify([{ number: 12, title: "[Max] Add a Pokémon menu", html_url: "u" }]));
    if (url.includes("/pulls?state=open")) return new Response(JSON.stringify([{ number: 13, title: "Add a Pokémon menu", html_url: "u", head: { ref: "x" } }]));
    if (/\/pulls\/13$/.test(url)) return new Response(JSON.stringify({ number: 13, state: "open", title: "Add a Pokémon menu", head: { sha: "s" } }));
    if (url.includes("/check-runs")) return new Response(JSON.stringify({ check_runs: [{ name: "test", status: "completed", conclusion: "success" }] }));
    if (url.endsWith("/merge")) return new Response(JSON.stringify({ merged: true }));
  }
  if (url === "https://hobbyisle.com/" || url.startsWith("https://navigator-isle.github.io")) return new Response("ok");
  if (url.startsWith("https://draft-calculator.github.io")) return new Response("err", { status: 404 });
  if (url.includes("generativelanguage")) {
    const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
    const action = /pok/i.test(q) && /hobby/i.test(q) ? { type: "project_request", details: { project: "Hobby Isle", request: "Add a Pokémon menu" } } :
      /sealex/i.test(q) && /dark/i.test(q) ? { type: "project_request", details: { project: "SeaLex", request: "Add a dark mode" } } :
      /requests/i.test(q) ? { type: "list_requests", details: { project: "Hobby Isle" } } :
      /publish|merge/i.test(q) ? { type: "merge_request", details: { project: "Hobby Isle", number: 13 } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Okay." : "Answer to: " + q, action }) }] } }] }));
  }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8051", WK = "http://127.0.0.1:8837";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8837);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8051);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
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

let g = gem.length; await say("open SeaLex");
ok(gem.length === g && (await p.evaluate(() => window.__opened.at(-1))).includes("claude.ai/artifact/AzwR4") && (await answer()).includes("Opening SeaLex"), "“open SeaLex” opens it instantly (no AI)");
ok(await p.locator("#noteRefs a", { hasText: "Open SeaLex" }).count() === 1, "an Open button is shown too (in case the phone blocks pop-ups)");
await say("are my apps up?");
const a1 = await answer();
ok(await vis("#projectsScreen") && /Quick Draft Calculator is not answering/.test(a1) && /Hobby Isle/.test(a1) && /inside Claude/.test(a1), "“are my apps up?” → checks sites, reports the one that's down, honest about Claude apps", a1);
ok(await p.locator(".proj .dot.down").count() === 1 && await p.locator(".proj .dot.up").count() >= 3, "projects screen shows up/down dots");
await p.screenshot({ path: process.env.SHOT_DIR + "/projects.png" });
await p.click("#miniHome");
await say("what passage plans do I have");
ok((await answer()).includes("2 saved passage plans") && (await answer()).startsWith("You have 2 saved passage plans: Longview"), "reads saved passage plans from Passage Planner", await answer());

// change requests without GitHub → saved as notes
await say("on hobby isle please add a pokemon menu");
ok((await answer()).includes("Saved as a change request for Hobby Isle") && gh.length === 0, "without GitHub: request saved in notes");
const n1 = await p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3")).find(n => n.category === "Projects › Change requests"));
ok(n1 && n1.title === "Hobby Isle: Add a Pokémon menu", "note filed under Projects › Change requests");
await say("for sealex make a dark mode");
ok((await answer()).includes("lives inside Claude"), "Claude-hosted app: Max explains the change must be made in Claude");

// with GitHub
env = { ...env, GITHUB_TOKEN: "t", MAX_GITHUB_REPOS: "navigator-isle/hobbyisle,navigator-isle/Max-mobile" };
await p.reload(); await p.waitForTimeout(1000);
await say("on hobby isle add a pokemon menu");
ok(gh.some(x => x.method === "POST" && x.url.endsWith("/repos/navigator-isle/hobbyisle/issues")) && (await answer()).includes("change request number 12"), "with GitHub: request filed on GitHub", await answer());
await say("any requests for hobby isle?");
ok((await answer()).includes("fix ready — pull request 13"), "lists requests and fixes waiting", await answer());
await say("publish pull request 13 on hobby isle");
ok((await answer()).includes("Say “yes, merge it”") && !gh.some(x => x.method === "PUT"), "asks before publishing");
await say("no");
ok((await answer()).includes("won’t publish") && !gh.some(x => x.method === "PUT"), "“no” cancels");
await say("publish pull request 13 on hobby isle"); await say("yes, merge it");
ok(gh.some(x => x.method === "PUT" && x.url.endsWith("/pulls/13/merge")) && (await answer()).includes("Published"), "“yes, merge it” publishes after the tests passed");

// settings editor
await p.click("#openConnection"); await p.waitForTimeout(300);
await p.locator("#projAddName").scrollIntoViewIfNeeded();
await p.fill("#projAddName", "Officer Checklist Netlify"); await p.fill("#projAddUrl", "https://officer.netlify.app"); await p.click("#projAdd");
ok((await p.locator("#projEditList").textContent()).includes("Officer Checklist Netlify — https://officer.netlify.app"), "add a project in Settings");
ok((await p.locator("#githubStatus").textContent()).includes("connected (2 repos)"), "settings show GitHub status");
await p.click("#closeConnection");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
