// Import or inject generated version hash during build phase
const CURRENT_CACHE_VERSION = 'tiktoken-ranks-v1.0.8-hash-a1b2c3d';

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete any cache bucket that doesn't match the current manifest version
          if (cacheName.startsWith('tiktoken-ranks-') && cacheName !== CURRENT_CACHE_VERSION) {
            console.log(`[SW Cache Invalidation] Purging stale rank cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
