self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('mon-cache')
      .then(cache => cache.addAll([
        '/',
        '/styles.css',
        '/script.js'
      ]))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
