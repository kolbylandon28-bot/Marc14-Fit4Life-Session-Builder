const CACHE_NAME = "fit4life-shell-2026-08-24-v82-practice-mark-r1";
const SUPABASE_SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.9";
const ASSET_VERSION = "20260820-v82-practice-mark-r1";
const SHELL = [
  "/",
  "/index.html",
  "/cloud-sync.js?v=" + ASSET_VERSION,
  "/styles.css?v=" + ASSET_VERSION,
  "/js/app/client-consultation.js?v=" + ASSET_VERSION,
  "/js/app/role-governance.js?v=" + ASSET_VERSION,
  "/js/app/action-calendar.js?v=" + ASSET_VERSION,
  "/js/app/walkthrough.js?v=" + ASSET_VERSION,
  "/js/app/workout-feedback-reports.js?v=" + ASSET_VERSION,
  "/dark-rock-background-v2.jpg",
  "/theme-assets/halloween-scene.jpg",
  "/theme-assets/thanksgiving-scene.jpg",
  "/theme-assets/christmas-scene.jpg",
  "/theme-assets/valentine-scene.jpg",
  "/theme-assets/new-year-scene.jpg",
  "/theme-assets/independence-scene.jpg",
  "/manifest.webmanifest",
  "/fit4life-icon.svg",
  "/fit4life-icon-maskable.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL).then(() => fetch(SUPABASE_SDK,{mode:"no-cors"}).then((response) => cache.put(SUPABASE_SDK,response)).catch(() => null)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function canCache(response) {
  return response && response.ok && response.type === "basic";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.url === SUPABASE_SDK) {
    event.respondWith(caches.match(SUPABASE_SDK).then((cached) => cached || fetch(request).then((response) => {
      caches.open(CACHE_NAME).then((cache) => cache.put(SUPABASE_SDK,response.clone()));
      return response;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (canCache(response)) caches.open(CACHE_NAME).then((cache) => cache.put("/", response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  const needsFreshAppCode = request.destination === "script"
    || request.destination === "style"
    || request.destination === "manifest"
    || url.pathname === "/cloud-sync.js";
  if (needsFreshAppCode) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (canCache(response)) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (canCache(response)) caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    }))
  );
});
