// Service Worker — Islam Agent Épistémique (TOSSARA)
const CACHE_NAME = 'tossara-v2';
const APP_ROOT = self.registration.scope;
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './db.js',
  './rag_engine.js',
  './islam_data.json',
  './icon-192.png',
  './icon-512.png'
].map(path => new URL(path, APP_ROOT).toString());

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .catch(error => console.warn('[Service Worker] Cache initial incomplet:', error))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('tossara-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;

    try {
      return await fetch(event.request);
    } catch (error) {
      if (event.request.mode === 'navigate') {
        return (await caches.match(new URL('./index.html', APP_ROOT).toString())) || Response.error();
      }
      return Response.error();
    }
  })());
});
