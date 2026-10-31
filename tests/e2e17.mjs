// Phone: Max updates himself — when a new version is published he reloads when you come back to him, not in the middle of something.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath] = process.argv;
let extra = "", served = 0;
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; let body = fs.readFileSync(path.join(path.dirname(pagePath), f), "utf8"); if (f === "index.html") { served++; body += extra; }
  r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(body); }).listen(8062);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"] });
await ctx.addInitScript(() => { localStorage.setItem("max_notes_migrated_v1", "1"); });
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
let loads = 0; p.on("load", () => loads++);
await p.goto("http://127.0.0.1:8062/Max-mobile/"); await p.waitForTimeout(9500);
const first = loads;
await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await p.waitForTimeout(1500);
ok(loads === first, "no new version → no reload");
extra = "\n<!-- new version -->";
await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await p.waitForTimeout(3500);
ok(loads === first + 1, "new version published → Max reloads himself when you come back", loads + " vs " + first);
ok(/UPDATED MYSELF/.test(await p.locator("#homeStatus").textContent()), "and says he updated", await p.locator("#homeStatus").textContent());
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
