// Max's agents: 12 agents, each with a detailed weekly report (one email per agent), daily notes fact-check,
// weekly strategy ideas for the paper trader, investments with week-on-week changes, business ideas never repeated.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
class Stmt { constructor(db, sql, a = []) { this.db = db; this.sql = sql; this.args = a; } bind(...a) { return new Stmt(this.db, this.sql, a); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args) }; } async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() { const r = this.db.prepare(this.sql).run(...this.args); return { meta: { changes: Number(r.changes) } }; } }
class D1 { constructor(db) { this.db = db; } prepare(s) { return new Stmt(this.db, s); }
  async batch(st) { this.db.exec("BEGIN"); try { const o = []; for (const s of st) o.push(/^\s*(select|pragma)/i.test(s.sql) ? await s.all() : await s.run()); this.db.exec("COMMIT"); return o; } catch (e) { this.db.exec("ROLLBACK"); throw e; } } }
const b64u = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const summary = JSON.parse(fs.readFileSync(new URL("./fixtures/trader-summary.json", import.meta.url), "utf8"));
summary.updated = new Date().toISOString();
let sent = [], prompts = [], gemDown = false, mp2Rate = "7.03%", ghPut = null, bizCall = 0;
const ok200 = o => new Response(JSON.stringify(o));
const grounded = (o, src = "https://www.pagibigfund.gov.ph/mp2") => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "Here you go:\n```json\n" + JSON.stringify(o) + "\n```" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: src, title: "Official source" } }] } }] }));
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://oauth2.googleapis.com/token")) { const p = new URLSearchParams(o.body);
    if (p.get("grant_type") === "authorization_code") return ok200({ access_token: "AT1", expires_in: 3600, refresh_token: "RT", scope: "openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.compose https://www.googleapis.com/auth/gmail.modify", id_token: "h." + b64u({ email: "mark@example.com" }) + ".s" });
    return ok200({ access_token: "AT2", expires_in: 3600 }); }
  if (url === "https://gmail.googleapis.com/gmail/v1/users/me/messages/send") { sent.push(Buffer.from(JSON.parse(o.body).raw, "base64url").toString()); return ok200({ id: "s" }); }
  if (url.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/messages?")) return ok200({ messages: [{ id: "m1" }], resultSizeEstimate: 12 });
  if (url.startsWith("https://gmail.googleapis.com/gmail/v1/users/me/messages/m1")) return ok200({ payload: { headers: [{ name: "From", value: "Crewing <c@agency.ph>" }, { name: "Subject", value: "Joining date" }, { name: "Date", value: "Mon, 2 Nov 2026" }] } });
  if (url.startsWith("https://www.googleapis.com/calendar/v3/")) return ok200({ items: [{ summary: "PSC inspection", start: { dateTime: "2026-11-10T09:00:00+08:00" } }] });
  if (url.startsWith("https://tasks.googleapis.com/")) return ok200({ items: [{ title: "Renew passport", status: "needsAction", due: "2026-10-01T00:00:00Z" }] });
  if (url.includes("generativelanguage")) {
    const b = JSON.parse(o.body), t = b.contents.map(c => c.parts.map(p => p.text || "").join("")).join("\n"); prompts.push(t);
    if (gemDown) return new Response(JSON.stringify({ error: { message: "quota" } }), { status: 429 });
    if (/checking one of Mark Jun's personal study/.test(t)) return grounded({ verdict: /Annex VI/.test(t) ? "needs update" : "correct", summary: "Checked.", issues: /Annex VI/.test(t) ? [{ claim: "ECA limit 0.5%", problem: "ECA sulphur limit is 0.10%", correct: "0.10% inside ECAs", source: "IMO" }] : [] }, "https://www.imo.org/marpol");
    if (/quantitative trading researcher/.test(t)) return grounded({ ideas: [{ name: "Faber trend filter", template: "trend", params: { fast: 10, slow: 999, maxPos: 3 }, universe: "all", source: "Faber 2007", why: "10-month SMA" }, { name: "Bad", template: "martingale", params: {} }] }, "https://papers.ssrn.com/x");
    if (/Pag-IBIG MP2/.test(t) && /Research the latest/.test(t)) return grounded({ rows: [{ name: "MP2 2025 dividend", rate: mp2Rate, details: "5-year term", asOf: "2026", source: "pagibigfund.gov.ph" }], news: ["Online enrollment"], watchOut: ["5-year lock-in"] });
    if (/Research the latest/.test(t)) return grounded({ rows: [{ name: "GoTyme Bank", rate: "3.5% p.a.", details: "PDIC insured", asOf: "Nov 2026", source: "gotyme.com.ph" }], news: [], watchOut: [] }, "https://www.gotyme.com.ph");
    if (/boring" small businesses/.test(t)) { bizCall++; const names = bizCall === 1 ? ["Water refilling station", "Laundry shop", "Rice retail", "Ice tubig", "Printing", "Car wash", "Sari-sari store", "Bike repair", "Tutorial center", "Bakery"] : ["Water refilling station", "Self-storage lockers", "Pest control", "Septic declogging", "Uniform alterations", "Gas LPG dealer", "Vending machines", "Parking lot", "Coin laundry kiosk", "Rental tents"];
      return grounded({ ideas: names.map(n => ({ name: n, startupCostPhp: "₱150,000", monthlyProfitPhp: "₱20,000–₱40,000", whyItEarns: "steady demand", risks: "competition", permits: "Mayor's permit, BIR", runWhileAway: "hire a caretaker", firstSteps: ["check location", "permits", "supplier"], source: "negosyo.ph" })) }, "https://negosyo.ph"); }
    if (/What is NEW/.test(t)) return grounded({ topic: "x", headline: "IMO MSC 111 adopted SOLAS amendments", points: ["Enter into force 1 Jan 2028"], data: ["1 Jan 2028"], whatItMeansForMark: "Update notes", confidence: "high" }, "https://www.imo.org/msc");
    if (/writing your weekly report/.test(t)) { const agent = (t.match(/You are Max's (.+?) agent/) || [])[1]; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ status: [agent + " status: all running"], done: ["Checked everything"], problems: /Websites|Security/.test(agent) ? ["Missing security headers"] : [], improvements: ["Add more notes"], missing: ["Crash reports"], suggestions: ["Do X"], next: ["Keep going"] }) }] }, groundingMetadata: /Websites|Security/.test(agent) ? { groundingChunks: [{ web: { uri: "https://owasp.org", title: "OWASP" } }] } : undefined }] })); }
    if (url.includes("embed")) return ok200({ embeddings: [{ values: Array(256).fill(0.1) }] });
    return ok200({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "ok", action: null }) }] } }] });
  }
  if (url.startsWith("https://www.googleapis.com/pagespeedonline/")) return ok200({ lighthouseResult: { categories: { performance: { score: 0.71 }, seo: { score: 0.92 }, accessibility: { score: 0.88 }, "best-practices": { score: 0.96 } }, audits: { "largest-contentful-paint": { displayValue: "3.1 s" }, "uses-optimized-images": { details: { items: [1, 2] } } } } });
  if (url.startsWith("https://hobbyisle.com") || url.startsWith("http://hobbyisle.com")) return new Response(`<html><head><title>Hobby Isle — Gunpla</title></head><body><h1>Hobby Isle</h1><a href="https://www.amazon.com/dp/B0X?tag=hobbyisle-20">kit</a><a href="https://amzn.to/abc">kit2</a><a href="https://shopee.ph/x">s</a><a href="https://facebook.com/hobbyisle">fb</a></body></html>`, { headers: { "content-type": "text/html" } });
  if (/^https:\/\/(navigator-isle\.github\.io|draft-calculator\.github\.io)/.test(url)) return new Response("ok");
  if (url.startsWith("https://api.netlify.com/api/v1/sites?")) return ok200([{ id: "n1", name: "sulit-o-hindi", ssl_url: "https://sulit.netlify.app", published_deploy: { state: "ready", published_at: "2026-11-01" } }]);
  if (url.startsWith("https://api.netlify.com/api/v1/sites/n1/deploys")) return ok200([{ created_at: new Date().toISOString(), state: "error", error_message: "Build script returned non-zero exit code: 2" }]);
  if (url.startsWith("https://api.github.com/repos/")) {
    if (url.includes("/contents/ideas.json")) { if ((o.method || "GET") === "PUT") { ghPut = JSON.parse(o.body); return ok200({ content: {} }); } return ok200({ sha: "abc123" }); }
    if (url.includes("/commits?")) return ok200([{ commit: { message: "Fix notes toolbar\n\nmore" } }]);
    if (url.includes("/actions/runs")) return ok200({ workflow_runs: [{ name: "Deploy", conclusion: "success", created_at: new Date().toISOString() }, { name: "Android build", conclusion: url.includes("android") ? "failure" : "success", created_at: new Date().toISOString() }] });
    if (url.includes("/issues?")) return ok200([{ number: 4, title: "[Max] Add dark mode", html_url: "x" }]);
    if (url.includes("/dependabot/alerts")) return new Response(JSON.stringify({ message: "Resource not accessible by personal access token" }), { status: 403 });
  }
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/summary.json")) return ok200(summary);
  if (url.startsWith("https://raw.githubusercontent.com/navigator-isle/Max-mobile/trader-data/events.json")) return ok200([]);
  return new Response("{}", { status: 404 });
};
const { default: w } = await import(process.argv[2]);
const sqlite = new DatabaseSync(":memory:"), APP = "https://navigator-isle.github.io";
const env = { GEMINI_API_KEY: "k", ALLOWED_ORIGIN: APP, MAX_PASSCODE: "pw", MAX_MEMORY: new D1(sqlite), GOOGLE_CLIENT_ID: "cid", GOOGLE_CLIENT_SECRET: "cs", MAX_OWNER_EMAIL: "mark@example.com",
  GITHUB_TOKEN: "ghp_x", NETLIFY_TOKEN: "nfp_x", MAX_GITHUB_REPOS: "navigator-isle/Max-mobile,navigator-isle/hobbyisle,navigator-isle/navigator-isle.github.io,navigator-isle/passage-planner-android" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, { method = "GET", body, session } = {}) => { const h = { "Content-Type": "application/json", Origin: APP }; if (session) h["X-Max-Session"] = session;
  const r = await w.fetch(new Request("https://max.example" + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined, redirect: "manual" }), env);
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {} return { status: r.status, data, location: r.headers.get("Location") }; };
let r = await call("/auth/google/start?return=" + encodeURIComponent(APP + "/Max-mobile/")); const g = new URL(r.location);
r = await call("/auth/google/callback?code=c&state=" + encodeURIComponent(g.searchParams.get("state"))); const session = (r.location.match(/#max_session=([\w-]+)/) || [])[1];
const now = Date.now();
sqlite.exec(`INSERT INTO max_notes (id,title,category,tags,body,analysis,created_at,updated_at,deleted) VALUES
 ('n1','MARPOL Annex VI — sulphur','Maritime › IMO › Conventions','[]','<p>Global sulphur cap 0.50%. ECA limit 0.5% too, since 2015 rules changed.</p>',NULL,${now},${now},0),
 ('n2','SOLAS drills','Maritime › IMO › Conventions','["solas"]','<p>Abandon ship and fire drills monthly for each crew member.</p>','{"summary":"x"}',${now - 9e9},${now - 9e9},0),
 ('n3','Shopping list','Unsorted','[]','<p>eggs, rice, coffee and more things for the week ahead of us.</p>',NULL,${now},${now},0),
 ('n4','SOLAS drills','Maritime › Job by Rank › Third Officer','[]','<p>Duplicate title on purpose for the librarian to find here.</p>',NULL,${now},${now},0)`);

r = await call("/api/agents", { session });
ok(r.status === 200 && r.data.agents.length === 12 && r.data.agents.some(a => a.id === "shopping") && r.data.agents.every(a => a.workers.length && /Sunday/.test(a.reportDay)), "12 agents (incl. Shopping), each with its sub-workers and a Sunday report slot", JSON.stringify(r.data?.agents?.map(a => a.id)));
ok(r.data.budget.notes > r.data.budget.trading && r.data.budget.trading > r.data.budget.web, "brain budget: notes first, trading second, a small share for the rest", JSON.stringify(r.data.budget));
r = await call("/api/agents");
ok(r.status === 401, "agents and reports are private");

// daily notes fact-check (21:45 UTC = 5:45 am Manila)
await w.scheduled({ scheduledTime: Date.parse("2026-11-05T21:45:00Z") }, env, { waitUntil: p => p });
await new Promise(res => setTimeout(res, 300));
r = await call("/api/notes/checks", { session });
const ck = r.data.checks;
ok(ck.n1 && ck.n1.verdict === "needs update" && ck.n1.issues[0].correct === "0.10% inside ECAs" && ck.n1.sources[0].url === "https://www.imo.org/marpol" && ck.n1.expert === "Maritime expert", "the Maritime expert checks notes against the web and records the correction with its source", JSON.stringify(ck.n1));
ok(prompts.some(t => /senior maritime regulatory expert/.test(t) && /MARPOL Annex VI/.test(t)), "Maritime notes are checked by the Maritime expert");
ok(!ck.n3 || ck.n3.verdict, "(other notes checked too)");

// each weekly report, by hand
const run = async id => { sent = []; const x = await call("/api/agents/run", { method: "POST", body: { agent: id }, session }); return x; };
for (const id of ["notes", "research", "web", "apps", "security", "trading", "investments", "business", "music", "schedule", "email"]) {
  r = await run(id);
  const mail = sent[0] || "";
  ok(r.status === 200 && r.data.report.status.length && r.data.report.emailed === "emailed" && /multipart\/alternative/.test(mail) && /Subject: =\?UTF-8\?B\?/.test(mail), `${id}: weekly report written and emailed (text + formatted)`, JSON.stringify(r.data?.report?.emailed || r.data).slice(0, 200));
}
r = await run("notes");
const notesFacts = prompts.filter(t => /writing your weekly report/.test(t) && /Notes & Attachments/.test(t)).at(-1);
ok(/"unsorted": \[\s*"Shopping list"/.test(notesFacts) && /possibleDuplicates[\s\S]*SOLAS drills/.test(notesFacts) && /notesNeedingUpdate[\s\S]*MARPOL Annex VI/.test(notesFacts), "notes report: unsorted notes, duplicates, and notes the fact-checker found outdated", notesFacts?.slice(0, 400));
const txt = Buffer.from(sent[0].split("Content-Transfer-Encoding: base64\r\n\r\n")[1].split("\r\n--")[0].replace(/\r\n/g, ""), "base64").toString();
ok(/STATUS\n• /.test(txt) && /WHAT NEEDS IMPROVEMENT/.test(txt) && /WHAT'S MISSING/.test(txt) && /SUGGESTIONS/.test(txt), "every report is complete and bulleted: status, done, problems, improvements, missing, suggestions, next week", txt.slice(0, 300));
r = await run("web");
const webFacts = prompts.filter(t => /Websites agent/.test(t)).at(-1);
ok(/"performance": 71/.test(webFacts) && /"amazonWithoutTag": 0/.test(webFacts) && /linksOnHomepage": 3/.test(webFacts) && /facebook\.com\/hobbyisle/.test(webFacts), "websites: mobile & desktop speed (PageSpeed), affiliate links, social links per site", webFacts?.slice(0, 300));
ok(r.data.report.tables[0].title === "Hobby Isle — numbers" && r.data.report.sources.some(s => /owasp/.test(s.url)), "…with a numbers table per site and the sources it searched", JSON.stringify(r.data.report.tables[0]));
r = await run("apps");
const appFacts = prompts.filter(t => /Apps agent/.test(t)).at(-1);
ok(/sulit-o-hindi/.test(appFacts) && /Build script returned non-zero/.test(appFacts) && /Android build \(/.test(appFacts) && /Fix notes toolbar/.test(appFacts), "apps: Netlify deploys (with the error), GitHub changes and failed builds per app", appFacts?.slice(0, 300));
r = await run("trading");
ok(r.data.report.tables[0].title === "₱100,000 paper account" && r.data.report.tables[0].rows.length === 5 && /PSE dividend/.test(r.data.report.tables[0].rows[0][0]), "trading: the ₱100,000 account table (4 parts + total) and this week's trades", JSON.stringify(r.data.report.tables.map(t => t.title)));
ok(/Pretend money only/.test(Buffer.from(sent[0].split("Content-Transfer-Encoding: base64\r\n\r\n")[1].split("\r\n--")[0].replace(/\r\n/g, ""), "base64").toString()), "trading report says pretend money / not advice");
// investments: week-on-week changes
mp2Rate = "7.10%"; r = await run("investments");
const mp2 = r.data.report.tables.find(t => t.title === "Pag-IBIG MP2");
ok(mp2 && mp2.rows[0][1] === "7.10%" && mp2.rows[0][2] === "was 7.03%", "investments: each rate with what changed since last week", JSON.stringify(mp2));
ok(r.data.report.tables.length === 10 && prompts.filter(t => /Research the latest information on/.test(t)).length >= 20 && prompts.some(t => /Plan A\/B\/C/.test(t) && /Metrobank Online Time Deposit/.test(t)), "investments: MP2, savings, time deposits, promos, government savings, UITF, VUL, bonds, dividend stocks and warnings are each researched, and his ₱100,000 plan is checked", r.data.report.tables.map(t => t.title).join(", "));
// business: never repeated
r = await run("business");
const biz = r.data.report.tables[0];
ok(biz && biz.rows.length === 9 && !biz.rows.some(x => x[1] === "Water refilling station"), "business: 10 ideas a week, and an idea from an earlier week is never repeated", JSON.stringify(biz?.rows.map(x => x[1])));
ok(prompts.filter(t => /boring" small businesses/.test(t)).at(-1).includes("Water refilling station"), "…the scout is told every earlier idea to avoid");
r = await call("/api/agents/report?agent=business", { session });
ok(r.status === 200 && r.data.report.agent === "business" && /Max Business — weekly report/.test(r.data.rendered.subject), "the last report of each agent can be opened on the phone", r.data?.rendered?.subject);
// trading ideas → the paper trader (Saturday 20:45 UTC)
await w.scheduled({ scheduledTime: Date.parse("2026-11-07T20:45:00Z") }, env, { waitUntil: p => p }); await new Promise(res => setTimeout(res, 300));
const ideas = ghPut ? JSON.parse(Buffer.from(ghPut.content, "base64").toString()) : null;
ok(ghPut && ghPut.branch === "trader-data" && ghPut.sha === "abc123" && ideas.crypto[0].name === "Faber trend filter" && ideas.crypto[0].params.slow === 250 && ideas.crypto[0].params.fast === 20 && ideas.crypto.length === 1, "web strategy ideas go to the paper trader, kept inside safe limits; unknown strategy types dropped", JSON.stringify(ideas?.crypto));
// Sunday schedule: one agent per hour, once
sent = [];
await w.scheduled({ scheduledTime: Date.parse("2026-11-08T04:45:00Z") }, env, { waitUntil: p => p }); await new Promise(res => setTimeout(res, 500));
const subj = sent.map(m => Buffer.from((m.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/) || [])[1] || "", "base64").toString());
ok(subj.length === 0, "Sunday 12:45 pm Manila → the Trading report is written by itself but NOT emailed (few emails: one Sunday summary)", JSON.stringify(subj));
sent = []; await w.scheduled({ scheduledTime: Date.parse("2026-11-08T07:45:00Z") }, env, { waitUntil: p => p }); await new Promise(res => setTimeout(res, 300));
ok(sent.length === 0, "the Music agent no longer reports by itself on Sunday (only when asked)", String(sent.length));
sent = []; await w.scheduled({ scheduledTime: Date.parse("2026-11-08T10:45:00Z") }, env, { waitUntil: p => p }); await new Promise(res => setTimeout(res, 500));
const sub2 = sent.map(m => Buffer.from((m.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/) || [])[1] || "", "base64").toString());
const body2 = sent[0] ? Buffer.from(sent[0].split("\r\n\r\n").slice(1).join("").replace(/\r\n/g, ""), "base64").toString() : "";
ok(sub2.length === 1 && /^Max weekly summary: ₱/.test(sub2[0]) && /1\) TRADING/.test(body2) && /2\) INVESTMENTS/.test(body2) && /3\) WEBSITES/.test(body2) && /4\) APPS/.test(body2) && /5\) SECURITY/.test(body2), "Sunday 6:45 pm Manila → ONE summary email: trading, investments, websites, apps, security", JSON.stringify(sub2) + body2.slice(0, 200));
sent = []; await w.scheduled({ scheduledTime: Date.parse("2026-11-08T04:45:30Z") }, env, { waitUntil: p => p }); await new Promise(res => setTimeout(res, 300));
ok(sent.length === 0, "…only once");
// brain out → still a report, with the plain facts
gemDown = true; sent = [];
r = await run("schedule");
ok(r.status === 200 && /plain facts/.test(r.data.report.status[0]) && /PSC inspection/.test(r.data.report.facts) && sent.length === 1, "if the brain is out of free quota, the report still goes out with the plain facts", JSON.stringify(r.data.report.status));
gemDown = false;
// "now": the 10-minute trigger sends every agent's report once, one per run (only inside the one-time window)
sent = []; const cron10 = () => w.scheduled({ cron: "*/10 * * * *", scheduledTime: Date.now() }, env, { waitUntil: p => (globalThis.__c = p) }).then(() => globalThis.__c);
await cron10(); await cron10();
const subj10 = sent.map(m => Buffer.from((m.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/) || [])[1] || "", "base64").toString());
if (Date.now() < Date.parse("2026-11-06T09:00:00Z")) ok(subj10.length === 2 && /Business/.test(subj10[0]) && /Investments/.test(subj10[1]), "“now”: the reports go out one by one (Business first, then Investments…)", JSON.stringify(subj10));
else ok(subj10.length === 0, "after the one-time window the 10-minute trigger does nothing", JSON.stringify(subj10));
// the router knows the new agents
const chat = async m => (await call("/api/chat", { method: "POST", body: { message: m, allowActions: true }, session })).data;
ok((await chat("how much is the MP2 dividend this year?")).dept.id === "investments", "“MP2 dividend” → 💰 Investments");
ok((await chat("give me some small business ideas")).dept.id === "business", "“business ideas” → 🏪 Business");
ok((await chat("any new emails in my inbox?")).dept.id === "email", "“emails in my inbox” → ✉️ Email");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
