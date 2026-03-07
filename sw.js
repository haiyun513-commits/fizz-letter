const CACHE_NAME = 'fizz-letter-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/app.js',
  '/js/letters.js',
  '/js/bubbles.js',
  '/js/answer.js',
  '/js/tarot.js',
  '/images/favicon-32.png',
  '/images/favicon-16.png',
  '/images/apple-touch-icon.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // API 请求不缓存，直接走网络
  if (e.request.url.includes('/api/')) {
    return;
  }
  // 塔罗图片：缓存优先
  if (e.request.url.includes('/images/tarot/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return resp;
        });
      })
    );
    return;
  }
  // 静态资源：缓存优先，回退网络
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
