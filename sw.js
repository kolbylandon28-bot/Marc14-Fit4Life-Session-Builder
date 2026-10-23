const CACHE_NAME = "fit4life-shell-2026-10-22-v151-saved-workouts-r1";
const SUPABASE_SDK = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.9";
const ASSET_VERSION = "20261022-v151-saved-workouts-r1";
const SHELL = [
  "/",
  "/index.html",
  "/cloud-sync.js?v=" + ASSET_VERSION,
  "/styles.css?v=" + ASSET_VERSION,
  "/js/app/client-consultation.js?v=" + ASSET_VERSION,
  "/js/app/role-governance.js?v=" + ASSET_VERSION,
  "/js/app/action-calendar.js?v=" + ASSET_VERSION,
  "/js/app/trainer-audits.js?v=" + ASSET_VERSION,
  "/js/app/area-art.js?v=" + ASSET_VERSION,
  "/js/app/work-areas.js?v=" + ASSET_VERSION,
  "/js/app/area-tools.js?v=" + ASSET_VERSION,
  "/js/app/walkthrough.js?v=" + ASSET_VERSION,
  "/js/app/workout-feedback-reports.js?v=" + ASSET_VERSION,
  // Every script index.html loads, in load order. These were served network-first and
  // cached only after a successful online fetch, so a cold start straight after a deploy
  // had nothing at the new ?v= URL and the offline promise broke.
  "/js/engine/exercise-library.js?v=" + ASSET_VERSION,
  "/js/engine/session-engine.js?v=" + ASSET_VERSION,
  "/js/engine/session-builders.js?v=" + ASSET_VERSION,
  "/js/engine/personalization.js?v=" + ASSET_VERSION,
  "/js/engine/booking-import.js?v=" + ASSET_VERSION,
  "/js/app/navigation.js?v=" + ASSET_VERSION,
  "/js/app/program-app.js?v=" + ASSET_VERSION,
  "/js/app/forms.js?v=" + ASSET_VERSION,
  "/js/engine/generation.js?v=" + ASSET_VERSION,
  "/js/app/rendering.js?v=" + ASSET_VERSION,
  "/js/app/calculations-timers.js?v=" + ASSET_VERSION,
  "/js/engine/multiweek-programs.js?v=" + ASSET_VERSION,
  "/js/app/readiness-progress.js?v=" + ASSET_VERSION,
  "/js/trainer/trainer-hub.js?v=" + ASSET_VERSION,
  "/js/trainer/coaching-support.js?v=" + ASSET_VERSION,
  "/js/app/booking-import-ui.js?v=" + ASSET_VERSION,
  "/js/app/intro-video.js?v=" + ASSET_VERSION,
  "/js/init.js?v=" + ASSET_VERSION,
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
  // Video streams with Range requests; the Cache API cannot store a 206 response.
  if (request.destination === "video" || request.destination === "audio" || request.headers.has("range")
    || /\.(mp4|m4v|webm|mov)$/i.test(url.pathname)) return;

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
