// Service Worker — Islam Agent Épistémique (TOSSARA)
const CACHE_NAME = 'tossara-v3';
const APP_ROOT = new URL('/islam-agent-epistemique/', self.location.origin);

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
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // Mettre les ressources en cache une par une afin qu'une ressource
    // manquante ne fasse pas échouer toute l'installation.
    await Promise.all(ASSETS_TO_CACHE.map(async url => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} pour ${url}`);
        }
        await cache.put(url, response);
      } catch (error) {
        console.warn('[Service Worker] Ressource non mise en cache :', url, error);
      }
    }));

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith('tossara-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ne pas intercepter les requêtes vers d'autres domaines.
  if (url.origin !== self.location.origin) return;

  // Limiter le Service Worker à l'application et à ses sous-chemins.
  if (!url.pathname.startsWith(APP_ROOT.pathname)) return;

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      return await fetch(request);
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await caches.match(
          new URL('index.html', APP_ROOT).toString()
        );
        return fallback || Response.error();
      }
      return Response.error();
    }
  })());
});
