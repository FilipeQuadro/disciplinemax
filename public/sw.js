// Service Worker — DisciplinaMax v3
// AGGRESSIVE cache busting — never caches HTML or JS bundles
const CACHE_NAME = "disciplina-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Delete ALL old caches unconditionally
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  // Never cache API, _next, or navigation requests — always go to network
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    event.request.mode === "navigate"
  ) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(event.request).then((r) => r || new Response("Offline", { status: 503 }))
      )
    );
    return;
  }

  // For static assets (images, fonts), try network first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "🎯 DisciplinaMax", {
      body: data.body || "Você tem metas pendentes hoje!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag || "disciplina-reminder",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});
