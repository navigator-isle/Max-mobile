// Visitor numbers from Cloudflare Web Analytics (fake Cloudflare), sales actions.
let lastQuery = null, cfMode = "ok";
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url === "https://api.cloudflare.com/client/v4/graphql") {
    lastQuery = { q: JSON.parse(o.body).query, auth: o.headers.Authorization };
    if (cfMode === "error") return new Response(JSON.stringify({ data: null, errors: [{ message: "not authorized for that account" }] }));
    const host = (lastQuery.q.match(/requestHost:"([^"]+)"/) || [])[1];
    const big = host === "hobbyisle.com";
    return new Response(JSON.stringify({ data: { viewer: { accounts: [{
      today: big ? [{ count: 52, sum: { visits: 37 } }] : [],
      week: big ? [{ count: 410, sum: { visits: 260 } }] : [],
      pages: big ? [{ count: 20, dimensions: { requestPath: "/gundam/pg/" } }, { count: 9, dimensions: { requestPath: "/" } }] : [],
      countries: big ? [{ count: 300, dimensions: { countryName: "US" } }] : [] }] } } }));
  }
  if (url.includes("generativelanguage")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Logged.", action: { type: "log_sale", details: { project: "Hobby Isle", amount: "4.2", currency: "USD", source: "Amazon", date: "2026-10-30" } } }) }] } }] }));
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", CF_ANALYTICS_TOKEN: "cft" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, { method = "POST", body, e = env } = {}) => { const r = await w.fetch(new Request("https://x" + path, { method, headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: body ? JSON.stringify(body) : undefined }), e); return { status: r.status, data: await r.json() }; };
const win = { todayFrom: "2026-10-30T07:00:00.000Z", weekFrom: "2026-10-24T07:00:00.000Z", to: "2026-10-31T01:00:00.000Z" };
let r = await call("/api/projects/stats", { body: { ...win, hosts: ["hobbyisle.com", "navigator-isle.github.io", "bad host!", "hobbyisle.com"] } });
const hi = r.data.results.find(x => x.host === "hobbyisle.com");
ok(r.status === 200 && r.data.results.length === 2, "one result per site, bad and duplicate hosts dropped", JSON.stringify(r.data.results.map(x => x.host)));
ok(hi.today.visitors === 37 && hi.today.views === 52 && hi.week.visitors === 260, "today and 7-day visitors for Hobby Isle");
ok(hi.topPages[0].path === "/gundam/pg/" && hi.countries[0].country === "US", "top pages today and top countries");
ok(r.data.results.find(x => x.host === "navigator-isle.github.io").today.visitors === 0, "site without data shows 0, not an error");
ok(lastQuery.auth === "Bearer cft" && lastQuery.q.includes('accountTag:"fe65b997a30f62c013810d5ecb34f4ca"') && lastQuery.q.includes('datetime_geq:"2026-10-30T07:00:00.000Z"') && lastQuery.q.includes("rumPageloadEventsAdaptiveGroups"), "asks Cloudflare Web Analytics for the right account and time window");
r = await call("/api/projects/stats", { body: { ...win, hosts: ['x"} evil {'] } });
ok(r.data.results.length === 0, "odd host names can't inject into the query");
cfMode = "error";
r = await call("/api/projects/stats", { body: { ...win, hosts: ["hobbyisle.com"] } });
ok(r.data.results[0].error.includes("not authorized"), "Cloudflare errors are passed on clearly");
cfMode = "ok";
r = await call("/api/projects/stats", { body: { hosts: ["hobbyisle.com"] } });
ok(r.status === 400, "time window required");
r = await call("/api/projects/stats", { body: { ...win, hosts: ["hobbyisle.com"] }, e: { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" } });
ok(r.status === 409 && r.data.needAnalytics, "without the analytics key: clear 'not connected'");
r = await call("/health", { method: "GET" });
ok(r.data.analytics === "connected", "health shows analytics status");
r = await call("/api/chat", { body: { message: "log 4.20 dollars amazon sales for hobby isle today", allowActions: true } });
ok(r.data.action.type === "log_sale" && r.data.action.details.amount === 4.2 && r.data.action.details.currency === "USD", "chat turns spoken earnings into a sale entry", JSON.stringify(r.data.action));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
