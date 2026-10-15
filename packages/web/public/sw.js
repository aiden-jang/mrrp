// Static shell only. API requests always use the network.

const CACHE = "mrrp-v2";
// The font is here rather than left to the cache-first rule below so a home-screen open on no signal
// still gets the right typeface. Not content-hashed, so replacing the file needs a CACHE bump.
const SHELL = [
  "/",
  "/icon.svg",
  "/apple-touch-icon.png",
  "/manifest.webmanifest",
  "/fonts/quicksand-latin.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      // Individually, so one 404 cannot fail the whole install and leave the app with no worker.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("mrrp-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.cache === "no-store") return;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Live state. Let it fail honestly rather than answer with something old.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        // Any room URL falls back to the cached shell: routing is client-side, so index.html is the
        // right answer for /r/anything.
        .catch(() => caches.match("/").then((r) => r ?? Response.error())),
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            void caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
