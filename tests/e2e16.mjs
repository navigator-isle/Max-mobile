// Phone: Google Play — see the listing and test release, change text only after a yes, release notes, reviews.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
let cfCalls = 0; const seen = [], days = [];
const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const SA = JSON.stringify({ client_email: "max-play@x.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\n" + Buffer.from(await crypto.subtle.exportKey("pkcs8", kp.privateKey)).toString("base64") + "\n-----END PRIVATE KEY-----\n" });
let listing = { language: "en-US", title: "Passage Planner", shortDescription: "Plan sea passages offline", fullDescription: "Plans routes. Planning aid only – not for navigation." };
globalThis.fetch = async (u, o = {}) => {
  const url = String(u), method = o.method || "GET"; seen.push(method + " " + url);
  if (url === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "PT", expires_in: 3600 }));
  if (url.includes("androidpublisher")) {
    if (/\/edits$/.test(url)) return new Response(JSON.stringify({ id: "E1" }));
    if (/listings$/.test(url)) return new Response(JSON.stringify({ listings: [listing] }));
    if (/tracks$/.test(url)) return new Response(JSON.stringify({ tracks: [{ track: "qa", releases: [{ name: "1.0.3", versionCodes: ["5"], status: "completed", releaseNotes: [] }] }] }));
    if (/listings\/en-US$/.test(url)) { listing = { ...listing, ...JSON.parse(o.body) }; return new Response("{}"); }
    if (/reviews/.test(url)) return new Response(JSON.stringify({ reviews: [{ authorName: "Capt. R", comments: [{ userComment: { text: "Great ETA tool", starRating: 5 } }] }] }));
    return new Response("{}");
  }
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); const t = b.contents.at(-1).parts[0].text;
    if (/Google Play store text/.test(t)) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ text: "Offline passage planning, ETA and tides" }) }] } }] }));
    const action = /short description/i.test(t) ? { type: "play_update", details: { project: "Passage Planner", field: "shortDescription", instruction: "mention ETA and tides" } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Okay." : "Answer to: " + t, action }) }] } }] })); }
  throw new Error("unexpected " + url);
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8061", WK = "http://127.0.0.1:8847";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw", PLAY_SERVICE_ACCOUNT: SA };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8847);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8061);
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


await say("show passage planner on the play store");
let a = await answer();
ok(/^Passage Planner on Google Play: “Passage Planner”\. qa: 1\.0\.3 · completed/.test(a) && (await p.locator("#dispBody").textContent()).includes("Plan sea passages offline (25/80)"), "see the listing and the closed-test release", a);
await p.click("#miniHome");
await say("change the play store short description of passage planner to mention ETA and tides");
a = await answer();
ok(/^Publish the new short description for Passage Planner on Google Play\? It says: “Offline passage planning, ETA and tides”\./.test(a) && !seen.some(x => x.startsWith("PATCH")), "new text shown first — nothing published yet", a);
await p.screenshot({ path: process.env.SHOT_DIR + "/play.png" });
await say("yes");
ok(/^Published/.test(await answer()) && listing.shortDescription === "Offline passage planning, ETA and tides" && seen.some(x => /:commit/.test(x)), "“yes” → published on Google Play", await answer());
await say("any play store reviews for passage planner");
ok(/1 recent review\. Latest: 5 stars — Great ETA tool/.test(await answer()), "reads reviews", await answer());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
