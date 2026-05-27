// IvanPlaner Service Worker
// Strategy:
//   - Precache app shell + offline fallback
//   - Navigations: network-first, fallback to cached page, then to /offline
//   - Static (next/static, icons, _next/image): cache-first
//   - Supabase API: bypass (online-only; Dexie keeps local copy)
//   - Push: forward to Notifications API

const VERSION = "v6-push-priority-2026-05-27";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;

const SHELL_URLS = [
  "/",
  "/tasks",
  "/inbox",
  "/spheres",
  "/week",
  "/today",
  "/month",
  "/offline",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // addAll fails atomically; use individual adds to skip 404s in dev
      Promise.all(
        SHELL_URLS.map((url) =>
          cache.add(url).catch((e) => console.warn("SW precache miss", url, e)),
        ),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.endsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

function isSupabaseRequest(url) {
  return url.hostname.endsWith(".supabase.co");
}

function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icon") ||
    /\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Bypass Supabase — let Dexie/sync engine handle offline
  if (isSupabaseRequest(url)) return;

  // Navigations
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          // Кешируем только успешные basic-ответы для shell-маршрутов.
          // Redirect responses Cache API отвергает (TypeError), их пропускаем.
          if (
            SHELL_URLS.includes(url.pathname) &&
            fresh.ok &&
            fresh.type === "basic" &&
            !fresh.redirected
          ) {
            const cache = await caches.open(SHELL_CACHE);
            cache.put(req, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match(req);
          if (cached) return cached;
          const offline = await cache.match("/offline");
          if (offline) return offline;
          return new Response("Offline", { status: 503 });
        }
      })(),
    );
    return;
  }

  // Static — cache-first
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          if (fresh.ok) cache.put(req, fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Other same-origin GET — runtime cache, network-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(req);
          return cached || Response.error();
        }
      })(),
    );
  }
});

// Push notifications (kept from existing web-push integration)
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "IvanPlaner", body: event.data.text() };
  }
  const title = payload.title || "IvanPlaner";
  const options = {
    body: payload.body || "",
    icon: "/icon1",
    badge: "/icon1",
    data: payload.data || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((wins) => {
        for (const w of wins) {
          if ("focus" in w) {
            w.navigate(url);
            return w.focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});

// Background sync (Android Chrome) — main thread will register tag 'outbox-sync'
self.addEventListener("sync", (event) => {
  if (event.tag === "outbox-sync") {
    event.waitUntil(
      self.clients.matchAll().then((wins) => {
        for (const w of wins) w.postMessage({ type: "RUN_OUTBOX_SYNC" });
      }),
    );
  }
});
