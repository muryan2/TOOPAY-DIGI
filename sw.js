self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('toopay-store').then((cache) => {
      return cache.addAll(['/TOOPAY-DIGI/', '/TOOPAY-DIGI/index.html']);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
