// Service Worker para DisciplinaApp
const CACHE_NAME = "disciplina-v1";
const STATIC_ASSETS = ["/", "/livros", "/biblia", "/pomodoro"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Receber notificações push
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || "Você tem metas pendentes hoje!",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || "disciplina-reminder",
    requireInteraction: data.requireInteraction || false,
    actions: [
      { action: "open", title: "📖 Abrir App" },
      { action: "dismiss", title: "✓ Já fiz" },
    ],
    data: { url: data.url || "/" },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "🎯 DisciplinaApp", options)
  );
});

// Clique na notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || "/")
  );
});

// Agendamento periódico de notificações (Periodic Background Sync)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-goals") {
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  try {
    const response = await fetch("/api/notifications/check");
    const { hasPending, message } = await response.json();
    if (hasPending) {
      await self.registration.showNotification("📚 Meta pendente!", {
        body: message,
        icon: "/icon-192.png",
        tag: "periodic-reminder",
      });
    }
  } catch (e) {
    console.log("Periodic check failed:", e);
  }
}
