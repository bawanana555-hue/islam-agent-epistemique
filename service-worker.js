const CACHE_NAME = "islam-agent-cache-v2";

// Liste des fichiers locaux à mettre en cache pour l'affichage déconnecté
const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];

// Étape 1 : Installation et mise en cache du visuel
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("PWA : Mise en cache des fichiers statiques effectuée.");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// Étape 2 : Nettoyage des anciens caches lors d'une mise à jour
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log("PWA : Suppression de l'ancien cache", cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Étape 3 : Gestion intelligente des requêtes
self.addEventListener("fetch", (event) => {
    const url = new URL(event.request.url);

    // STRATÉGIE POUR L'IA (Render) : Ne jamais mettre en cache les requêtes de Chat !
    if (url.pathname.includes("/chat")) {
        event.respondWith(fetch(event.request));
        return;
    }

    // STRATÉGIE POUR L'INTERFACE (GitHub Pages) : Récupérer depuis le cache, sinon le réseau
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request);
        })
    );
});

