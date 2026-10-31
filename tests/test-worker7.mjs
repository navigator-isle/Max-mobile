// Projects: status checks and GitHub change requests (fake GitHub), merge only with a spoken yes and passing tests.
let gh = [], checks = "success", sites = { "https://hobbyisle.com/": 200, "https://navigator-isle.github.io/": 200, "https://down.example.com/": 503 };
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.startsWith("https://api.github.com")) {
    gh.push({ url, method: o.method || "GET", body: o.body ? JSON.parse(o.body) : null, auth: o.headers.Authorization });
    if (url.endsWith("/issues") && o.method === "POST") return new Response(JSON.stringify({ number: 7, title: JSON.parse(o.body).title, html_url: "https://github.com/x/issues/7" }), { status: 201 });
    if (url.includes("/issues?state=open")) return new Response(JSON.stringify([{ number: 7, title: "[Max] Add Pokémon menu", html_url: "u7" }, { number: 8, title: "PR as issue", pull_request: {} }]));
    if (url.includes("/pulls?state=open")) return new Response(JSON.stringify([{ number: 9, title: "Add Pokémon menu", html_url: "u9", head: { ref: "max/pokemon" } }]));
    if (/\/pulls\/9$/.test(url)) return new Response(JSON.stringify({ number: 9, state: "open", title: "Add Pokémon menu", head: { sha: "abc" } }));
    if (url.includes("/check-runs")) return new Response(JSON.stringify({ check_runs: [{ name: "test", status: checks === "running" ? "in_progress" : "completed", conclusion: checks === "running" ? null : checks }] }));
    if (url.endsWith("/pulls/9/merge")) return new Response(JSON.stringify({ merged: true }));
    return new Response(JSON.stringify({ message: "Not Found" }), { status: 404 });
  }
  if (url in sites) return new Response("ok", { status: sites[url] });
  if (url.startsWith("https://slow.example.com")) { await new Promise((_, no) => o.signal.addEventListener("abort", () => no(Object.assign(new Error("aborted"), { name: "AbortError" })))); }
  if (url.includes("generativelanguage")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ reply: "Logged.", action: { type: "project_request", details: { project: "Hobby Isle", request: "Add a Pokémon menu" } } }) }] } }] }));
  throw new Error("offline " + url);
};
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", GITHUB_TOKEN: "ghp_x", MAX_GITHUB_REPOS: "navigator-isle/hobbyisle, navigator-isle/Max-mobile" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, { method = "GET", body, e = env, pw = "p" } = {}) => { const r = await w.fetch(new Request("https://x" + path, { method, headers: { "Content-Type": "application/json", "X-Max-Pass": pw }, body: body ? JSON.stringify(body) : undefined }), e); return { status: r.status, data: await r.json() }; };

let r = await call("/api/projects/status", { method: "POST", body: { projects: [{ id: "hi", url: "https://hobbyisle.com/" }, { id: "pp", url: "https://navigator-isle.github.io/" }, { id: "dn", url: "https://down.example.com/" }, { id: "sl", url: "https://claude.ai/artifact/abc" }, { id: "bad", url: "javascript:alert(1)" }, { id: "nx", url: "https://nowhere.example.com/" }] } });
const by = Object.fromEntries(r.data.results.map(x => [x.id, x]));
ok(by.hi.up === true && by.pp.up === true && typeof by.hi.ms === "number", "online sites reported up with response time");
ok(by.dn.up === false && by.dn.status === 503, "a site returning an error is reported down");
ok(by.sl.up === null && /inside Claude/.test(by.sl.note), "Claude-hosted apps: honestly marked as not checkable from outside");
ok(by.bad.up === null && by.nx.up === false, "bad addresses ignored; unreachable sites reported down");
r = await call("/api/projects/status", { method: "POST", body: { projects: [] }, pw: "wrong" });
ok(r.status === 401, "status checks need the passcode");

r = await call("/api/github/status");
ok(r.data.connected === true && r.data.repos.length === 2, "GitHub connected with 2 allowed repos");
r = await call("/api/github/request", { method: "POST", body: { repo: "navigator-isle/hobbyisle", title: "Add a Pokémon menu", body: "Add Pokémon to the main menu." } });
const made = gh.at(-1);
ok(r.data.request.number === 7 && made.body.title === "[Max] Add a Pokémon menu" && made.body.labels.includes("max-request") && made.auth === "Bearer ghp_x", "change request filed on GitHub, marked as from Max", JSON.stringify(made.body));
r = await call("/api/github/request", { method: "POST", body: { repo: "navigator-isle/secret-repo", title: "x" } });
ok(r.status === 403, "repos not on the allowed list are refused");
r = await call("/api/github/requests?repo=navigator-isle/hobbyisle");
ok(r.data.requests.length === 1 && r.data.requests[0].fromMax && r.data.pulls[0].number === 9, "lists open requests and pull requests");
gh = [];
r = await call("/api/github/merge", { method: "POST", body: { repo: "navigator-isle/hobbyisle", number: 9 } });
ok(r.status === 400 && r.data.needConfirm && !gh.some(x => x.method === "PUT"), "no merge without your spoken yes");
checks = "failure";
r = await call("/api/github/merge", { method: "POST", body: { repo: "navigator-isle/hobbyisle", number: 9, confirm: "MERGE 9" } });
ok(r.status === 409 && /tests failed/.test(r.data.error) && !gh.some(x => x.method === "PUT"), "no merge when its tests failed");
checks = "running";
r = await call("/api/github/merge", { method: "POST", body: { repo: "navigator-isle/hobbyisle", number: 9, confirm: "MERGE 9" } });
ok(r.status === 409 && /still running/.test(r.data.error), "no merge while tests are still running");
checks = "success";
r = await call("/api/github/merge", { method: "POST", body: { repo: "navigator-isle/hobbyisle", number: 9, confirm: "MERGE 9" } });
ok(r.data.merged === true && gh.at(-1).method === "PUT" && gh.at(-1).body.merge_method === "squash", "merges after yes + passing tests");

r = await call("/api/github/status", { e: { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" } });
ok(r.data.connected === false, "without a GitHub key: not connected");
r = await call("/api/github/request", { method: "POST", body: { repo: "navigator-isle/hobbyisle", title: "x" }, e: { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" } });
ok(r.status === 409 && r.data.needGithub, "without a GitHub key, requests are refused clearly (app saves them as notes instead)");
r = await call("/health", { e: env });
ok(r.data.github === "connected (2 repos)", "health shows GitHub status");
r = await call("/api/chat", { method: "POST", body: { message: "on hobby isle add a pokemon menu", allowActions: true, projects: ["Hobby Isle", "SeaLex"] } });
ok(r.data.action?.type === "project_request" && r.data.action.details.project === "Hobby Isle" && r.data.action.details.request === "Add a Pokémon menu", "chat turns a change wish into a project request", JSON.stringify(r.data.action));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
