// Service Worker MagnaSuperApp — menangani Web Push notification.
// File ini WAJIB ada di /public (root static) supaya scope-nya "/" (bisa
// menerima push untuk seluruh app, bukan cuma satu folder).

// Handler "fetch" kosong (passthrough, tidak `respondWith`) — bukan untuk
// offline caching, cuma supaya kriteria "installable" (Add to Home
// Screen/Install App) di browser lama tetap terpenuhi (sebagian versi
// Chrome/Android dulu mensyaratkan Service Worker punya listener fetch).
// Tidak mengubah perilaku network sama sekali.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let payload = { title: "MagnaSuperApp", body: "Ada pembaruan baru." };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload = { ...payload, body: event.data.text() };
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    data: { url: payload.url || "/dashboard" },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client && client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
