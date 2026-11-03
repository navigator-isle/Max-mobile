// Phone: skills from notes and files, walk-through, improving skills, "learn this", meaning search, conflicting notes.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const gem = [], embeds = [];
// fake embeddings: words about the same idea land on the same numbers, so "meaning" matches without shared words
const CONCEPT = [["ballast", "bwm", "d-1", "d1", "exchange", "sediment", "nautical", "nm"], ["amos", "monthly", "report", "work", "order", "workflow"], ["oil", "lube", "lubricating", "viscosity"], ["noon", "position", "speed"]];
const hsh = x => [...x].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const vec = t => { const v = new Array(256).fill(0); const w = String(t).toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean); w.forEach(x => { CONCEPT.forEach((c, i) => { if (c.includes(x)) v[i * 10] += 1; }); v[50 + hsh(x) % 200] += 0.12; }); v[255] = 0.05; return v; };
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes(":batchEmbedContents")) { const b = JSON.parse(o.body); embeds.push(b); return new Response(JSON.stringify({ embeddings: b.requests.map(r => ({ values: vec(r.content.parts[0].text) })) })); }
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts.map(p => p.text || "").join("\n");
    let text;
    if (/You maintain a "skill"/.test(q)) text = JSON.stringify({ name: "AMOS monthly report", when: "when he asks how to do the AMOS monthly report", steps: ["Monthly Reports AMOS (left toolbar)", "Monthly Reports (Work Order)", "Ok", "Ok again", "Select GOF-06.4 Water Testing Record", "Work Flow", "Started"], rules: ["Attach the water test file before closing"], format: "", example: "walk me through the AMOS monthly report", changed: "Step 4 now says Ok again." });
    else if (/Turn this/.test(q) && /AMOS/.test(q)) text = JSON.stringify({ name: "AMOS monthly report", when: "when he asks how to do the AMOS monthly report", steps: ["Monthly Reports AMOS (left toolbar)", "Monthly Reports (Work Order)", "Ok", "Select GOF-06.4 Water Testing Record", "Work Flow", "Started"], rules: ["Attach the water test file before closing"], format: "", example: "walk me through the AMOS monthly report" });
    else if (/Turn this/.test(q)) text = JSON.stringify({ name: "Noon report", when: "when he asks for the noon report", steps: ["Take position at noon", "Log speed and distance", "Send to office"], rules: ["Ship's time"], format: "", example: "" });
    else if (/careful librarian/.test(q)) text = JSON.stringify({ results: [{ pair: 1, conflict: true, what: "One note says exchange at least 200 nm from land, the other says 50 nm.", outdated: "" }] });
    else if (/He just sent you/.test(q)) text = JSON.stringify({ kind: "procedure", title: "Noon report procedure", topic: "Work › Reports", summary: "How to send the noon report.", points: ["Noon position", "Speed"], dates: [], amounts: [], text: "1. Take position\n2. Log speed\n3. Send", tags: ["noon"], details: "## Overview\n\nThe noon report records the ship's **position**, speed and distance at noon.\n\n## Steps\n\n1. Take position\n2. Log speed\n3. Send to office", procedure: { name: "Noon report", when: "when he asks for the noon report", steps: ["Take position at noon", "Log speed and distance", "Send to office"], rules: [] }, answer: "", say: "This is your noon report procedure." });
    else text = JSON.stringify({ reply: "Answer to: " + q.split("\n").pop(), action: null });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] })); }
  return new Response("{}", { status: 404 });
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8065", WK = "http://127.0.0.1:8851";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8851);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8065);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const mock = () => { window.__spoken = []; window.__q = []; window.__opened = [];
  class R { start() { if (this.continuous) return; const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 60); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 15); }, cancel() {}, getVoices() { return []; } } });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.open = (u) => { window.__opened.push(u); return {}; }; };
