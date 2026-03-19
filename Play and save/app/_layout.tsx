import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { Colors } from '../shared/theme';
import { registerServiceWorker } from '../shared/utils/registerServiceWorker';

/**
 * 🏗️ Root Layout — Play & Save
 *
 * - Enregistre le Service Worker (PWA) au démarrage sur le Web
 * - Configure le thème sombre et la navigation Stack
 * - Injecte le lien vers le manifest.json pour l'installabilité PWA
 */
export default function RootLayout() {
    // ── Enregistrement du Service Worker au montage ──
    useEffect(() => {
        registerServiceWorker();

        // ── Injection du manifest.json dans le <head> (Web uniquement) ──
        if (Platform.OS === 'web' && typeof document !== 'undefined') {
            // Manifest link
            if (!document.querySelector('link[rel="manifest"]')) {
                const manifestLink = document.createElement('link');
                manifestLink.rel = 'manifest';
                manifestLink.href = '/manifest.json';
                document.head.appendChild(manifestLink);
            }

            // Theme color meta tag
            if (!document.querySelector('meta[name="theme-color"]')) {
                const themeMeta = document.createElement('meta');
                themeMeta.name = 'theme-color';
                themeMeta.content = '#0D1117';
                document.head.appendChild(themeMeta);
            }

            // Apple-specific meta tags pour iOS PWA
            if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
                const appleMeta = document.createElement('meta');
                appleMeta.name = 'apple-mobile-web-app-capable';
                appleMeta.content = 'yes';
                document.head.appendChild(appleMeta);

                const appleStatusBar = document.createElement('meta');
                appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
                appleStatusBar.content = 'black-translucent';
                document.head.appendChild(appleStatusBar);
            }
        }
    }, []);

    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: {
                        backgroundColor: Colors.background,
                    },
                    headerTintColor: Colors.textPrimary,
                    headerTitleStyle: {
                        fontWeight: '700',
                    },
                    contentStyle: {
                        backgroundColor: Colors.background,
                    },
                    headerShadowVisible: false,
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        title: 'Play & Save 🌍',
                        headerTitleStyle: {
                            fontWeight: '800',
                            fontSize: 20,
                        },
                    }}
                />
                <Stack.Screen
                    name="games"
                    options={{
                        title: 'Play & Save 🌍',
                        headerBackVisible: false,
                        headerTitleStyle: {
                            fontWeight: '800',
                            fontSize: 20,
                        },
                    }}
                />
                <Stack.Screen
                    name="game/[id]"
                    options={{
                        title: 'En jeu',
                    }}
                />
            </Stack>
        </>
    );
}
