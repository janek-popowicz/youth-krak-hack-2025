const CACHE = "app-cache-v1";
const ASSETS = [
    "/",
    "/index.html",
    "/style.css",
    "/app.js",
    "/calendar.html",
    "/icons/icon-192.png",
    "/icons/icon-512.png"
];

// Instalacja – zapisujemy pliki do cache
self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(ASSETS))
    );
});

// Fetch – serwujemy z cache gdy offline
self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(res => res || fetch(event.request))
    );
});
