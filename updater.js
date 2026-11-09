// Max updater — a tiny Cloudflare Worker ("max-updater") that installs new versions of Max's server
// ("max-ai-backend") with one tap from the Max app. No laptop, no GitHub.
// Mark pastes this file ONCE in the Cloudflare dashboard, then adds two secrets himself:
//   CF_API_TOKEN  – a Cloudflare API token made from the template "Edit Cloudflare Workers"
//   UPDATE_PASS   – the same passcode he uses in Max
// How an update works: Mark uploads the new max-app.zip to Cloudflare Pages (max-app). The zip contains
// _update/manifest.json + _update/worker.js. Max's app asks this updater to install it: the updater downloads
// the new code from Mark's own Pages site, checks its SHA-256 fingerprint and uploads it as the new Max server
// (keeping the database, AI, secrets and settings). The app then checks Max's /health page and asks for /rollback if it fails.
const APP = "https://max-app-axv.pages.dev";              // Mark's own Pages site (the only place code is taken from)
const SCRIPT = "max-ai-backend";                           // the Worker it updates
const API = "https://api.cloudflare.com/client/v4";
const UPDATER_VERSION = "max-updater-2026-11-09a";

const json = (o, s = 200, origin = "") => new Response(JSON.stringify(o), { status: s, headers: {
  "Content-Type": "application/json", "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type, X-Update-Pass",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Vary": "Origin", "Cache-Control": "no-store" } });
const same = (a, b) => { a = String(a || ""); b = String(b || ""); if (!a || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const sha256 = async buf => [...new Uint8Array(await crypto.subtle.digest("SHA-256", buf))].map(b => b.toString(16).padStart(2, "0")).join("");
async function cf(env, path, init = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: "Bearer " + env.CF_API_TOKEN, ...(init.headers || {}) } });
  let j = null; try { j = await r.json(); } catch {}
  if (!r.ok || !j || j.success === false) throw new Error((j && j.errors && j.errors.map(e => e.message).join("; ")) || ("Cloudflare said " + r.status));
  return j.result;
}
async function account(env) {
  const acct = (await cf(env, "/accounts"))[0]; if (!acct) throw new Error("The API token can't see your Cloudflare account");
  return acct.id;
}
async function activeVersion(env, acct) {
  const d = await cf(env, `/accounts/${acct}/workers/scripts/${SCRIPT}/deployments`).catch(() => null);
  return d && d.deployments && d.deployments[0] && d.deployments[0].versions && d.deployments[0].versions[0] && d.deployments[0].versions[0].version_id || null;
}
async function manifest() {
  const r = await fetch(APP + "/_update/manifest.json?t=" + Date.now(), { cf: { cacheTtl: 0 } });
  if (!r.ok) throw new Error("No update found on " + APP + " (upload the new max-app.zip to Cloudflare Pages first)");
  return r.json();
}
export default {
  async fetch(req, env) {
    const url = new URL(req.url), origin = req.headers.get("Origin") || "", allow = origin === APP ? APP : "";
    if (req.method === "OPTIONS") return json({}, 204, allow);
    if (url.pathname === "/" || url.pathname === "/health") return json({ ok: true, updater: UPDATER_VERSION, ready: !!(env.CF_API_TOKEN && env.UPDATE_PASS) }, 200, allow);
    if (!env.CF_API_TOKEN || !env.UPDATE_PASS) return json({ error: "The updater isn't set up yet: add the secrets CF_API_TOKEN and UPDATE_PASS in Cloudflare." }, 503, allow);
    if (!same(req.headers.get("X-Update-Pass"), env.UPDATE_PASS)) return json({ error: "Wrong passcode." }, 401, allow);
    try {
      if (url.pathname === "/check") {
        const m = await manifest();
        return json({ available: m.version, size: m.bytes, built: m.built, notes: m.notes || [] }, 200, allow);
      }
      if (url.pathname === "/deploy" && req.method === "POST") {
        const acct = await account(env), m = await manifest();
        const code = await (await fetch(APP + "/_update/" + m.file + "?t=" + Date.now(), { cf: { cacheTtl: 0 } })).arrayBuffer();
        if (await sha256(code) !== m.sha256) return json({ error: "The new code doesn't match its fingerprint, so nothing was installed. Upload max-app.zip again." }, 409, allow);
        const previous = await activeVersion(env, acct);          // so the app can go back if the new version fails
        const meta = { main_module: "worker.js", compatibility_date: m.compatibility_date || "2026-10-23",
          keep_bindings: ["plain_text", "secret_text", "d1", "ai", "kv_namespace", "r2_bucket", "service", "queue", "analytics_engine"],
          bindings: (m.vars || []).map(([name, text]) => ({ type: "plain_text", name, text })), observability: { enabled: true } };
        const form = new FormData();
        form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
        form.append("worker.js", new Blob([code], { type: "application/javascript+module" }), "worker.js");
        await cf(env, `/accounts/${acct}/workers/scripts/${SCRIPT}`, { method: "PUT", body: form });
        return json({ ok: true, installed: m.version, previous, notes: m.notes || [] }, 200, allow);
      }
      if (url.pathname === "/rollback" && req.method === "POST") {
        const acct = await account(env), b = await req.json().catch(() => ({}));
        if (!/^[0-9a-f-]{20,}$/i.test(b.version_id || "")) return json({ error: "Which version? (version_id missing)" }, 400, allow);
        await cf(env, `/accounts/${acct}/workers/scripts/${SCRIPT}/deployments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategy: "percentage", versions: [{ version_id: b.version_id, percentage: 100 }] }) });
        return json({ ok: true, rolledBackTo: b.version_id }, 200, allow);
      }
      return json({ error: "Unknown request" }, 404, allow);
    } catch (e) { return json({ error: String(e.message || e) }, 500, allow); }
  }
};
