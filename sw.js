// Max offline support: keeps the app on the phone so it opens without internet.
// The page is always fetched fresh when online (so updates arrive), and the saved copy is used offline.
const CACHE = "max-app-v1";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
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
