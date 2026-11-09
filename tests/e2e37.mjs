// Phone: Settings → Update Max's server. Check shows versions; Install updates; if the new version doesn't start, the app rolls back.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath] = process.argv; const dir = path.dirname(pagePath);
const srv = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8097);
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const b = await chromium.launch({ args: ["--no-sandbox"] });
async function run(scenario) {
  const ctx = await b.newContext({ ...devices["Pixel 7"] }); let live = "max-worker-OLD", log = [];
  await ctx.addInitScript(() => { localStorage.setItem("max_notes_migrated_v1", "1"); localStorage.setItem("max_struct_maritime_v1", "1"); localStorage.setItem("jarvis_api_base_v2", "https://max-ai-backend.mjgaly-mg.workers.dev"); localStorage.setItem("max_passcode", "1234"); localStorage.setItem("max_pass", "1234"); });
  await ctx.route("https://max-ai-backend.mjgaly-mg.workers.dev/**", r => { const u = new URL(r.request().url());
    if (u.pathname === "/health") return r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: true, version: live }) });
    return r.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: "{}" }); });
  await ctx.route("https://max-updater.mjgaly-mg.workers.dev/**", async r => { const u = new URL(r.request().url()); log.push(u.pathname + " pass=" + r.request().headers()["x-update-pass"]);
    const J = (o, s = 200) => r.fulfill({ status: s, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }, body: JSON.stringify(o) });
    if (r.request().method() === "OPTIONS") return J({}, 204);
    if (u.pathname === "/check") return J({ available: "max-worker-NEW", size: 391000, built: "2026-11-09T08:00:00Z", notes: ["Keyboard on home screen"] });
    if (u.pathname === "/deploy") { live = scenario === "ok" ? "max-worker-NEW" : "max-worker-BROKEN"; return J({ ok: true, installed: "max-worker-NEW", previous: "11111111-2222-3333-4444-555555555555" }); }
    if (u.pathname === "/rollback") { live = "max-worker-OLD"; return J({ ok: true }); }
    return J({ error: "?" }, 404); });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message));
  await p.goto("http://127.0.0.1:8097/"); await p.waitForTimeout(1200);
  const passSet = await p.evaluate(() => window.maxPass());
  await p.click("#openConnection"); await p.waitForTimeout(400);
  const uval = await p.inputValue("#updaterUrl");
  await p.click("#updCheck"); await p.waitForTimeout(800);
  const t1 = await p.textContent("#updResult"), dis = await p.isDisabled("#updInstall");
  await p.click("#updInstall"); await p.waitForTimeout(scenario === "ok" ? 4500 : 12000);
  for (let i = 0; i < 30 && /Installing|Going back/.test(await p.textContent("#updResult")); i++) await p.waitForTimeout(1000);
  const t2 = await p.textContent("#updResult");
  await ctx.close(); return { passSet, uval, t1, dis, t2, log, errs };
}
let r = await run("ok");
ok(r.uval === "https://max-updater.mjgaly-mg.workers.dev", "updater address is filled in by itself from Max's server address", r.uval + " pass=" + r.passSet);
ok(/Running now: max-worker-OLD/.test(r.t1) && /Available: max-worker-NEW/.test(r.t1) && /Keyboard on home screen/.test(r.t1) && !r.dis, "Check: shows running vs available version and what's new; Install is enabled", r.t1);
ok(/✅ Max’s server is now max-worker-NEW/.test(r.t2) && r.log.every(x => /pass=/.test(x)), "Install: confirms the new version is running (checked on /health)", r.t2 + " | " + r.log.join(","));
r = await run("broken");
ok(/put back to the previous version \(max-worker-OLD\)/.test(r.t2) && r.log.some(x => x.startsWith("/rollback")), "if the new version doesn't start, the app rolls back by itself and says nothing is lost", r.t2 + " | " + r.log.join(","));
ok(!r.errs.length, "no page errors", r.errs.join(" | "));
await b.close(); srv.close(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
