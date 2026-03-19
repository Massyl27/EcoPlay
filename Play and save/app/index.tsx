import { Redirect } from 'expo-router';

/**
 * 🏠 index.tsx — Redirige immédiatement vers la page des jeux.
 *
 * L'utilisateur atterrit directement sur le catalogue de jeux.
 */
export default function Index() {
    return <Redirect href="/games" />;
}
