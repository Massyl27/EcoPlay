/**
 * 🔧 Service Worker — Play & Save (PWA)
 *
 * Stratégie de cache : Cache-First pour les fichiers statiques
 * (JS, CSS, images, polices). Les jeux React sont mis en cache
 * localement pour une jouabilité fluide même avec beaucoup de trafic.
 *
 * Les requêtes réseau (API, publicités) utilisent Network-First
 * pour toujours tenter de récupérer les données fraîches.
 */

const CACHE_NAME = 'play-and-save-v1';

// ── Fichiers statiques à pré-cacher lors de l'installation ──
const PRECACHE_URLS = [
    '/',
    '/games',
    '/manifest.json',
];

// ── Extensions de fichiers statiques à mettre en cache dynamiquement ──
const STATIC_EXTENSIONS = [
    '.js', '.css', '.woff', '.woff2', '.ttf',
    '.png', '.jpg', '.jpeg', '.svg', '.ico', '.webp',
];

/**
 * Installation — Pré-cache les fichiers critiques
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installation du Service Worker...');
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pré-cache des fichiers statiques');
                return cache.addAll(PRECACHE_URLS);
            })
            .then(() => self.skipWaiting()) // Activation immédiate
    );
});

/**
 * Activation — Nettoyage des anciens caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activation du Service Worker...');
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) =>
                Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Suppression ancien cache:', name);
                            return caches.delete(name);
                        })
                )
            )
            .then(() => self.clients.claim()) // Prend le contrôle immédiatement
    );
});

/**
 * Vérifie si l'URL correspond à un fichier statique
 */
function isStaticAsset(url) {
    return STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Vérifie si c'est une requête de navigation (page HTML)
 */
function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

/**
 * Interception des requêtes — Stratégie de cache intelligente
 *
 * - Fichiers statiques (JS, CSS, images) → Cache-First
 *   → Le jeu fonctionne depuis le cache pour une jouabilité fluide
 *
 * - Navigation (pages HTML) → Network-First avec fallback cache
 *   → Toujours la version à jour si possible
 *
 * - Autres requêtes (API, pubs) → Network-Only
 *   → Les pubs ne sont pas mises en cache
 */
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // ── Ignorer les requêtes non-HTTP (chrome-extension, etc.) ──
    if (!url.protocol.startsWith('http')) return;

    // ── Fichiers statiques → Cache-First ──
    if (isStaticAsset(url)) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Mettre à jour le cache en arrière-plan (stale-while-revalidate)
                    fetch(event.request)
                        .then((response) => {
                            if (response && response.status === 200) {
                                caches.open(CACHE_NAME).then((cache) => {
                                    cache.put(event.request, response);
                                });
                            }
                        })
                        .catch(() => { }); // Silencieux si offline

                    return cachedResponse;
                }

                // Pas dans le cache → chercher sur le réseau et mettre en cache
                return fetch(event.request).then((response) => {
                    if (response && response.status === 200) {
                        const responseToCache = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return response;
                });
            })
        );
        return;
    }

    // ── Navigation (pages HTML) → Network-First ──
    if (isNavigationRequest(event.request)) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Mettre en cache la page pour l'utilisation offline
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Offline → servir depuis le cache
                    return caches.match(event.request).then(
                        (cachedResponse) => cachedResponse || caches.match('/')
                    );
                })
        );
        return;
    }

    // ── Autres requêtes (API, pubs) → Network-Only ──
    // Les publicités ne sont pas mises en cache
});
