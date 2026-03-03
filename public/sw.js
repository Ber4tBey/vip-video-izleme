// Service Worker - cache only image media. Do not intercept video/range requests.
const CACHE_NAME = 'vip-media-v2';
const IMAGE_MEDIA_PATTERN = /\/uploads\/(images|thumbnails)\//;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.headers.has('range')) return;

  if (!IMAGE_MEDIA_PATTERN.test(request.url)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    const networkFetch = fetch(request)
      .then((response) => {
        if (response.ok && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      });

    if (cached) {
      event.waitUntil(networkFetch.catch(() => {}));
      return cached;
    }

    return networkFetch.catch(() => cached || Response.error());
  })());
});
