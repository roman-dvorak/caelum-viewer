// Service worker: makes the viewer installable and lets the app shell open offline.
// Camera data (S3, HTTP listings, the camera itself) is never cached here — it is
// cross-origin and live; only the app's own files and the web fonts are.
const CACHE = "caelum-viewer-v1";
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
// Build assets load with crossorigin, so their requests can differ from the precache ones in Vary.
const MATCH = { ignoreVary: true };

// Precache the shell (index.html and the build assets it references) so even the first
// visit, which loads before the worker takes control, can be reopened offline.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const shell = new URL("./", self.registration.scope).href;
      const res = await fetch(shell, { cache: "no-cache" });
      if (!res.ok) return;
      const html = await res.clone().text();
      await cache.put(shell, res);
      const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
        .map((m) => new URL(m[1], shell))
        .filter((u) => u.origin === self.location.origin && u.pathname.includes("/assets/"));
      await cache.addAll(["manifest.webmanifest", "favicon.svg", ...assets.map((u) => u.href)]);
    })().catch(() => {}).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Pages: network first so a new deploy shows up on the next load; cached shell offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) put(new URL("./", self.registration.scope).href, res.clone());
          return res;
        })
        .catch(() => caches.match(new URL("./", self.registration.scope).href, MATCH).then((r) => r || Response.error())),
    );
    return;
  }

  // Hashed build assets never change: cache first.
  if (sameOrigin && url.pathname.includes("/assets/")) {
    event.respondWith(caches.match(req, MATCH).then((hit) => hit || fetch(req).then((res) => (res.ok && put(req, res.clone()), res))));
    return;
  }

  // Other own files (icons, manifest, examples) and fonts: serve the cache, refresh in the background.
  if ((sameOrigin && !url.pathname.endsWith("/sw.js")) || FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.match(req, MATCH).then((hit) => {
        const net = fetch(req)
          .then((res) => {
            if (res.ok || res.type === "opaque") put(req, res.clone());
            return res;
          })
          .catch(() => hit || Response.error());
        return hit || net;
      }),
    );
  }
});

function put(key, res) {
  caches.open(CACHE).then((c) => c.put(key, res));
}
