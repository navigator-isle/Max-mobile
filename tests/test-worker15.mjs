// Google Play: service-account sign-in (real RSA signature, checked), listing read/update, release notes, reviews — changes only with the exact yes.
const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
const pk = Buffer.from(await crypto.subtle.exportKey("pkcs8", kp.privateKey)).toString("base64").match(/.{1,64}/g).join("\n");
const SA = JSON.stringify({ type: "service_account", client_email: "max-play@max-ai-513218.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\n" + pk + "\n-----END PRIVATE KEY-----\n" });
let calls = [], listing = { language: "en-US", title: "Passage Planner", shortDescription: "Plan sea passages offline", fullDescription: "Plans routes.\nPlanning aid only – not for navigation." }, track = { track: "qa", releases: [{ name: "1.0.3", versionCodes: ["5"], status: "completed", releaseNotes: [] }] }, jwtOk = null;
const b64d = s => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
globalThis.fetch = async (u, o = {}) => {
  const url = String(u), method = o.method || "GET"; calls.push({ url, method, body: o.body });
  if (url === "https://oauth2.googleapis.com/token") { const a = new URLSearchParams(o.body).get("assertion"); const [h, p, sg] = a.split(".");
    jwtOk = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", kp.publicKey, b64d(sg), new TextEncoder().encode(h + "." + p)); const c = JSON.parse(b64d(p));
    return jwtOk && c.scope === "https://www.googleapis.com/auth/androidpublisher" && c.iss.startsWith("max-play@") ? new Response(JSON.stringify({ access_token: "PT", expires_in: 3600 })) : new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 }); }
  if (url.startsWith("https://androidpublisher.googleapis.com/androidpublisher/v3/applications/")) {
    if (!url.includes("/app.passageplanner.navigation/")) return new Response(JSON.stringify({ error: { message: "Package not found" } }), { status: 404 });
    if (/\/edits$/.test(url) && method === "POST") return new Response(JSON.stringify({ id: "E1" }));
    if (/\/edits\/E1\/listings$/.test(url)) return new Response(JSON.stringify({ listings: [listing] }));
    if (/\/edits\/E1\/tracks$/.test(url)) return new Response(JSON.stringify({ tracks: [{ track: "production", releases: [] }, track] }));
    if (/\/edits\/E1\/listings\/en-US$/.test(url) && method === "PATCH") { listing = { ...listing, ...JSON.parse(o.body) }; return new Response(JSON.stringify(listing)); }
    if (/\/edits\/E1\/tracks\/qa$/.test(url) && method === "PUT") { track = JSON.parse(o.body); return new Response(o.body); }
    if (/\/edits\/E1:commit$/.test(url)) return new Response(JSON.stringify({ id: "E1" }));
    if (/\/edits\/E1$/.test(url) && method === "DELETE") return new Response(null, { status: 204 });
    if (/\/reviews/.test(url)) return new Response(JSON.stringify({ reviews: [{ authorName: "Capt. R", comments: [{ userComment: { text: "Great ETA tool", starRating: 5, lastModified: { seconds: 1793400000 } } }] }] }));
  }
  if (url.includes("generativelanguage")) return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ text: "Offline passage planning, ETA and tides for ship officers" }) }] } }] }));
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p", PLAY_SERVICE_ACCOUNT: SA };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const call = async (path, body, e = env) => { const r = await w.fetch(new Request("https://x" + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": "p" }, body: JSON.stringify(body || {}) }), e); return { status: r.status, data: await r.json() }; };

let r = await call("/api/play/overview", { app: "Passage Planner" });
ok(jwtOk === true && r.status === 200, "signs in to Google Play with the service account (signature checked)", JSON.stringify(r.data).slice(0, 200));
ok(r.data.listings[0].title === "Passage Planner" && r.data.tracks.find(t => t.track === "qa").releases[0].name === "1.0.3", "reads the listing and the closed-test release");
ok(calls.some(c => c.method === "DELETE" && /edits\/E1$/.test(c.url)) && !calls.some(c => /:commit/.test(c.url)), "just looking never changes anything (the edit is thrown away)");
r = await call("/api/play/draft", { app: "passage planner", field: "shortDescription", current: listing.shortDescription, instruction: "mention ETA and tides" });
ok(r.data.text === "Offline passage planning, ETA and tides for ship officers" && r.data.limit === 80 && /not for navigation|keep any safety disclaimer/.test(JSON.parse(calls.at(-1).body).contents[0].parts[0].text), "drafts new text within Play's limit and Play's rules");
calls = [];
r = await call("/api/play/listing", { app: "Passage Planner", shortDescription: "Offline passage planning, ETA and tides for ship officers" });
ok(r.status === 400 && r.data.needConfirm && !calls.some(c => c.url.includes("androidpublisher")), "no change without his yes");
r = await call("/api/play/listing", { app: "Passage Planner", shortDescription: "x".repeat(81), confirm: "PUBLISH app.passageplanner.navigation" });
ok(r.status === 400 && /too long/.test(r.data.error), "too-long text is refused before anything is sent");
r = await call("/api/play/listing", { app: "Passage Planner", shortDescription: "Offline passage planning, ETA and tides for ship officers", confirm: "PUBLISH app.passageplanner.navigation" });
ok(r.data.updated[0] === "shortDescription" && listing.shortDescription.includes("tides") && listing.title === "Passage Planner" && calls.some(c => /:commit/.test(c.url)), "after yes: only that field changes, then it's published", JSON.stringify(listing));
r = await call("/api/play/notes", { app: "Passage Planner", text: "Faster routing and tide tables.", confirm: "PUBLISH app.passageplanner.navigation" });
ok(r.data.track === "qa" && track.releases[0].releaseNotes[0].text === "Faster routing and tide tables.", "release notes on the closed-test release", JSON.stringify(track));
r = await call("/api/play/reviews", { app: "Passage Planner" });
ok(r.data.reviews[0].stars === 5 && r.data.reviews[0].text === "Great ETA tool", "reads reviews");
r = await call("/api/play/overview", { app: "Hobby Isle" });
ok(r.status === 400 && /Which app/.test(r.data.error), "only apps on the list");
r = await call("/api/play/overview", { app: "Other" }, { ...env, PLAY_APPS: "Other=com.example.other" });
ok(r.status === 502 && /doesn't know that app/.test(r.data.error), "extra apps can be added with PLAY_APPS");
r = await call("/api/play/overview", { app: "Passage Planner" }, { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" });
ok(r.status === 409 && r.data.needPlay, "not connected → clear message");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
