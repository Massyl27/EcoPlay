import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../../shared/theme';
import { AdBanner } from '../../shared/components/AdBanner';
import { RewardedAdButton } from '../../shared/components/RewardedAdButton';
import { useNetworkStatus } from '../../shared/hooks/useNetworkStatus';

// ── Import des jeux fonctionnels ──
import { SudokuGame } from '../../shared/games/SudokuGame';
import { Game2048 } from '../../shared/games/Game2048';
import { MinesweeperGame } from '../../shared/games/MinesweeperGame';
import { EcoWordle } from '../../shared/games/EcoWordle';

import { Picross } from '../../shared/games/Picross';
import { Chess } from '../../shared/games/Chess';
import { BlockPuzzle } from '../../shared/games/BlockPuzzle';
import { Snake } from '../../shared/games/Snake';
import { EcoFlappy } from '../../shared/games/EcoFlappy';
import { SolarFarm } from '../../shared/games/SolarFarm';
import { EcoSort } from '../../shared/games/EcoSort';
import { EcoMemory } from '../../shared/games/EcoMemory';

import { OceanMatch } from '../../shared/games/OceanMatch';
import { WindTower } from '../../shared/games/WindTower';

import { SimonEnergy } from '../../shared/games/SimonEnergy';
import { EcoWhack } from '../../shared/games/EcoWhack';
import { NatureMahjong } from '../../shared/games/NatureMahjong';

const GAME_INFO: Record<string, { name: string; icon: string; color: string }> = {
    sudoku: { name: 'Sudoku', icon: '🔢', color: '#3B82F6' },
    '2048': { name: '2048', icon: '🎯', color: '#F5A623' },
    minesweeper: { name: 'Démineur', icon: '💣', color: '#2ECC71' },
    ecowordle: { name: 'Eco-Wordle', icon: '🌿', color: '#27AE60' },

    picross: { name: 'Picross', icon: '🧩', color: '#E67E22' },
    chess: { name: 'Échecs', icon: '♟️', color: '#95A5A6' },
    blockpuzzle: { name: 'Block Puzzle', icon: '🧱', color: '#E74C3C' },
    snake: { name: 'Snake', icon: '🐍', color: '#1ABC9C' },
    ecoflappy: { name: 'Eco-Flappy', icon: '🐝', color: '#F1C40F' },
    solarfarm: { name: 'Solar Farm', icon: '☀️', color: '#F5A623' },
    ecosort: { name: 'Eco-Sort', icon: '♻️', color: '#2ECC71' },
    ecomemory: { name: 'Eco-Memory', icon: '🐼', color: '#9B59B6' },

    oceanmatch: { name: 'OceanMatch', icon: '🌊', color: '#0D47A1' },
    windtower: { name: 'WindTower', icon: '🌬️', color: '#0097A7' },

    simonenergy: { name: 'SimonEnergy', icon: '⚡', color: '#FF8F00' },
    ecowhack: { name: 'EcoWhack', icon: '🔨', color: '#D32F2F' },
    naturemahjong: { name: 'NatureMahjong', icon: '🀄', color: '#00695C' },
};

/**
 * 🎮 Game Screen — Écran de jeu générique
 *
 * Rend le jeu fonctionnel correspondant au paramètre [id].
 * Utilise useNetworkStatus pour masquer les pubs en mode offline.
 */
