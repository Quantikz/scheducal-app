// ScheduCal Service Worker - Smart Update Handling
const CACHE_VERSION = 'scheducal-v4'; // ← INCREMENT THIS EVERY TIME YOU UPDATE THE APP!
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // Delete ALL old caches when version changes
                    if (cacheName !== CACHE_VERSION) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            if (response) {
                return response;
            }
            
            return fetch(event.request).then((fetchResponse) => {
                if (fetchResponse && fetchResponse.status === 200) {
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_VERSION).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return fetchResponse;
            }).catch(() => {
                if (event.request.destination === 'document') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(event.data.title, {
            body: event.data.body,
            icon: 'https://cdn-icons-png.flaticon.com/512/747/747310.png',
            vibrate: [200, 100, 200]
        });
    }
});