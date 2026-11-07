// Phone app served by Max's own Worker (Cloudflare): talks to Max on the same address, keeps working, and can
// download a full code backup. On the old GitHub Pages copy it shows where Max moved.
import fs from "node:fs"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const html = fs.readFileSync(process.argv[2], "utf8");
const SELF = "https://max-ai-backend.mjgaly-mg.workers.dev", OLD = "https://navigator-isle.github.io/Max-mobile/";
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices["Pixel 7"], acceptDownloads: true });
const apiHosts = new Set(); let codeAsked = 0;
await ctx.route(/.*/, async route => {
  const u = new URL(route.request().url());
  if ((u.origin === SELF && (u.pathname === "/" || u.pathname === "/index.html")) || u.href === OLD) return route.fulfill({ contentType: "text/html", body: html });
  if (u.pathname.startsWith("/api/") || u.pathname === "/health") {
    apiHosts.add(u.origin);
    if (u.pathname === "/api/backup/code") { codeAsked++; return route.fulfill({ status: 200, headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="max-code-2026-11-08.zip"', "Access-Control-Allow-Origin": u.origin }, body: Buffer.from("PK\x03\x04fakezip") }); }
    return route.fulfill({ status: 200, contentType: "application/json", body: u.pathname === "/health" ? JSON.stringify({ ok: true, version: "t" }) : "{}" });
  }
  if (/\.(png|webmanifest|js)$/.test(u.pathname)) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({ status: 404, body: "" });
});
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
await p.goto(SELF + "/"); await p.waitForTimeout(1500);
const st = await p.evaluate(() => ({ base: localStorage.getItem("jarvis_api_base_v2"), worker: window.maxWorker(), moved: !document.getElementById("movedNote").hidden }));
ok(st.base === SELF && st.worker === SELF, "on Max's own address the app uses that same address for Max", JSON.stringify(st));
ok(!st.moved, "no 'moved' banner on the new address");
ok([...apiHosts].every(h => h === SELF), "every call goes to Max's own address", [...apiHosts].join(","));
// download the code backup from the button
const btn = p.locator("#codeBackupBtn");
ok(await btn.count() === 1, "there is a 'Download all of Max's code' button");
const [dl] = await Promise.all([p.waitForEvent("download", { timeout: 8000 }).catch(() => null), p.evaluate(() => document.getElementById("codeBackupBtn").click())]);
ok(dl && dl.suggestedFilename() === "max-code-2026-11-08.zip" && codeAsked === 1, "tapping it saves max-code-DATE.zip", dl && dl.suggestedFilename());
// old GitHub Pages copy shows where Max went
const p2 = await ctx.newPage(); await p2.goto(OLD); await p2.waitForTimeout(800);
ok(await p2.evaluate(() => !document.getElementById("movedNote").hidden && /max-ai-backend\.mjgaly-mg\.workers\.dev/.test(document.getElementById("movedNote").textContent)), "the old GitHub address shows 'Max now lives on Cloudflare' with the new link");
ok(!errs.length, "no page errors", errs.join(" | "));
await b.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
