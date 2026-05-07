// Service Worker IAE Agent v3
const CACHE_NAME = 'iae-agent-v3';

// On install: skip waiting to activate immediately
self.addEventListener('install', e => {
    self.skipWaiting();
});

// On activate: delete ALL old caches to prevent white screen
self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    console.log('[SW] Deleting old cache:', cacheName);
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            return self.clients.claim();
        })
    );
});

// On fetch: network first (always get fresh content)
self.addEventListener('fetch', e => {
    // Only cache GET requests for same-origin
    if (e.request.method !== 'GET') return;
    
    // Don't cache API calls
    if (e.request.url.includes('googleapis.com') || 
        e.request.url.includes('api.quran.com') ||
        e.request.url.includes('amazonaws.com')) {
        return;
    }
    
    e.respondWith(
        fetch(e.request)
            .then(response => {
                // If good response, cache it
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // If offline, try cache
                return caches.match(e.request);
            })
    );
});
