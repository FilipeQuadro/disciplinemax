// Service Worker — DisciplinaMax v4
// Offline-first shell + aggressive cache busting for JS/CSS
const CACHE_NAME = "disciplina-v4";
const SHELL_CACHE = "disciplina-shell-v4";

// Assets to pre-cache on install (static, never change)
const PRE_CACHE = [
  "/icon-192.png",
  "/icon-512.png",
  "/favicon-32.png",
  "/manifest.json",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // Pre-cache static assets
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRE_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  // Delete ALL old caches unconditionally
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== SHELL_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Same-origin only
  if (url.origin !== self.location.origin) {
    // For external resources (fonts, CDN), try network then cache
    if (url.hostname.includes("googleapis.com") || url.hostname.includes("gstatic.com")) {
      event.respondWith(
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            }
            return response;
          }).catch(() => new Response("", { status: 503 }));
        })
      );
    }
    return;
  }

  // ── NAVIGATION REQUESTS (HTML pages) ──
  // Strategy: Network-first with offline shell fallback
  // This replaces the Render "waking up" screen with our branded loading
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the successful navigation response as the offline shell
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Server is down (Render cold start or offline)
          // Return the cached shell if available
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            // Fallback: return any cached HTML page
            return caches.match("/").then((root) => root || new Response(offlinePage(), {
              headers: { "Content-Type": "text/html; charset=utf-8" },
            }));
          });
        })
    );
    return;
  }

  // ── API REQUESTS ──
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .catch(() => new Response(JSON.stringify({ error: "Servidor indisponível" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }))
    );
    return;
  }

  // ── JS/CSS BUNDLES (_next/) ──
  // Network-first — always get latest, cache for offline
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── STATIC ASSETS (images, etc.) ──
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => new Response("", { status: 503 }));
    })
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

// Offline fallback page — branded loading screen that auto-retries
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#0B0E14">
  <title>DisciplinaMax – Mentor de Disciplina</title>
  <link rel="icon" href="/favicon-32.png">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0B0E14;
      color: #F0F0F0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 2rem;
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: linear-gradient(135deg, #A8892B, #D4AF37, #F5D060);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 50px rgba(212,175,55,0.25), 0 0 100px rgba(212,175,55,0.08);
      animation: logoGlow 2s ease-in-out infinite alternate;
    }
    .logo svg { width: 32px; height: 32px; fill: #0B0E14; }
    @keyframes logoGlow {
      0% { box-shadow: 0 0 30px rgba(212,175,55,0.15), 0 0 60px rgba(212,175,55,0.05); }
      100% { box-shadow: 0 0 50px rgba(212,175,55,0.3), 0 0 100px rgba(212,175,55,0.1); }
    }
    .title {
      margin-top: 24px;
      font-family: Georgia, 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #F5D060, #D4AF37);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      margin-top: 8px;
      font-size: 11px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #555E6E;
    }
    .loader {
      margin-top: 40px;
      width: 140px;
      height: 3px;
      background: rgba(255,255,255,0.04);
      border-radius: 4px;
      overflow: hidden;
    }
    .loader-bar {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #A8892B, #D4AF37, #F5D060);
      width: 0%;
      animation: load 3s ease-in-out infinite;
    }
    @keyframes load {
      0% { width: 0%; margin-left: 0; }
      50% { width: 60%; margin-left: 20%; }
      100% { width: 0%; margin-left: 100%; }
    }
    .status {
      margin-top: 24px;
      font-size: 12px;
      color: #555E6E;
      letter-spacing: 0.05em;
    }
    .status-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #D4AF37;
      margin-right: 6px;
      animation: blink 1.5s ease-in-out infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
    .retry-btn {
      margin-top: 32px;
      padding: 10px 28px;
      border-radius: 12px;
      border: 1px solid rgba(212,175,55,0.3);
      background: linear-gradient(135deg, #A8892B, #D4AF37);
      color: #0B0E14;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: none;
    }
    .retry-btn:hover {
      box-shadow: 0 6px 30px rgba(212,175,55,0.35);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
    </div>
    <div class="title">DisciplinaMax</div>
    <div class="subtitle">Mentor de Disciplina</div>
    <div class="loader"><div class="loader-bar"></div></div>
    <div class="status">
      <span class="status-dot"></span>
      <span id="statusText">Conectando ao servidor...</span>
    </div>
    <button class="retry-btn" id="retryBtn" onclick="location.reload()">Tentar novamente</button>
  </div>
  <script>
    var retryCount = 0;
    var maxRetries = 10;
    var retryDelay = 3000;
    var statusEl = document.getElementById('statusText');
    var retryBtn = document.getElementById('retryBtn');

    function tryReconnect() {
      retryCount++;
      if (retryCount <= 3) {
        statusEl.textContent = 'Conectando ao servidor...';
      } else if (retryCount <= 6) {
        statusEl.textContent = 'O servidor está acordando, aguarde...';
      } else {
        statusEl.textContent = 'Quase lá...';
      }

      fetch('/', { method: 'HEAD', cache: 'no-store' })
        .then(function(res) {
          if (res.ok) {
            statusEl.textContent = 'Conectado! Carregando...';
            setTimeout(function() { location.reload(); }, 500);
          } else {
            scheduleRetry();
          }
        })
        .catch(function() {
          if (retryCount >= maxRetries) {
            statusEl.textContent = 'Não foi possível conectar';
            retryBtn.style.display = 'block';
          } else {
            scheduleRetry();
          }
        });
    }

    function scheduleRetry() {
      setTimeout(tryReconnect, retryDelay);
    }

    // Start retrying after initial delay
    setTimeout(tryReconnect, 4000);
  </script>
</body>
</html>`;
}
