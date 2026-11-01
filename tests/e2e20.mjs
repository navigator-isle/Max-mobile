// Phone: weather & sea, personality, usage meter, WhatsApp drafts.
if (!process.env.SHOT_DIR) process.env.SHOT_DIR = (await import("node:os")).tmpdir();
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(process.env.PW_REQUIRE || import.meta.url); const { chromium, devices } = require("playwright");
const [, , pagePath, workerPath] = process.argv;
const wxCalls = [], gem = [];
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("geocoding-api.open-meteo.com")) { wxCalls.push(url); const nm = decodeURIComponent(url.split("name=")[1]);
    if (/atlantis/i.test(nm)) return new Response(JSON.stringify({}));
    const P = { batangas: [13.76, 121.06, "Batangas City", "Calabarzon"], manila: [14.6, 120.98, "Manila", "Metro Manila"], denver: [39.74, -104.99, "Denver", "Colorado"] }[nm.toLowerCase().trim()] || [1, 1, nm, ""];
    return new Response(JSON.stringify({ results: [{ latitude: P[0], longitude: P[1], name: P[2], admin1: P[3], country: P[2] === "Denver" ? "United States" : "Philippines" }] })); }
  if (url.includes("api.open-meteo.com/v1/forecast")) { wxCalls.push(url);
    return new Response(JSON.stringify({ timezone: "Asia/Manila", current: { temperature_2m: 29.4, apparent_temperature: 34.1, relative_humidity_2m: 78, weather_code: 80, wind_speed_10m: 14.2, wind_direction_10m: 225, wind_gusts_10m: 26, pressure_msl: 1008.6, visibility: 24000 },
      daily: { time: ["2026-11-01", "2026-11-02", "2026-11-03"], weather_code: [80, 95, 2], temperature_2m_max: [31, 30, 32], temperature_2m_min: [25, 24, 25], precipitation_probability_max: [60, 85, 10], wind_speed_10m_max: [16, 24, 9], wind_gusts_10m_max: [28, 38, 15], wind_direction_10m_dominant: [225, 240, 90] } })); }
  if (url.includes("marine-api.open-meteo.com")) { wxCalls.push(url); if (/latitude=39\.74/.test(url)) return new Response(JSON.stringify({ error: true, reason: "No data" }), { status: 400 });
    return new Response(JSON.stringify({ current: { wave_height: 1.3, wave_direction: 230, wave_period: 6.5, swell_wave_height: 0.9, swell_wave_direction: 250, swell_wave_period: 9.1 }, daily: { wave_height_max: [1.6, 2.4, 0.8], swell_wave_height_max: [1.0, 1.5, 0.5] } })); }
  if (url.includes("generativelanguage")) { const b = JSON.parse(o.body); gem.push(b); const q = b.contents.at(-1).parts[0].text;
    const action = /whatsapp/i.test(q) && /ana/i.test(q) ? { type: "whatsapp_draft", details: { to: "Ana", text: "Hi Ana, running 20 minutes late. Sorry!" } } : /whatsapp/i.test(q) ? { type: "whatsapp_draft", details: { to: "09171234567", text: "On my way." } } : null;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: action ? "Okay." : "Answer to: " + q, action }) }] } }] })); }
  return new Response("ok");
};
const worker = (await import(workerPath)).default;
const ORIGIN = "http://127.0.0.1:8071", WK = "http://127.0.0.1:8857";
let env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: ORIGIN, MAX_PASSCODE: "pw" };
const sW = http.createServer(async (req, res) => { const c = []; for await (const x of req) c.push(x);
  const r = await worker.fetch(new Request(WK + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD", "OPTIONS"].includes(req.method) ? undefined : Buffer.concat(c) }), env);
  res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer())); }).listen(8857);
const dir = path.dirname(pagePath);
const sP = http.createServer((q, r) => { const f = q.url.split("?")[0].endsWith("sw.js") ? "sw.js" : "index.html"; r.writeHead(200, { "Content-Type": f === "sw.js" ? "text/javascript" : "text/html" }); r.end(fs.readFileSync(path.join(dir, f))); }).listen(8071);
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