const NOTES = JSON.stringify([
  { id: "n1", title: "Monthly Reports (AMOS)", category: "Work › AMOS", tags: [], body: "<ol><li>Monthly Reports AMOS (left toolbar)</li><li>Monthly Reports (Work Order)</li><li>Ok</li><li>Select GOF-06.4 Water Testing Record</li><li>Work Flow</li><li>Started</li></ol>", createdAt: 1790000000000, updatedAt: 1790000000000 },
  { id: "n2", title: "Ballast water exchange", category: "Maritime › BWM", tags: [], body: "<p>Ballast exchange must be done at least 200 nautical miles from the nearest land, in water at least 200 m deep (D-1).</p>", createdAt: 1790000000000, updatedAt: 1790000000000 },
  { id: "n3", title: "BWM quick notes", category: "Maritime › BWM", tags: [], body: "<p>Ballast exchange can be done 50 nm from land when 200 nm is not possible. Sediments go ashore.</p>", createdAt: 1790000000000, updatedAt: 1790000000000 },
  { id: "n4", title: "Lube oil", category: "Engine", tags: [], body: "<p>Check lubricating oil viscosity weekly and before long passages.</p>", createdAt: 1790000000000, updatedAt: 1790000000000 }]);
const plans = JSON.stringify([{ id: "a", name: "Manila–Singapore", title: "Manila → Singapore", nm: 1350.4, saved: 2 }, { id: "b", name: "Longview", title: "Longview → Kaohsiung", nm: 5600, saved: 3 }]);
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(([s, m]) => { if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); } (new Function("return " + m)())(); },
  [{ jarvis_api_base_v2: WK, max_pass: "pw", max_notes_migrated_v1: "1", pp2_plans: plans, max_notes_v3: NOTES }, mock.toString()]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(ORIGIN + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible();
const say = async t => { const n = await p.evaluate(() => window.__spoken.length); await p.evaluate(x => window.__q.push(x), t);
  await p.waitForTimeout(150); await p.click((await vis("#maxOrb")) ? "#maxOrb" : "#miniOrb");
  await p.waitForFunction(n => window.__spoken.length > n && !document.getElementById("maxOrb").classList.contains("speaking"), n, { timeout: 15000 }).catch(() => {});
  await p.waitForTimeout(200); await p.evaluate(() => document.getElementById("homeStop").click()); };
const answer = async () => (await vis("#homeAnswer")) ? p.locator("#homeAnswer").textContent() : p.locator("#miniSay").textContent();

const disp = () => p.locator("#dispBody").textContent();
const notes = () => p.evaluate(() => JSON.parse(localStorage.getItem("max_notes_v3") || "[]").filter(n => !n.deleted));
await p.waitForTimeout(9500); // background meaning-index runs after start
ok(embeds.length >= 1 && embeds[0].requests.length === 4 && embeds[0].requests[0].outputDimensionality === 256 && await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("max_vec")).items).length) === 4, "notes are indexed by meaning in the background (small 256-number fingerprints)", JSON.stringify(embeds[0]?.requests?.[0] || {}).slice(0, 150));
// meaning search: no shared words with the note title
let g = gem.length;
await say("explain the d1 standard to me");
const sent = JSON.stringify(gem.at(-1));
ok(/200 nautical miles/.test(sent) && !/viscosity/.test(sent), "a question with different words still finds the right note (by meaning), unrelated notes left out");
// make a skill from the open note
await p.click("#maxOrb", { button: "right" }); await p.click("[data-go=notes]"); await p.locator(".tree-note", { hasText: "Monthly Reports (AMOS)" }).click(); await p.waitForTimeout(300);
await say("make this a skill");
ok(/I’ll learn “AMOS monthly report”: 6 steps and 1 rule\. Keep it as a skill\?/.test(await answer()) && /Monthly Reports \(Work Order\)/.test(await disp()), "“make this a skill” → shows the steps and asks first", await answer());
await say("yes");
const sk = (await notes()).find(n => n.title === "Skill: AMOS monthly report");
ok(sk && /<ol>/.test(sk.body) && /When:/.test(sk.body) && /Learned from: Monthly Reports \(AMOS\)/.test(sk.body) && sk.category === "Max › Skills", "saved as a skill: when to use it, numbered steps, rules, where it came from", sk?.body?.slice(0, 200));
// walk-through
await say("walk me through the amos monthly report");
ok(/AMOS monthly report\. 6 steps\. .*Step 1: Monthly Reports AMOS \(left toolbar\)/.test(await answer()) && /Step 1 of 6/.test(await p.locator("#dispTitle").textContent()), "“walk me through …” → step 1 of 6 on screen and spoken", await answer());
await say("next"); ok(/^Step 2: Monthly Reports \(Work Order\)/.test(await answer()), "“next” → step 2", await answer());
await say("back"); ok(/^Step 1:/.test(await answer()), "“back” → step 1");
await say("step 5"); ok(/^Step 5: Work Flow/.test(await answer()), "“step 5” jumps", await answer());
await say("repeat"); ok(/^Step 5: Work Flow/.test(await answer()), "“repeat”");
await say("next"); await say("next");
ok(/last step\. “AMOS monthly report” is done/.test(await answer()), "after the last step: done", await answer());
await say("next"); ok(!/^Step/.test(await answer()), "walk-through ended (“next” is no longer captured)");
// only the relevant skill goes to the brain, in full
await p.evaluate(() => { const a = JSON.parse(localStorage.getItem("max_notes_v3")); a.push({ id: "s2", title: "Skill: Port arrival", category: "Max › Skills", tags: ["skill"], body: "<p><b>When:</b> when he says arriving at a port</p><h3>Steps</h3><ol><li>List pilot rules</li></ol>", createdAt: 5, updatedAt: 5 }); for (const k of ["Fuel report", "Garbage log", "Drill schedule", "Crew change", "Bunker plan"]) a.push({ id: "x" + k, title: "Skill: " + k, category: "Max › Skills", tags: ["skill"], body: "<p><b>When:</b> when he asks for the " + k.toLowerCase() + "</p><h3>Steps</h3><ol><li>Do " + k + "</li></ol>", createdAt: 5, updatedAt: 5 }); localStorage.setItem("max_notes_v3", JSON.stringify(a)); });
g = gem.length; await say("what's the trick for the amos monthly report water testing");
const skills = gem.at(-1) && JSON.parse(JSON.stringify(gem.at(-1))).systemInstruction ? JSON.stringify(gem.at(-1).systemInstruction) : JSON.stringify(gem.at(-1));
ok(/AMOS monthly report: When: when he asks how to do the AMOS monthly report.*Select GOF-06\.4/.test(skills) && /Port arrival: When: when he says arriving at a port/.test(skills) && !/List pilot rules/.test(skills), "with many skills, the matching one goes to the brain in full, others only by name and when-to-use (a few skills all go in full)");
// improve by correction
await say("improve the amos monthly report skill: step 4 should be Ok again");
ok(/Change “AMOS monthly report”: Step 4 now says Ok again\. Save it\?/.test(await answer()) && /BEFORE/.test(await disp()), "“improve the … skill: …” → shows the change and the old version, asks first", await answer());
await say("yes");
ok(/<li>Ok again<\/li>/.test((await notes()).find(n => n.title === "Skill: AMOS monthly report").body), "skill updated");
// learn from a file: detailed summary + procedure → skill
fs.writeFileSync(path.join(process.env.SHOT_DIR, "noon.txt"), "Noon report: 1. Take position 2. Log speed 3. Send");
await p.setInputFiles("#attachInput", path.join(process.env.SHOT_DIR, "noon.txt")); await p.waitForTimeout(1500);
ok(/The noon report records the ship/.test(await disp()) && await p.locator("#dispBody h2", { hasText: "Overview" }).count() === 1 && await p.locator("#dispBody button", { hasText: "Learn “Noon report” as a skill" }).count() === 1, "a file with steps: detailed summary on screen + “learn as a skill” button");
await say("learn this");
const learned = (await notes()).find(n => n.title === "Noon report procedure");
ok(learned && /<h2>Detailed summary<\/h2>/.test(learned.body) && /From file: noon\.txt/.test(learned.body) && /say “make it a skill”/.test(await answer()), "“learn this” → saved as a detailed study note (source + date), and suggests a skill", await answer());
// conflicts
await say("check my notes for conflicts");
const cf = await disp();
ok(/CONFLICT/.test(cf) && /200 nm from land, the other says 50 nm/.test(cf) && /Ballast water exchange/.test(cf), "librarian finds the two ballast notes that disagree", cf.slice(0, 300));
ok(/1 pair of notes disagree/.test(await answer()), "and says so", await answer());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
