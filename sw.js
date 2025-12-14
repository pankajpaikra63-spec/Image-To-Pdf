const CACHE_NAME = 'img2pdf-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './worker.js'
];

// CDNs (Cache First / Stale While Revalidate)
const CDN_URLS = [
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Strategy for CDNs: Stale-While-Revalidate
  if (CDN_URLS.some(host => url.hostname === host)) {
    e.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(e.request);
        const fetched = fetch(e.request).then(networkRes => {
          cache.put(e.request, networkRes.clone());
          return networkRes;
        });
        return cached || fetched;
      })
    );
    return;
  }

  // Strategy for App Shell: Cache First, Fallback to Network
  e.respondWith(
    caches.match(e.request).then(res => res || fetch(e.request))
  );
});

// Skip Waiting logic for updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});