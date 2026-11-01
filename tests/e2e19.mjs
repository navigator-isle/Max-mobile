// Phone: app builds — new Passage Planner version to the Play closed test, only after "yes"; never production.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const gh = [], gem = []; let running = false;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://api.github.com")) {
    gh.push({ url, method: o.method || "GET", body: o.body ? JSON.parse(o.body) : null });
    if (url.endsWith("/dispatches")) { running = true; return new Response(null, { status: 204 }); }
    if (url.includes("/actions/workflows/android-build.yml/runs")) return new Response(JSON.stringify({ workflow_runs: running ? [{ run_number: 3, status: "in_progress", conclusion: null, run_started_at: new Date(Date.now() - 4 * 60e3).toISOString(), updated_at: new Date().toISOString(), html_url: "https://github.com/x/runs/3", event: "workflow_dispatch" }, { run_number: 2, status: "completed", conclusion: "success", run_started_at: "2026-10-20T00:00:00Z", updated_at: "2026-10-20T00:10:00Z", html_url: "https://github.com/x/runs/2" }] : [{ run_number: 2, status: "completed", conclusion: "success", run_started_at: "2026-10-20T00:00:00Z", updated_at: "2026-10-20T00:10:00Z", html_url: "u" }] }));
    if (/\/repos\/navigator-isle\/passage-planner-android$/.test(url)) return new Response(JSON.stringify({ default_branch: "main" }));
    return new Response("{}", { status: 404 });
  }
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Answer to: " + q, action: null }) }] } }] })); }
  return new Response("ok");
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8061", WK = "http://127.0.0.1:8847";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", GITHUB_TOKEN: "t", MAX_GITHUB_REPOS: "navigator-isle/navigator-isle.github.io" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8847);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8061);
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

const dispatches = () => gh.filter(x => x.url.endsWith("/dispatches"));
// not allowed yet: Android repo missing from the key
await say("send a new version of passage planner to the closed test");
ok(/Add the Android repository/.test(await answer()) && dispatches().length === 0, "without the Android repo on the key: explains what's missing", await answer());
env.MAX_GITHUB_REPOS = "navigator-isle/navigator-isle.github.io,navigator-isle/passage-planner-android";
await p.evaluate(() => { localStorage.removeItem("x"); }); await p.reload(); await p.waitForTimeout(1200);
let g = gem.length;
await say("send a new version of passage planner to the closed test, release notes: faster routing");
const a1 = await answer();
ok(gem.length === g && /Build a new version of Passage Planner/.test(a1) && /faster routing/.test(a1) && /Production isn’t touched/.test(a1), "voice command understood instantly and asks first", a1);
ok(dispatches().length === 0, "nothing starts before a yes");
ok(/closed test \(Alpha\)/.test(await p.locator("#dispBody").textContent()), "screen shows what will happen");
await say("yes");
const d = dispatches()[0];
ok(d && d.body.ref === "main" && d.body.inputs.track === "alpha" && d.body.inputs.notes === "faster routing" && d.body.inputs.version === "", "after yes: starts the build for the Alpha track with the notes", JSON.stringify(d));
ok(/Started/.test(await answer()), "confirms it started", await answer());
await say("how's the build going");
ok(/version 1\.0\.3, still running/.test(await answer()) && /Build 3/.test(await p.locator("#dispBody").textContent()), "“how's the build” reports progress on screen", await answer());
await say("build passage planner app");
await say("yes");
ok(dispatches().length === 1 && /already running/.test(await answer()), "won't start a second build while one runs", await answer());
await say("no");
// things that must NOT start a build
for (const t of ["make a note about app ideas", "change the play store description to mention tides", "remind me to build a shelf tomorrow", "show passage planner on play store"]) {
  await say(t); ok(!/Build a new version/.test(await answer()), "“" + t + "” is not a build request", await answer()); await say("no");
}
// backend guards
const post = async b => { const r = await worker.fetch(new Request(WK + "/api/github/build", { method: "POST", headers: { "Content-Type": "application/json", Origin: ORIGIN, "X-Max-Pass": "pw" }, body: JSON.stringify(b) }), env); return [r.status, await r.json()]; };
running = false;
let [s1, j1] = await post({ repo: "navigator-isle/passage-planner-android", track: "production", confirm: "BUILD navigator-isle/passage-planner-android" });
ok(s1 === 400 && /testing track/.test(j1.error), "backend refuses production", JSON.stringify(j1));
[s1, j1] = await post({ repo: "navigator-isle/passage-planner-android" });
ok(s1 === 400 && j1.needConfirm, "backend refuses without the spoken yes");
[s1, j1] = await post({ repo: "navigator-isle/hobbyisle", confirm: "BUILD navigator-isle/hobbyisle" });
ok(s1 === 403, "backend refuses repos not on the allowed list");
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
