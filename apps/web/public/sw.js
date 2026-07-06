var CACHE_NAME = 'sfpl-shell-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.add('/');
    })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (names) {
        return Promise.all(
          names
            .filter(function (n) {
              return n !== CACHE_NAME;
            })
            .map(function (n) {
              return caches.delete(n);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  // Never intercept cross-origin requests (FPL worker, Supabase, etc.)
  if (url.origin !== self.location.origin) return;

  // Never cache API routes or FPL data paths — live scores must always be fresh
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/fpl')) return;

  // Navigate: network-first, fall back to cached shell for offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(function () {
        return caches.match('/');
      })
    );
  }
});

self.addEventListener('push', function (event) {
  if (!event.data) return;
  var payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/pwa-icon/192',
      badge: '/pwa-icon/192',
      data: { url: payload.url, id: payload.id },
    })
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if (c.url.startsWith(self.location.origin) && 'focus' in c) {
          c.postMessage({ type: 'NOTIFICATION_CLICK', url: url });
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
