const CACHE_NAME = 'rfp-discovery-v3';
const CORE_ASSETS = ['/', '/manifest.json', '/nebula-logo.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch((error) => {
        console.warn('[Service Worker] Core cache failed during install:', error);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
            return Promise.resolve(false);
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  // Only handle same-origin requests. Let browser handle external/CDN traffic.
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok) {
            return networkResponse;
          }

          const isCacheableAsset =
            event.request.mode === 'navigate' ||
            requestUrl.pathname.startsWith('/assets/') ||
            requestUrl.pathname.endsWith('.js') ||
            requestUrl.pathname.endsWith('.css') ||
            requestUrl.pathname.endsWith('.png') ||
            requestUrl.pathname.endsWith('.svg') ||
            requestUrl.pathname.endsWith('.json');

          if (isCacheableAsset) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch(() => {
                // Ignore cache put failures for non-critical resources.
              });
            });
          }

          return networkResponse;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return undefined;
        });
    })
  );
});
