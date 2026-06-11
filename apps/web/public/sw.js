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
      icon: '/icon-192.png',
      badge: '/icon-192.png',
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
