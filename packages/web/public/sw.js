/*
 * A deliberately small service worker.
 *
 * It exists for one reason: this is meant to live on a home screen and be opened in the two minutes
 * before somebody falls asleep, sometimes on a bad connection. Without this, a dropped request means
 * the browser's own "cannot connect" page, which for an app you tapped from your home screen reads as
 * "the thing my partner made me is broken".
 *
 * The caching strategy is chosen entirely around not serving stale code, because a service worker that
 * pins an old bundle forever is far worse than having none at all:
 *
 *   /api/*        never touched. The room is live state; a cached mood is a lie.
 *   navigations   network first, cache as fallback. index.html is NOT content-hashed, so caching it
 *                 first would keep serving yesterday's HTML, pointing at a bundle that no longer
 *                 exists, and the app would white-screen after every deploy.
 *   everything    cache first. Vite hashes these filenames, so a given URL's contents can never
 *   else          change: if the bundle changes, so does its name, and this cache simply misses.
 *
 * skipWaiting plus clients.claim means a new version takes over on the next open rather than waiting
 * for every tab to close, which on a phone can be weeks.
 */
const CACHE = "mrrp-v1";
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
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
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
