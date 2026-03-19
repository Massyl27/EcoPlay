import { useState, useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * 🌐 useNetworkStatus — Hook de détection Online/Offline
 *
 * Détecte si l'utilisateur est connecté à Internet.
 * Utilisé pour afficher/masquer les publicités :
 *   - Online → publicités visibles (génération de revenus)
 *   - Offline → pubs masquées, jeu fonctionnel depuis le cache
 *
 * ⚠️ Ce hook ne fonctionne que sur le Web.
 *     Sur mobile natif, utiliser @react-native-community/netinfo
 */
export function useNetworkStatus(): { isOnline: boolean } {
    // Par défaut on considère l'utilisateur en ligne
    const [isOnline, setIsOnline] = useState<boolean>(true);

    useEffect(() => {
        // ── Détection uniquement sur le Web ──
        if (Platform.OS !== 'web' || typeof window === 'undefined') {
            return;
        }

        // État initial depuis navigator.onLine
        setIsOnline(navigator.onLine);

        // ── Écouteurs d'événements ──
        const handleOnline = () => {
            console.log('[Network] ✅ Connexion rétablie');
            setIsOnline(true);
        };

        const handleOffline = () => {
            console.log('[Network] ❌ Connexion perdue — mode hors-ligne');
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // ── Nettoyage ──
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { isOnline };
}
