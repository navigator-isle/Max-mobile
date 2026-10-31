// Max offline support: keeps the app on the phone so it opens without internet.
// The page is always fetched fresh when online (so updates arrive), and the saved copy is used offline.
const CACHE = "max-app-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== "max-share").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  // Something shared to Max from another app (Android share menu): keep it, then open Max to read it.
  if (req.method === "POST" && url.origin === self.location.origin && url.pathname.endsWith("/share-target")) {
    e.respondWith((async () => {
      const base = new URL("./", self.registration.scope);
      try {
        const form = await req.formData(), file = form.get("file");
        if (file && typeof file === "object" && file.size) {
          const c = await caches.open("max-share");
          await c.put("shared-file", new Response(file, {headers: {"Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name || "shared file")}}));
          return Response.redirect(base + "?share=file", 303);
        }
        const q = new URLSearchParams({share: "link"});
        for (const k of ["url", "text", "title"]) if (form.get(k)) q.set(k, String(form.get(k)).slice(0, 2000));
        return Response.redirect(base + "?" + q, 303);
      } catch { return Response.redirect(base.toString(), 303); }
    })());
    return;
  }
  if (req.method !== "GET" || url.origin !== self.location.origin) return; // Max's AI calls always go to the network
  const isPage = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  if (!isPage) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const fresh = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 6000))]);
      if (fresh && fresh.ok) cache.put("./index.html", fresh.clone());
      return fresh;
    } catch {
      return (await cache.match("./index.html")) || (await cache.match("./")) || new Response("Max is offline and has not been saved on this phone yet. Open it once with internet.", {status: 503, headers: {"Content-Type": "text/plain"}});
    }
  })());
});
