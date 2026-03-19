import { Platform } from 'react-native';

/**
 * 📦 registerServiceWorker — Enregistrement du Service Worker
 *
 * Enregistre le Service Worker pour la mise en cache des fichiers
 * statiques (jeux React, CSS, images). Ne s'exécute que sur le Web.
 *
 * À appeler une seule fois au démarrage de l'application (dans _layout.tsx).
 */
export async function registerServiceWorker(): Promise<void> {
    // ── Uniquement sur le Web ──
    if (Platform.OS !== 'web') return;
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service Worker non supporté par ce navigateur');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        console.log('[PWA] ✅ Service Worker enregistré avec succès');
        console.log('[PWA] Scope:', registration.scope);

        // ── Gestion des mises à jour ──
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (
                    newWorker.state === 'activated' &&
                    navigator.serviceWorker.controller
                ) {
                    console.log('[PWA] 🔄 Nouvelle version disponible — rafraîchir la page');
                }
            });
        });
    } catch (error) {
        console.error('[PWA] ❌ Erreur lors de l\'enregistrement du SW:', error);
    }
}
