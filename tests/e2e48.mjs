// 23 Nov 2026 (Mark): drawn diagrams inside notes (figure data-diagram → built-in SVG; never saved into the note).
// Left: Paper trading (₱250,000 is now … + each category) → Overview / Positions by category / Journal (5 → 10 → all, dividends) / Strategy;
// Investments (virtual value + % per account, best rate) → overview, how each is credited, rates kept; Notes = a folder that opens the notes.
// Right: Websites / Apps = errors per item, tap one → overview (websites: visitors day / week / month; apps: status); Security = errors only.
// Notes: no paperclip, Home button, one "Add note" button, menus in words, no tags, note ⋯ = attachment / share / print / delete, attachments read by Max.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath] = process.argv, dir = path.dirname(pagePath), FX = path.join(path.dirname(new URL(import.meta.url).pathname), "fixtures", "dash");
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
let health = { ok: true, version: "max-worker-2026-11-18n", google: "linked (calendar, tasks, gmail)", database: "bound", paperTrading: "running — crypto checked " + new Date().toISOString().slice(0, 10), guard: "last check, 0 problem(s)", lastTrigger: { at: new Date().toISOString() }, emails: "last 2026-11-22T09:45Z “Max paper trading” sent; 3/3 recent sends OK" };
const attSeen = []; let chatModel = "gemini-3.5-flash";
const sP = http.createServer(async (q, r) => { const u = q.url.split("?")[0], J = (o, s = 200) => { r.writeHead(s, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" }); r.end(typeof o === "string" ? o : JSON.stringify(o)); };
  if (q.method === "OPTIONS") return J("{}");
  if (u === "/api/home/paper") return J(fs.readFileSync(path.join(FX, "paper.json"), "utf8"));
  if (u === "/api/home/guide") return J(fs.readFileSync(path.join(FX, "guide.json"), "utf8"));
  if (u === "/api/home/status") return J(fs.readFileSync(path.join(FX, "status.json"), "utf8"));
  if (u === "/health") return J(health);
  if (u === "/api/attachment") { const c = []; for await (const x of q) c.push(x); const b = JSON.parse(Buffer.concat(c).toString()); attSeen.push(b.name);
    return J({ attachment: { kind: "document", title: "Ballast log", topic: "Ship", summary: "Ballast water exchange record PLANKTONMARK for voyage 12.", points: ["Exchange done 200 nm from land"], dates: [], amounts: [], text: Buffer.from(b.data, "base64").toString("utf8"), tags: [] } }); }
  if (u === "/api/link") return J({ attachment: { kind: "web page", title: "IMO BWM page", summary: "BWM Convention overview LINKMARK.", points: [], dates: [], amounts: [], text: "D-2 standard" } });
  if (u === "/api/chat") return J({ reply: "From your note Ballast water: ships must meet the D-2 standard.", model: chatModel, modelRole: chatModel === "gemini-3.5-flash" ? "main" : "backup", notesUsed: ["Ballast water"] });
  if (u.startsWith("/api/")) return J({});
  const f = u.endsWith("sw.js") ? "sw.js" : u.endsWith("sheetjs.js") ? "sheetjs.js" : "index.html"; r.writeHead(200, { "Content-Type": f.endsWith(".js") ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8093);
const B = "http://127.0.0.1:8093";
const b = await chromium.launch({ ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}), args: ["--no-sandbox"] });
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const notes = JSON.stringify([{ id: "n1", title: "Ballast water", category: "Maritime › BWM", tags: ["bwm", "ballast"], body: "<p><b>D-2 standard</b></p><p>Ships must meet the D-2 standard.</p><figure class=\"note-diagram\" data-diagram=\"bwm-exchange-distance\"><figcaption>Exchange distances caption TEXTMARK</figcaption></figure><figure class=\"note-diagram\" data-diagram=\"evil-x\" onclick=\"window.__x=1\"><figcaption>unknown</figcaption></figure><svg onload=\"window.__y=1\"><circle r=\"3\"/></svg>", createdAt: 1, updatedAt: Date.now(), deleted: false }]);
await ctx.addInitScript(([base, n]) => { window.__spoken = []; Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { speak(u) { window.__spoken.push(u.text); u.onend && setTimeout(() => u.onend(), 5); }, cancel() {}, getVoices() { return []; } } }); window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  if (!sessionStorage.getItem("s")) { sessionStorage.setItem("s", 1); localStorage.setItem("jarvis_api_base_v2", base); localStorage.setItem("max_pass", "pw"); localStorage.setItem("max_notes_migrated_v1", "1"); localStorage.setItem("max_notes_v3", n); localStorage.setItem("max_tree_open", JSON.stringify(["Maritime", "Maritime › BWM"])); } }, [B, notes]);
const p = await ctx.newPage(); const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => d.accept());
await p.goto(B + "/"); await p.waitForTimeout(1200);
const vis = s => p.locator(s).isVisible(), txt = s => p.locator(s).first().textContent();
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

await p.click('[data-edge="paper"]'); await p.waitForTimeout(600); await p.click("#tileNotes"); await p.waitForTimeout(600);
await p.locator("#noteList >> text=Ballast water").first().click(); await p.waitForTimeout(800);
ok(await p.locator("#readBody figure.note-diagram .diagram-svg svg").count() === 1, "read view shows the drawn diagram (one SVG for the known key)", String(await p.locator("#readBody figure.note-diagram").count()));
ok(/TEXTMARK/.test(await txt("#readBody figure.note-diagram figcaption")), "the caption text stays under the diagram");
ok(await p.locator("#readBody figure[data-diagram='evil-x'] svg").count() === 0 && await p.locator("#readBody svg").count() === 1, "unknown diagram key draws nothing, stray <svg> from outside text is removed");
ok(await p.evaluate(() => !window.__x && !window.__y), "no script from the note text ran");
const box = await p.locator("#readBody figure.note-diagram .diagram-svg svg").boundingBox();
ok(box && box.width > 200 && box.width <= 420, "diagram fits the phone screen", JSON.stringify(box));
// editing and saving must not store the SVG itself
await p.click("#readEdit").catch(async () => { await p.locator("button", { hasText: /^Edit$/ }).first().click(); }); await p.waitForTimeout(500);
ok(await p.locator("#editorBody figure.note-diagram .diagram-svg svg").count() === 1, "editor shows the diagram too");
await p.locator("#editorBody p").first().click(); await p.keyboard.type(" EDITED"); await p.waitForTimeout(300);
await p.click("#editorSave"); await p.waitForTimeout(1500);
const body = await p.evaluate(() => { const n = JSON.parse(localStorage.getItem("max_notes_v3") || "[]"); return (n.find(x => x.id === "n1") || {}).body || ""; });
ok(/EDITED/.test(body) && /data-diagram="bwm-exchange-distance"/.test(body) && !/diagram-svg/.test(body) && !/viewBox/.test(body), "the saved note keeps only the figure marker and caption, not the SVG", body.slice(0, 300));
ok(errs.length === 0, "no page errors", errs.join(" | "));
console.log("\n" + pass + " passed, " + fail + " failed"); await ctx.close(); await b.close(); sP.close();
process.exit(fail ? 1 : 0);
