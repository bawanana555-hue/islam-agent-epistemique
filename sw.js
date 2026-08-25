// Service Worker — Islam Agent Épistémique (TOSSARA)
const CACHE_NAME = 'tossara-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/db.js',
  '/rag_engine.js',
  '/app.js'
];

// Installation
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Mise en cache des ressources TOSSARA');
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('Cache partiel:', err));
    })
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes (Mode Hors-ligne)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).catch(() => {
        // Fallback en cas d'absence de réseau
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
