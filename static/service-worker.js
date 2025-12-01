const CACHE_NAME = 'focus-forest-v1';
const ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/guzik_g77.svg',
  '/icons/guzik_g78.svg',
  '/icons/guzik_g79.svg',
  '/static/main.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  // cache-first for app shell
  const req = event.request;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // optional: cache GET responses for same-origin
        if (req.method === 'GET' && req.url.startsWith(self.location.origin)) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
        }
        return res;
      }).catch(() => {
        // fallback: maybe return cached '/' or nothing
        return caches.match('/');
      });
    })
  );
});