/* ScheduCal Service Worker v3 — Self-scheduling notifications */
const CACHE_NAME = 'scheducal-v3';

/* Pending alarms stored in SW memory (survives page sleep on Android) */
const pendingAlarms = new Map(); // id → timeoutId

function scheduleAlarmInSW(alarm) {
    const { id, fireAt, title, body, tag } = alarm;
    const ms = fireAt - Date.now();
    if (ms <= 0) return; // already past

    // Clear existing timer for this id
    if (pendingAlarms.has(id)) clearTimeout(pendingAlarms.get(id));

    const tid = setTimeout(() => {
        pendingAlarms.delete(id);
        self.registration.showNotification(title, {
            body:               body,
            tag:                tag || id,
            icon:               './icons/apple-touch-icon.png',
            badge:              './icons/apple-touch-icon.png',
            vibrate:            [200, 100, 200, 100, 200],
            requireInteraction: false,
            silent:             false
        }).catch(e => console.warn('[SW] showNotification failed:', e));
    }, ms);

    pendingAlarms.set(id, tid);
    console.log(`[SW] Alarm set for "${title}" in ${Math.round(ms/1000)}s`);
}

/* ── Install ── */
self.addEventListener('install', e => {
    console.log('[SW] Installing v3');
    self.skipWaiting();
});

/* ── Activate ── */
self.addEventListener('activate', e => {
    console.log('[SW] Activating v3');
    e.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

/* ── Message handler ── */
self.addEventListener('message', e => {
    if (!e.data) return;

    switch (e.data.type) {

        // Schedule one alarm inside the SW
        case 'SCHEDULE_ALARM':
            scheduleAlarmInSW(e.data.alarm);
            e.source && e.source.postMessage({ type: 'ALARM_ACK', id: e.data.alarm.id });
            break;

        // Bulk-sync all alarms (called on app open / visibility-change)
        case 'SYNC_ALARMS':
            // Cancel all existing timers
            pendingAlarms.forEach(tid => clearTimeout(tid));
            pendingAlarms.clear();
            // Re-register every alarm
            (e.data.alarms || []).forEach(a => scheduleAlarmInSW(a));
            e.source && e.source.postMessage({ type: 'SYNC_ACK', count: e.data.alarms.length });
            break;

        // Instant notification (test button, etc.)
        case 'SHOW_NOTIFICATION':
            e.waitUntil(
                self.registration.showNotification(e.data.title, {
                    body:    e.data.body,
                    tag:     e.data.tag || ('notif-' + Date.now()),
                    icon:    './icons/apple-touch-icon.png',
                    badge:   './icons/apple-touch-icon.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: false
                })
            );
            break;

        // Cancel a specific alarm
        case 'CANCEL_ALARM':
            if (pendingAlarms.has(e.data.id)) {
                clearTimeout(pendingAlarms.get(e.data.id));
                pendingAlarms.delete(e.data.id);
            }
            break;

        case 'PING':
            e.source && e.source.postMessage({ type: 'PONG', alarms: pendingAlarms.size });
            break;
    }
});

/* ── Notification click ── */
self.addEventListener('notificationclick', e => {
    e.notification.close();
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if ('focus' in c) return c.focus();
            }
            return clients.openWindow('./');
        })
    );
});

/* ── Push (server-sent, future use) ── */
self.addEventListener('push', e => {
    let p = { title: 'ScheduCal', body: 'You have a reminder.' };
    try { if (e.data) p = e.data.json(); } catch (_) {}
    e.waitUntil(
        self.registration.showNotification(p.title, {
            body: p.body, tag: p.tag || 'push', icon: './icons/apple-touch-icon.png',
            badge: './icons/apple-touch-icon.png', vibrate: [200, 100, 200]
        })
    );
});

/* ── Fetch: network-first ── */
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request).then(res => {
            if (res && res.status === 200 && res.type === 'basic') {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
            }
            return res;
        }).catch(() => caches.match(e.request))
    );
});
