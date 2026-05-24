const CACHE_NAME = 'scheducal-production-v3';

const APP_ASSETS = [
  './',
  './index.html',
  './production_manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );

  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return (
        response ||
        fetch(event.request)
          .then(networkResponse => {
            if (
              event.request.method === 'GET' &&
              networkResponse.status === 200
            ) {
              const cloned = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, cloned);
              });
            }

            return networkResponse;
          })
          .catch(() => caches.match('./index.html'))
      );
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }

      if (clients.openWindow) {
        return clients.openWindow('./index.html');
      }
    })
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SHOW_NOTIFICATION') {
    self.registration.showNotification(event.data.title || 'ScheduCal', {
      body: event.data.body || 'Reminder',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'scheducal-notification'
    });
  }
});
