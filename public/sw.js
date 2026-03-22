const CACHE_NAME = "moodmeals-cache-v1";

const CORE_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.svg",
  "/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // If core assets fail, still allow activation.
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

const isSameOrigin = (requestUrl) => {
  try {
    const url = new URL(requestUrl);
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
};

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (!isSameOrigin(request.url)) return;

  const url = new URL(request.url);

  // Cache-first for Next static assets and app shell resources.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/icon-192.svg" ||
    url.pathname === "/icon-512.svg"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
            return res;
          })
          .catch(() => cached);
      })
    );
    return;
  }

  // Network-first for everything else (with a cache fallback).
  event.respondWith(
    fetch(request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});

