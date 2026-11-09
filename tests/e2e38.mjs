// Phone: the typing box is always on Max's home screen; "hide keyboard" hides it and that is remembered; "show keyboard" brings it back.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath] = process.argv; const dir = path.dirname(pagePath);
const srv = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8098);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ args: ["--no-sandbox"] }); const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(() => { localStorage.setItem("max_notes_migrated_v1", "1"); localStorage.setItem("max_struct_maritime_v1", "1");
  window.__q = []; class R { start() { const t = window.__q.shift(); setTimeout(() => { if (t) this.onresult && this.onresult({ results: [[{ transcript: t }]] }); else this.onerror && this.onerror({ error: "no-speech" }); this.onend && this.onend(); }, 50); } stop() {} abort() {} }
  window.webkitSpeechRecognition = R; window.SpeechRecognition = R;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { u.onstart && u.onstart(); setTimeout(() => u.onend && u.onend(), 10); }, cancel() {}, getVoices() { return []; } } }); window.SpeechSynthesisUtterance = function (t) { this.text = t; }; });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto("http://127.0.0.1:8098/"); await p.waitForTimeout(1000);
ok(await p.isVisible("#typeRow") && await p.isVisible("#typeInput"), "home screen opens with the typing box showing");
await p.reload(); await p.waitForTimeout(900); ok(await p.isVisible("#typeInput"), "still there after reopening the app");
await p.fill("#typeInput", "hide keyboard"); await p.press("#typeInput", "Enter"); await p.waitForTimeout(900);
ok(!(await p.isVisible("#typeRow")), "typing “hide keyboard” hides it");
await p.reload(); await p.waitForTimeout(900); ok(!(await p.isVisible("#typeRow")), "…and it stays hidden after reopening (his choice is remembered)");
await p.click("#maxOrb", { button: "right" }); await p.click("[data-go=keyboard]"); await p.waitForTimeout(400);
ok(await p.isVisible("#typeInput"), "menu → Keyboard brings it back");
await p.reload(); await p.waitForTimeout(900); ok(await p.isVisible("#typeInput"), "and it stays on again");
ok(!errs.length, "no page errors", errs.join(" | "));
await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
