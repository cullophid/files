// Version for cache management
const CACHE_VERSION = 'v1';
const CACHE_NAME = `app-cache-${CACHE_VERSION}`;

// Routes to cache
const CACHED_ROUTES = ['/', '/users', '/events'];

// Install event - cache our routes
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(CACHED_ROUTES);
      })
      .catch(error => {
        console.error('Cache installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
});

// Fetch event - implement stale-while-revalidate
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Check if the request URL matches our cached routes
  const url = new URL(event.request.url);
  if (!CACHED_ROUTES.includes(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.match(event.request)
          .then(cachedResponse => {
            const fetchPromise = fetch(event.request)
              .then(networkResponse => {
                // Clone the response before caching as the response body can only be read once
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              })
              .catch(error => {
                console.error('Fetch failed:', error);
                // If network fetch fails and we have a cached response, return it
                if (cachedResponse) return cachedResponse;
                throw error;
              });

            // Return cached response immediately if available, otherwise wait for network
            return cachedResponse || fetchPromise;
          });
      })
  );
});

// Handle message events (useful for cache invalidation)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
