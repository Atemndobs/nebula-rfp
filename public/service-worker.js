
const CACHE_NAME = 'rfp-discovery-tool-v2-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx', // esm.sh serves index.tsx as JS
  // From importmap - these are critical for app shell
  'https://esm.sh/react@^19.1.0',
  'https://esm.sh/react-dom@^19.1.0/client', // Note: react-dom/client specific path
  'https://esm.sh/@google/genai@^1.1.0',
  // Tailwind CSS (if CDN is consistently used)
  'https://cdn.tailwindcss.com',
  // Fonts (if CDN is consistently used)
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  // The logo image if it's critical for the initial shell
  'https://minio.goose-neon.ts.net/curator/assets/code.png'
];

// Install a service worker
self.addEventListener('install', event => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching app shell');
        // Add all URLs, but don't fail install if some external resources (CDN) fail
        const promises = urlsToCache.map(urlToCache => {
          return fetch(new Request(urlToCache, { mode: 'no-cors' })) // Use no-cors for opaque CDN resources
            .then(response => {
              if (response.status === 200 || response.status === 0) { // response.status === 0 for opaque responses
                return cache.put(urlToCache, response);
              }
              console.warn(`[Service Worker] Failed to cache (status ${response.status}): ${urlToCache}`);
              return Promise.resolve(); // Don't block install for individual failed CDN caches
            })
            .catch(err => {
              console.warn(`[Service Worker] Fetch error during cache of ${urlToCache}:`, err);
              return Promise.resolve(); // Don't block install
            });
        });
        // Add core, self-hosted assets more strictly
        const coreAssets = ['/', '/index.html', '/index.tsx', '/manifest.json']; // manifest.json added here
        coreAssets.forEach(url => {
            promises.push(
                fetch(url).then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch core asset: ${url}`);
                    }
                    return cache.put(url, response);
                }).catch(err => {
                    console.error(`[Service Worker] CRITICAL: Failed to cache core asset ${url}`, err);
                    // Optionally, could throw here to fail the install if core assets don't cache
                })
            );
        });

        return Promise.all(promises);
      })
      .then(() => self.skipWaiting()) // Activate worker immediately
  );
});

// Activate the service worker
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});

// Listen for requests
self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For API requests, always go to the network.
  // Example: if your API is at /api/ or an external domain
  if (event.request.url.includes('/api/v1/') || event.request.url.startsWith('https://fastapi.curator.atemkeng.eu')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For other requests, try cache first, then network.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[Service Worker] Returning from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[Service Worker] Not in cache, fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // If we got a valid response, clone it and cache it.
            // Only cache responses from our origin or known CDNs that were successfully fetched.
            if (networkResponse && networkResponse.status === 200 && 
                (event.request.url.startsWith(self.origin) || urlsToCache.some(u => event.request.url.startsWith(u)))) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          }
        ).catch(error => {
            console.warn('[Service Worker] Fetch failed for:', event.request.url, error);
            // You could return a custom offline page here if you have one cached.
            // For now, just let the browser handle the error (e.g., "No internet" page).
        });
      })
  );
});
