/*
 * NEXVO offline driver app: service worker (DECISIONS D-77).
 * Scope "/", but it only answers two kinds of request; everything else goes to the network untouched:
 *   1. navigations to /{ar,fr,en}/field: network first (3 s), then the saved copy, so the page opens without network;
 *   2. /_next/static/* (content-hashed, immutable): cache first, so the page's JavaScript is not downloaded again.
 * Never cached: /api/* (job data lives in IndexedDB, written by the page), other pages, files, anything non-GET.
 */
const VERSION = "v1";
const PAGES = `nexvo-field-pages-${VERSION}`;
const STATIC = `nexvo-field-static-${VERSION}`;
const FIELD_PAGE = /^\/(ar|fr|en)\/field\/?$/;
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, STATIC]);
      for (const key of await caches.keys()) if (key.startsWith("nexvo-field-") && !keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function fieldPage(request) {
  const cache = await caches.open(PAGES);
  const key = new URL(request.url).pathname.replace(/\/$/, "");
  const network = fetch(request).then(async (res) => {
    // Only a real page: a redirect (expired session → login) or an error must not replace the saved copy.
    if (res.ok && !res.redirected && res.type === "basic") await cache.put(key, res.clone());
    return res;
  });
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
    const saved = await cache.match(key);
    return saved ?? (await network);
  } catch {
    const saved = await cache.match(key);
    if (saved) return saved;
    return new Response("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>NEXVO</title><p style='font:18px system-ui;padding:24px'>Offline · Hors ligne · غير متصل</p>", {
      status: 503,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

async function staticAsset(request) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === "basic") await cache.put(request, res.clone());
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === "navigate" && FIELD_PAGE.test(url.pathname)) return event.respondWith(fieldPage(request));
  if (url.pathname.startsWith("/_next/static/")) return event.respondWith(staticAsset(request));
});

/** The page sends the script/style URLs it loaded before the worker took control, so they are saved too. */
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "precache" && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(STATIC);
        for (const u of data.urls.slice(0, 200)) {
          try {
            const url = new URL(u, self.location.origin);
            if (url.origin !== self.location.origin || !url.pathname.startsWith("/_next/static/")) continue;
            if (!(await cache.match(url.pathname))) await cache.add(url.pathname);
          } catch {
            /* one missing chunk must not stop the others */
          }
        }
      })(),
    );
  }
  if (data.type === "clear") event.waitUntil(Promise.all([caches.delete(PAGES)]));
});