export default function GameScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const game = GAME_INFO[id ?? ''] ?? {
        name: 'Jeu',
        icon: '🎮',
        color: Colors.solarGold,
    };
    const [impactMultiplier, setImpactMultiplier] = useState(1);
    const { isOnline } = useNetworkStatus();

    const handleReward = () => {
        setImpactMultiplier(2);
    };

    const handleGameEnd = () => {
        // Callback quand le jeu est terminé (victoire)
    };

    /** Rend le composant du jeu actif */
    const renderGame = () => {
        switch (id) {
            case 'sudoku':
                return <SudokuGame onGameEnd={handleGameEnd} />;
            case '2048':
                return <Game2048 onGameEnd={handleGameEnd} />;
            case 'minesweeper':
                return <MinesweeperGame onGameEnd={handleGameEnd} />;
            case 'ecowordle':
                return <EcoWordle onGameEnd={handleGameEnd} />;

            case 'picross':
                return <Picross onGameEnd={handleGameEnd} />;
            case 'chess':
                return <Chess onGameEnd={handleGameEnd} />;
            case 'blockpuzzle':
                return <BlockPuzzle onGameEnd={handleGameEnd} />;
            case 'snake':
                return <Snake onGameEnd={handleGameEnd} />;
            case 'ecoflappy':
                return <EcoFlappy onGameEnd={handleGameEnd} />;
            case 'solarfarm':
                return <SolarFarm onGameEnd={handleGameEnd} />;
            case 'ecosort':
                return <EcoSort onGameEnd={handleGameEnd} />;
            case 'ecomemory':
                return <EcoMemory onGameEnd={handleGameEnd} />;

            case 'oceanmatch':
                return <OceanMatch onGameEnd={handleGameEnd} />;
            case 'windtower':
                return <WindTower onGameEnd={handleGameEnd} />;

            case 'simonenergy':
                return <SimonEnergy onGameEnd={handleGameEnd} />;
            case 'ecowhack':
                return <EcoWhack onGameEnd={handleGameEnd} />;
            case 'naturemahjong':
                return <NatureMahjong onGameEnd={handleGameEnd} />;
            default:
                return (
                    <View style={styles.fallback}>
                        <Text style={styles.fallbackIcon}>🎮</Text>
                        <Text style={styles.fallbackText}>Jeu non trouvé</Text>
                    </View>
                );
        }

    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: `${game.icon} ${game.name}`,
                    headerTitleStyle: {
                        fontWeight: '800',
                    },
                }}
            />
            <View style={styles.container}>
                <ScrollView
                    style={styles.scrollArea}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Indicateur offline ── */}
                    {!isOnline && (
                        <View style={styles.offlineBanner}>
                            <Text style={styles.offlineIcon}>📡</Text>
                            <View style={styles.offlineTextContainer}>
                                <Text style={styles.offlineTitle}>Mode hors-ligne</Text>
                                <Text style={styles.offlineSubtitle}>
                                    Le jeu fonctionne depuis le cache. Les pubs seront rétablies à la reconnexion.
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* ── Impact multiplier indicator ── */}
                    {impactMultiplier > 1 && (
                        <View style={styles.multiplierBanner}>
                            <Text style={styles.multiplierIcon}>✨</Text>
                            <Text style={styles.multiplierText}>
                                Impact ×{impactMultiplier} activé !
                            </Text>
                        </View>
                    )}

                    {/* ── Rewarded Ad — Online seulement (en haut pour visibilité) ── */}
                    {isOnline && (
                        <RewardedAdButton onRewardEarned={handleReward} />
                    )}

                    {/* ══ JEU FONCTIONNEL ══ */}
                    <View style={[styles.gameContainer, { borderColor: game.color + '40' }]}>
                        {renderGame()}
                    </View>

                    {/* ── Stats ── */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={[styles.statValue, { color: Colors.ecoGreen }]}>
                                ×{impactMultiplier}
                            </Text>
                            <Text style={styles.statLabel}>Impact</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>
                                {isOnline ? '🟢' : '🔴'}
                            </Text>
                            <Text style={styles.statLabel}>
                                {isOnline ? 'En ligne' : 'Hors-ligne'}
                            </Text>
                        </View>
                    </View>
                </ScrollView>

                {/* ── Ad Banner — Online seulement ── */}
                {isOnline && (
                    <View style={styles.adContainer}>
                        <AdBanner />
                    </View>
                )}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollArea: {
        flex: 1,
    },
    content: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
        maxWidth: 600,
        width: '100%',
        alignSelf: 'center',
        gap: Spacing.lg,
    },
    // ── Offline banner ──
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.solarGold + '15',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.solarGold + '30',
    },
    offlineIcon: { fontSize: 24 },
    offlineTextContainer: { flex: 1 },
    offlineTitle: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.solarGold,
        marginBottom: 2,
    },
    offlineSubtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    // ── Multiplier ──
    multiplierBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.full,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '40',
    },
    multiplierIcon: { fontSize: 16 },
    multiplierText: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.ecoGreen,
    },
    // ── Game container ──
    gameContainer: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        ...Shadows.card,
    },
    // ── Fallback ──
    fallback: {
        padding: Spacing.xxl,
        alignItems: 'center',
    },
    fallbackIcon: { fontSize: 48, marginBottom: Spacing.md },
    fallbackText: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
    },
    // ── Stats ──
    statsRow: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'space-around',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statItem: { alignItems: 'center', flex: 1 },
    statValue: {
        fontSize: FontSizes.lg,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    statLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: Colors.border,
    },
    // ── Ad ──
    adContainer: {
        padding: Spacing.md,
        paddingBottom: Spacing.lg,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
        backgroundColor: Colors.background,
    },
});