const disp = () => p.locator("#dispBody").textContent();
await p.context().grantPermissions([]);
// no saved place and no location permission → asks
await say("what's the weather");
ok(/Where should I check/.test(await answer()), "no place saved and no location → asks where", await answer());
let g = gem.length;
await say("weather in batangas");
let a = await answer();
ok(gem.length === g && /Right now in Batangas City/.test(a) && /29°C and rain showers/.test(a) && /SW 14 knots gusting 26/.test(a) && /waves 1\.3 metres/.test(a), "“weather in Batangas” → instant, with wind in knots and waves", a);
const d1 = await disp();
ok(/Beaufort 4/.test(d1) && /Swell 0\.9 m from WSW, 9 s/.test(d1) && /not for navigation/.test(d1) && /TOMORROW/.test(d1), "screen shows Beaufort, swell, 3 days and a navigation warning", d1.slice(0, 300));
await say("what's the forecast for manila tomorrow");
a = await answer(); ok(/^Tomorrow in Manila, Metro Manila: thunderstorms, 24 to 30°C, 85% chance of rain, wind WSW up to 24 knots gusting 38, waves up to 2\.4 m/.test(a), "tomorrow's forecast", a);
await say("weather in denver");
a = await answer(); ok(/Right now in Denver/.test(a) && !/waves/.test(a) && !/SEA/.test(await disp()), "inland place: no sea card", a);
await say("weather in atlantis");
ok(/couldn't find a place called atlantis/i.test(await answer()), "unknown place is said plainly", await answer());
await say("set my weather place to batangas");
ok(/weather place is now Batangas City, Calabarzon, Philippines/.test(await answer()), "set a default weather place", await answer());
const before = wxCalls.length;
await say("how windy is it");
ok(/Right now in Batangas City/.test(await answer()) && wxCalls.length === before, "uses the saved place, cached for 20 minutes", await answer());
await say("brief me");
ok(/Weather in Batangas City, Calabarzon: rain showers/.test(await answer()) && /WEATHER/.test(await disp()), "weather is in the morning briefing", (await answer()).slice(0, 200));
for (const t of ["remind me to check the weather tomorrow at 9", "research weather routing for ships"]) { await say(t); ok(!/Right now in/.test(await answer()), "“" + t + "” is not a weather check", await answer()); await say("no"); }
// offline: last forecast still shown
await p.evaluate(() => { const c = JSON.parse(localStorage.getItem("max_cache_weather")); for (const k in c) c[k].at -= 3600e3; localStorage.setItem("max_cache_weather", JSON.stringify(c)); });
env.__down = true; const realFetch = globalThis.fetch; globalThis.fetch = async (u, o) => String(u).includes("open-meteo") ? Promise.reject(new Error("offline")) : realFetch(u, o);
await say("weather");
ok(/Right now in Batangas City/.test(await answer()) && /offline — from/.test(await answer()), "weather service down → last forecast, clearly marked", await answer());
globalThis.fetch = realFetch;
// personality
await say("be concise");
ok(/Short answers from now on/.test(await answer()), "“be concise” switches style");
g = gem.length; await say("tell me about the solas convention");
const sys = JSON.stringify(gem.at(-1)?.systemInstruction || gem.at(-1));
ok(gem.length > g && /STYLE OVERRIDE: he asked for concise mode/.test(sys), "concise style reaches the brain");
await say("what personality are you using");
ok(/Concise mode/.test(await answer()), "says which style is on", await answer());
await say("back to normal"); await say("be normal");
ok(/usual self/.test(await answer()), "back to the usual butler", await answer());
// usage
await say("how much ai did you use today");
a = await answer(); ok(/Today I used the AI \d+ times?: Gemini Flash \d+/.test(a) && /No backups needed|no backups needed/i.test(a), "usage meter counts AI answers by brain", a);
// WhatsApp
await say("whatsapp ana that I'm running 20 minutes late");
a = await answer();
ok(/Here’s the message for Ana: “Hi Ana, running 20 minutes late\. Sorry!”/.test(a) && /pick the chat/.test(a), "WhatsApp draft for a contact: written, you pick the chat and send", a);
const [pop] = await Promise.all([p.waitForEvent("popup").catch(() => null), p.evaluate(() => { const o = window.open; window.__links = []; window.open = (u) => { window.__links.push(u); return {}; }; [...document.querySelectorAll("#dispBody button")].find(b => /Open WhatsApp/.test(b.textContent)).click(); })]);
ok((await p.evaluate(() => window.__links[0])) === "https://wa.me/?text=" + encodeURIComponent("Hi Ana, running 20 minutes late. Sorry!"), "Open WhatsApp → prefilled message, nothing sent automatically", await p.evaluate(() => window.__links[0]));
await say("send a whatsapp to 09171234567 saying on my way");
await p.evaluate(() => [...document.querySelectorAll("#dispBody button")].find(b => /Open WhatsApp/.test(b.textContent)).click());
ok((await p.evaluate(() => window.__links.at(-1))).startsWith("https://wa.me/639171234567?text="), "Philippine number becomes +63 in the WhatsApp link", await p.evaluate(() => window.__links.at(-1)));
ok(errs.length === 0, "no script errors", errs.join(" | "));
await ctx.close(); await b.close(); sW.close(); sP.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
