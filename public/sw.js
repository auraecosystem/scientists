/* Generated cache shell; production builds replace the version. */
const CACHE_PREFIX = 'tiktoken-ranks-';
const CURRENT_CACHE_NAME = CACHE_PREFIX + 'uninitialized';
const isRankAsset = (url) => /(?:^|\/)js-tiktoken[\/]ranks[\/][^/]+(?:\.js)?$/.test(url.pathname);
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CURRENT_CACHE_NAME).map((name) => caches.delete(name)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (event) => { const url = new URL(event.request.url); if (event.request.method !== 'GET' || !isRankAsset(url)) return; event.respondWith((async () => { const cache = await caches.open(CURRENT_CACHE_NAME); const cached = await cache.match(event.request); if (cached) return cached; const response = await fetch(event.request); if (response.ok) await cache.put(event.request, response.clone()); return response; })()); });
