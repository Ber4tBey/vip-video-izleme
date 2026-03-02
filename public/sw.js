// Service Worker — cache /uploads/* in browser Cache Storage
const CACHE_NAME = 'vip-media-v1';
const MEDIA_PATTERN = /\/uploads\//;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (!MEDIA_PATTERN.test(e.request.url)) return;

  // Network-first for videos (support range requests), cache-first for images
  const isVideo = e.request.url.includes('/uploads/videos/');

  if (isVideo) {
    // Videos: network first, fallback to cache
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    // Images: cache first
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const response = await fetch(e.request);
        if (response.ok) cache.put(e.request, response.clone());
        return response;
      })
    );
  }
});
