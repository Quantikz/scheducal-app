// ScheduCal Service Worker v11 - Final Icon Fix
const CACHE_NAME = 'scheducal-v11';

const STATIC_ASSETS = ['/', '/index.html', '/icons/icon-192.png', '/icons/icon-512.png', '/manifest.json'];

self.addEventListener('install', (event) => {
    console.log('[SW] Installing v11 (Final Icon Fix)...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activating v9...');
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (new URL(event.request.url).origin !== self.location.origin) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    caches.open(CACHE_NAME).then(c => c.put(event.request, response.clone()));
                }
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SHOW_NOTIFICATION') {
        self.registration.showNotification(event.data.title || 'ScheduCal', {
            body: event.data.body || '',
            icon: '/icons/icon-192.png',
            requireInteraction: true
        });
    }
});

self.addEventListener('push', (event) => {
    let data = {};
    try { if (event.data) data = event.data.json(); } catch(e){}
    
    self.registration.showNotification(data.title || 'ScheduCal', {
        body: data.body || '',
        icon: '/icons/icon-192.png',
        requireInteraction: true
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow('/'));
});
