"use strict";

// Bump this whenever index.html (or this file) changes, so old
// clients pick up the new version instead of being stuck on a stale cache.
const CACHE_VERSION = "v18";
const CACHE_NAME = "review-deck-" + CACHE_VERSION;

// Same-origin app shell — precached on install so the app can launch with
// zero network at all. Everything else (Google Fonts, mammoth.js, KaTeX,
// and KaTeX's own font files) is cached opportunistically the first time
// it's actually fetched, so this list doesn't need to track CDN versions.
const PRECACHE_URLS = [
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Page navigations: try the network first so updates show up right away,
  // fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Everything else (styles, scripts, fonts, icons — same-origin or CDN):
  // cache-first, and quietly populate the cache on first successful fetch.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => cached);
    })
  );
});
