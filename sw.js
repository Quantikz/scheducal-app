/* ScheduCal Service Worker v2 — Android + iOS notification support */
const CACHE_NAME = 'scheducal-v4';

/* ── Install: cache shell assets ── */
self.addEventListener('install', e => {
    self.skipWaiting(); // activate immediately, don't wait for old SW to die
});

/* ── Activate: claim all clients so SW is controller immediately ── */
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim()) // take control of all open tabs immediately
    );
});

/* ── Fetch: network-first, cache fallback ── */
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request)
            .then(res => {
                // Cache successful responses
                if (res && res.status === 200 && res.type === 'basic') {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                }
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});

/* ── Message: show notification on demand from main thread ── */
self.addEventListener('message', e => {
    if (!e.data) return;

    if (e.data.type === 'SHOW_NOTIFICATION') {
        const { title, body, tag, data } = e.data;
        e.waitUntil(
            self.registration.showNotification(title, {
                body:               body,
                tag:                tag || 'scheducal-' + Date.now(),
                icon:               '/icons/apple-touch-icon.png',
                badge:              '/icons/apple-touch-icon.png',
                vibrate:            [200, 100, 200],
                requireInteraction: false,
                silent:             false,
                data:               data || {}
            })
        );
    }

    if (e.data.type === 'PING') {
        // Let the main thread know the SW is alive and active
        e.source && e.source.postMessage({ type: 'PONG' });
    }
});

/* ── Push: handle server-sent push (future use) ── */
self.addEventListener('push', e => {
    let payload = { title: 'ScheduCal Reminder', body: 'You have an upcoming event.' };
    try { if (e.data) payload = e.data.json(); } catch (_) {}

    e.waitUntil(
        self.registration.showNotification(payload.title, {
            body:    payload.body,
            tag:     payload.tag || 'push-' + Date.now(),
            icon:    '/icons/apple-touch-icon.png',
            badge:   '/icons/apple-touch-icon.png',
            vibrate: [200, 100, 200],
            data:    payload.data || {}
        })
    );
});

/* ── Notification click: focus or open the app ── */
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            // Focus existing window if open
            for (const client of list) {
                if ('focus' in client) return client.focus();
            }
            // Otherwise open a new window
            return clients.openWindow('/');
        })
    );
});
