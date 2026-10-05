/* INTER SERVICE Audit Industriel — Service Worker */
const CACHE = 'isai-stock-v2.2.6';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './public/icons/icon-192.png',
  './public/icons/icon-512.png',
  './public/vendor/tailwind-browser.js',
  './public/vendor/lucide.js',
  './public/vendor/xlsx.full.min.js',
  './public/vendor/jszip.min.js',
  './public/server-client.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Les données centrales doivent toujours venir de SQLite, jamais du cache PWA.
  if (new URL(request.url).pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
