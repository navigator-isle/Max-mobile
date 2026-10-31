// Videos / recordings (streamed to Gemini file storage, then deleted), web pages and YouTube links, and blocked private addresses.
let calls = [], page = "<html><head><title>BWM update</title><script>evil()</script></head><body><nav>Menu</nav><h1>Ballast rules</h1><p>The D-2 standard applies from 2024.</p></body></html>";
globalThis.fetch = async (u, o = {}) => {
  const url = String(u); calls.push({ url, method: o.method || "GET", headers: o.headers || {}, body: o.body });
  if (url === "https://generativelanguage.googleapis.com/upload/v1beta/files") return new Response("{}", { headers: { "x-goog-upload-url": "https://upload.example/u1" } });
  if (url === "https://upload.example/u1") { let n = 0; for await (const c of o.body) n += c.length; calls.at(-1).bytes = n;
    return new Response(JSON.stringify({ file: { name: "files/abc", uri: "https://generativelanguage.googleapis.com/v1beta/files/abc", state: "PROCESSING" } })); }
  if (url.endsWith("/v1beta/files/abc") && (o.method || "GET") === "GET") return new Response(JSON.stringify({ name: "files/abc", uri: "https://generativelanguage.googleapis.com/v1beta/files/abc", state: "ACTIVE" }));
  if (url.endsWith("/v1beta/files/abc") && o.method === "DELETE") return new Response("{}");
  if (url.includes(":generateContent")) { const b = JSON.parse(o.body); calls.at(-1).gem = b;
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ kind: "video", title: "Mooring drill", topic: "Ship › Drills", summary: "A mooring drill.", points: ["Lines doubled"], dates: [], amounts: [], text: "[00:05] Heave up.", tags: ["mooring"], say: "It's a mooring drill video." }) }] } }] })); }
  if (url === "https://www.imo.org/en/bwm") return new Response(page, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  if (url === "https://example.org/blank") return new Response("<html><body><div id=app></div></body></html>", { headers: { "Content-Type": "text/html" } });
  throw new Error("unexpected " + url);
};
const { default: w } = await import(process.argv[2]);
const env = { GEMINI_API_KEY: "k", MAX_PASSCODE: "p" };
let pass = 0, fail = 0; const ok = (c, l, x = "") => { c ? pass++ : fail++; console.log((c ? "PASS " : "FAIL ") + l + (c ? "" : "  → " + x)); };
const up = async (bytes, mime, name = "drill.mp4") => { const r = await w.fetch(new Request("https://x/api/attachment/upload", { method: "POST", headers: { "Content-Type": mime, "X-File-Type": mime, "X-File-Name": encodeURIComponent(name), "X-Max-Pass": "p", "Content-Length": String(bytes.length), "X-Topics": encodeURIComponent("Ship › Drills|Maritime") }, body: bytes, duplex: "half" }), env); return { status: r.status, data: await r.json() }; };
const link = async (url, pw = "p") => { const r = await w.fetch(new Request("https://x/api/link", { method: "POST", headers: { "Content-Type": "application/json", "X-Max-Pass": pw }, body: JSON.stringify({ url, topics: ["Maritime › BWM"] }) }), env); return { status: r.status, data: await r.json() }; };

let r = await up(new Uint8Array(50000).fill(7), "video/mp4");
const gen = calls.find(c => c.gem), upl = calls.find(c => c.url === "https://upload.example/u1");
ok(r.status === 200 && r.data.attachment.title === "Mooring drill" && r.data.attachment.text.includes("Heave up"), "video: read and transcribed", JSON.stringify(r.data).slice(0, 200));
ok(upl.bytes === 50000 && calls[0].headers["X-Goog-Upload-Header-Content-Type"] === "video/mp4", "the whole video is streamed to Gemini file storage");
ok(gen.gem.contents[0].parts[0].file_data.file_uri.endsWith("/files/abc") && /Watch and listen/.test(gen.gem.contents[0].parts[1].text), "Gemini watches the stored video (waits until it's ready)");
ok(calls.some(c => c.method === "DELETE" && c.url.endsWith("/files/abc")), "the video is deleted from Gemini afterwards");
calls = [];
r = await up(new Uint8Array(3000).fill(1), "audio/mp4", "memo.m4a");
ok(r.status === 200 && /voice recording/.test(calls.find(c => c.gem).gem.contents[0].parts[1].text), "voice recordings: transcribed");
r = await up(new Uint8Array(10), "application/zip", "a.zip");
ok(r.status === 415, "unknown kinds refused");
r = await w.fetch(new Request("https://x/api/attachment/upload", { method: "POST", headers: { "X-File-Type": "video/mp4", "Content-Length": "100000000", "X-Max-Pass": "p" }, body: new Uint8Array(4), duplex: "half" }), env);
ok(r.status === 413, "videos over 95 MB refused clearly");

calls = [];
r = await link("www.imo.org/en/bwm");
const g2 = calls.find(c => c.gem).gem.contents[0].parts[0].text;
ok(r.status === 200 && r.data.attachment.url === "https://www.imo.org/en/bwm", "web page: read, with its address kept", JSON.stringify(r.data).slice(0, 200));
ok(/TITLE: BWM update/.test(g2) && /D-2 standard applies from 2024/.test(g2) && !/evil\(\)/.test(g2), "page text extracted (scripts removed)");
calls = [];
r = await link("https://youtu.be/dQw4w9WgXcQ?t=10");
ok(r.status === 200 && calls.length === 1 && calls[0].gem.contents[0].parts[0].file_data.file_uri === "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "YouTube links: Gemini watches the video");
for (const bad of ["http://localhost:8787/x", "http://192.168.1.10/admin", "http://10.0.0.5", "http://169.254.169.254/latest", "file:///etc/passwd", "javascript:alert(1)", "http://user:pw@example.com"]) {
  calls = []; r = await link(bad);
  if (!(r.status === 400 && calls.length === 0)) { ok(false, "private address blocked: " + bad, r.status); break; }
}
ok(true, "private / local addresses are never opened");
r = await link("https://example.org/blank");
ok(r.status === 422 && /screenshot/.test(r.data.error), "pages that need a browser: suggests a screenshot");
r = await link("www.imo.org/en/bwm", "wrong");
ok(r.status === 401, "links need the passcode");
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
