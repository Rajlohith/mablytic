/* ═══════════════════════════════════════════════════════════════════
   MABlytic Service Worker  —  v5
   Strategy:
     HTML/JS/CSS  → Network-first + background cache
     Images/Icons → Cache-first
     /serve-ad/   → Network-first + cache for OFFLINE demo
     All other API → Pass-through (never cached)
   ═══════════════════════════════════════════════════════════════════ */

const CACHE_VERSION = 'mablytic-v5';
const API_HOST      = 'mablytic.onrender.com';

const PRECACHE_URLS = [
  '/index.html',
  '/register.html',
  '/feed.html',
  '/admin.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ─────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('[SW] Pre-cache partial failure:', err))
    )
  );
});

// ── Activate ────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // ── Special: /serve-ad/ — cache for offline ad demo ──────────────
  if (url.hostname === API_HOST && url.pathname.includes('/serve-ad/')) {
    event.respondWith(
      fetch(request, { mode: 'cors' })
        .then(response => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => {
              // Store with the user-specific URL so each user gets their own cache
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Offline — return cached ad response
          const cached = await caches.match(request);
          if (cached) return cached;
          // No specific cache — try any cached serve-ad response
          const cache = await caches.open(CACHE_VERSION);
          const keys  = await cache.keys();
          const adKey = keys.find(k => k.url.includes('/serve-ad/'));
          if (adKey) return cache.match(adKey);
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // ── Skip all other API calls ──────────────────────────────────────
  if (url.hostname === API_HOST) return;

  // ── Cross-origin (fonts, CDN) — network with cache fallback ──────
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // ── Images & icons — cache-first ─────────────────────────────────
  if (request.destination === 'image' || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(c => c.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── HTML / JS / CSS — network-first, update cache in background ──
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(c => c.put(request, clone));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') return caches.match('/index.html');
        return new Response('Offline', { status: 503 });
      })
  );
});

// ── Push Notifications ───────────────────────────────────────────────
self.addEventListener('push', event => {
  let data = {
    title: 'MABlytic — New Ad for You',
    body:  'A personalized deal is waiting! Open the app to see it. 🎯',
    url:   '/feed.html',
    tag:   'mablytic-ad',
  };

  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:     data.body,
      icon:     '/icons/icon-192.png',
      badge:    '/icons/icon-96.png',
      tag:      data.tag,
      renotify: true,
      vibrate:  [200, 100, 200],
      data:     { url: data.url },
      actions:  [
        { action: 'view',    title: '👁 View Ad' },
        { action: 'dismiss', title: '✕ Dismiss'  },
      ],
    })
  );
});

// ── Notification click ───────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const target = event.notification.data?.url || '/feed.html';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.focus(); c.navigate(target); return;
        }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});