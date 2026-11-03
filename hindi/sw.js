/* Bolo! service worker: lets the app open offline.
   App files are fetched fresh whenever there is a connection (so every update arrives whole,
   never half old / half new) and the cached copy is used when offline or the network is slow.
   Progress lives in localStorage / the cloud, never in this cache, so updates can't touch it. */
const CACHE = "bolo-app";
const SHELL = [
  "./", "index.html", "app.css", "app.js", "content.js", "config.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"
];
const TIMEOUT_MS = 3500;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // cloud saves always go straight to the network
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (!sameOrigin && !fonts) return;

  if (fonts) { // fonts never change: cache first
    e.respondWith(caches.open(CACHE).then(async (c) => (await c.match(req)) || fetch(req).then((res) => { c.put(req, res.clone()); return res; })));
    return;
  }
  // App files: network first (fresh), fall back to cache when offline or slow.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const network = fetch(req, { cache: "no-cache" }).then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise((resolve) => setTimeout(resolve, TIMEOUT_MS, null));
    try {
      const res = await Promise.race([network, timeout]);
      if (res && res.ok) return res;
    } catch (err) { /* offline */ }
    const cached = await cache.match(req, { ignoreSearch: true }) || (req.mode === "navigate" && await cache.match("index.html"));
    if (cached) return cached;
    try { return await network; } catch (err) { return Response.error(); }
  })());
});
