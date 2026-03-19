import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🌬️ WindTower — Tower Stacker (éolienne)
// ══════════════════════════════════════════════════════════════
//
// • Un bloc fait des allers-retours horizontaux
// • Le joueur clique pour le lâcher
// • La partie qui dépasse est coupée → bloc suivant plus petit
// • requestAnimationFrame pour mouvement fluide
// • Rewarded Ad : annule la dernière chute ratée
//

// ── CONFIG ───────────────────────────────────────────────────

const GAME_WIDTH = 300;
const GAME_HEIGHT = 400;
const BLOCK_HEIGHT = 20;
const INITIAL_BLOCK_WIDTH = 120;
const BASE_SPEED = 2.5;
const SPEED_INCREMENT = 0.15;
const MAX_VISIBLE_BLOCKS = 18; // Nombre max de blocs visibles dans la tour

// ── COULEURS DES NIVEAUX ─────────────────────────────────────

const LEVEL_COLORS = [
    '#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#4CAF50',
    '#00695C', '#00897B', '#009688', '#00ACC1', '#0097A7',
    '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5',
    '#5D4037', '#6D4C41', '#795548', '#8D6E63',
    '#E65100', '#EF6C00', '#F57F17', '#F9A825', '#FDD835',
];

function getBlockColor(level: number): string {
    return LEVEL_COLORS[level % LEVEL_COLORS.length];
}

// ── TYPES ────────────────────────────────────────────────────

interface PlacedBlock {
    x: number;
    width: number;
    color: string;
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface WindTowerProps {
    onGameEnd?: () => void;
}

export function WindTower({ onGameEnd }: WindTowerProps) {
    // ── État du jeu ──
    const [gameState, setGameState] = useState<'ready' | 'playing' | 'gameover'>('ready');
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [perfectCount, setPerfectCount] = useState(0);
    const [totalPerfects, setTotalPerfects] = useState(0);
    const [lastFeedback, setLastFeedback] = useState<string | null>(null);

    // Tour empilée
    const [tower, setTower] = useState<PlacedBlock[]>([]);

    // Bloc en mouvement
    const [movingBlock, setMovingBlock] = useState({
        x: 0,
        width: INITIAL_BLOCK_WIDTH,
        direction: 1, // 1 = droite, -1 = gauche
    });

    // Rewarded Ad
    const [adLoading, setAdLoading] = useState(false);
    const [canRevive, setCanRevive] = useState(true);
    const [savedBlock, setSavedBlock] = useState<{ x: number; width: number } | null>(null);

    // Animation
    const animRef = useRef<number | null>(null);
    const blockRef = useRef(movingBlock);
    const speedRef = useRef(BASE_SPEED);

    // Sync ref
    useEffect(() => {
        blockRef.current = movingBlock;
    }, [movingBlock]);

    // ── Animation loop ──
    const animate = useCallback(() => {
        const block = blockRef.current;
        let newX = block.x + block.direction * speedRef.current;

        // Rebondir aux bords
        if (newX + block.width > GAME_WIDTH) {
            newX = GAME_WIDTH - block.width;
            blockRef.current = { ...block, x: newX, direction: -1 };
        } else if (newX < 0) {
            newX = 0;
            blockRef.current = { ...block, x: newX, direction: 1 };
        } else {
            blockRef.current = { ...block, x: newX };
        }

        setMovingBlock({ ...blockRef.current });
        animRef.current = requestAnimationFrame(animate);
    }, []);

    // Démarrer / arrêter l'animation
    const startAnimation = useCallback(() => {
        if (animRef.current) cancelAnimationFrame(animRef.current);
        animRef.current = requestAnimationFrame(animate);
    }, [animate]);

    const stopAnimation = useCallback(() => {
        if (animRef.current) {
            cancelAnimationFrame(animRef.current);
            animRef.current = null;
        }
    }, []);

    // Cleanup
    useEffect(() => {
        return () => stopAnimation();
    }, [stopAnimation]);

    // ── Démarrer le jeu ──
    const handleStart = useCallback(() => {
        // Poser le bloc de base
        const baseBlock: PlacedBlock = {
            x: (GAME_WIDTH - INITIAL_BLOCK_WIDTH) / 2,
            width: INITIAL_BLOCK_WIDTH,
            color: getBlockColor(0),
        };

        setTower([baseBlock]);
        setScore(0);
        setPerfectCount(0);
        setTotalPerfects(0);
        setCanRevive(true);
        setSavedBlock(null);
        setLastFeedback(null);

        // Préparer le premier bloc en mouvement
        speedRef.current = BASE_SPEED;
        blockRef.current = {
            x: 0,
            width: INITIAL_BLOCK_WIDTH,
            direction: 1,
        };
        setMovingBlock(blockRef.current);
        setGameState('playing');
        startAnimation();
    }, [startAnimation]);

    // ── Lâcher le bloc ──
    const handleDrop = useCallback(() => {
        if (gameState !== 'playing') return;
        stopAnimation();

        const current = blockRef.current;
        const topBlock = tower[tower.length - 1];

        // Calculer le chevauchement
        const overlapStart = Math.max(current.x, topBlock.x);
        const overlapEnd = Math.min(current.x + current.width, topBlock.x + topBlock.width);
        const overlapWidth = overlapEnd - overlapStart;

        if (overlapWidth <= 0) {
            // ── Raté complètement → Game Over ──
            setSavedBlock({ x: current.x, width: current.width });
            setGameState('gameover');
            if (score > bestScore) setBestScore(score);
            onGameEnd?.();
            return;
        }

        // Vérifier "perfect" (tolérance de 3px)
        const isPerfect = Math.abs(current.x - topBlock.x) <= 3 &&
            Math.abs(current.width - topBlock.width) <= 3;

        let newWidth: number;
        let newX: number;

        if (isPerfect) {
            // Perfect → garder les mêmes dimensions
            newWidth = topBlock.width;
            newX = topBlock.x;
            setPerfectCount(p => p + 1);
            setTotalPerfects(t => t + 1);
            setLastFeedback('🎯 Parfait !');
        } else {
            newWidth = overlapWidth;
            newX = overlapStart;
            setPerfectCount(0);

            if (overlapWidth < current.width * 0.3) {
                setLastFeedback('😬 De justesse !');
            } else {
                setLastFeedback(null);
            }
        }

        // Placer le bloc
        const newScore = score + 1;
        const newBlock: PlacedBlock = {
            x: newX,
            width: newWidth,
            color: getBlockColor(newScore),
        };

        const newTower = [...tower, newBlock];
        setTower(newTower);
        setScore(newScore);

        // Effacer le feedback
        setTimeout(() => setLastFeedback(null), 1000);

        // Préparer le prochain bloc
        speedRef.current = BASE_SPEED + newScore * SPEED_INCREMENT;
        const dir = Math.random() > 0.5 ? 1 : -1;
        blockRef.current = {
            x: dir === 1 ? 0 : GAME_WIDTH - newWidth,
            width: newWidth,
            direction: dir,
        };
        setMovingBlock(blockRef.current);

        // Redémarrer l'animation
        startAnimation();
    }, [gameState, tower, score, bestScore, stopAnimation, startAnimation, onGameEnd]);

    // ── Rewarded Ad : seconde chance ──
    const handleAdWatch = useCallback(() => {
        if (adLoading || !canRevive || !savedBlock) return;
        setAdLoading(true);

        setTimeout(() => {
            setAdLoading(false);
            setCanRevive(false);

            // Restaurer le bloc en mouvement avec la largeur du dernier bloc posé
            const topBlock = tower[tower.length - 1];
            blockRef.current = {
                x: 0,
                width: topBlock.width,
                direction: 1,
            };
            setMovingBlock(blockRef.current);
            setGameState('playing');
            startAnimation();
        }, 2000);
    }, [adLoading, canRevive, savedBlock, tower, startAnimation]);

    // ── Calcul de la vue de la tour ──
    const visibleTower = tower.slice(-MAX_VISIBLE_BLOCKS);
    const towerBaseY = GAME_HEIGHT - 30; // Marge en bas
    const movingBlockY = towerBaseY - visibleTower.length * BLOCK_HEIGHT;

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── En-tête ── */}
            <View style={st.header}>
                <Text style={st.title}>🌬️ WindTower</Text>
                <Text style={st.subtitle}>Empilez les sections d'éolienne !</Text>
            </View>

            {/* ── Stats ── */}
            <View style={st.statsRow}>
                <View style={[st.statPill, st.scorePill]}>
                    <Text style={[st.statText, st.scoreText]}>🏗️ {score}</Text>
                </View>
                {bestScore > 0 && (
                    <View style={st.statPill}>
                        <Text style={st.statText}>🏆 Record : {bestScore}</Text>
                    </View>
                )}
                {totalPerfects > 0 && (
                    <View style={st.statPill}>
                        <Text style={st.statText}>🎯 {totalPerfects} parfaits</Text>
                    </View>
                )}
            </View>

            {/* ── Perfect streak ── */}
            {perfectCount >= 2 && (
                <View style={st.streakBar}>
                    <Text style={st.streakText}>🔥 Série parfaite ×{perfectCount} !</Text>
                </View>
            )}

            {/* ── Zone de jeu ── */}
            <Pressable
                onPress={gameState === 'playing' ? handleDrop : gameState === 'ready' ? handleStart : undefined}
                style={st.gameArea}
            >
                {/* Fond — ciel gradient simulé */}
                <View style={st.sky}>
                    <View style={st.skyTop} />
                    <View style={st.skyBottom} />
                </View>

                {/* Feedback */}
                {lastFeedback && gameState === 'playing' && (
                    <View style={st.feedbackBanner}>
                        <Text style={st.feedbackText}>{lastFeedback}</Text>
                    </View>
                )}

                {/* Tour empilée */}
                {visibleTower.map((block, i) => (
                    <View
                        key={i}
                        style={[
                            st.block,
                            {
                                left: block.x,
                                bottom: 30 + i * BLOCK_HEIGHT,
                                width: block.width,
                                height: BLOCK_HEIGHT,
                                backgroundColor: block.color,
                                borderColor: block.color + '80',
                            },
                        ]}
                    >
                        {/* Ligne de détail sur le bloc */}
                        <View style={[st.blockDetail, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
                    </View>
                ))}

                {/* Bloc en mouvement (au-dessus de la tour) */}
                {gameState === 'playing' && (
                    <View
                        style={[
                            st.block,
                            st.movingBlock,
                            {
                                left: movingBlock.x,
                                bottom: 30 + visibleTower.length * BLOCK_HEIGHT,
                                width: movingBlock.width,
                                height: BLOCK_HEIGHT,
                                backgroundColor: getBlockColor(score + 1),
                                borderColor: getBlockColor(score + 1) + '80',
                            },
                        ]}
                    >
                        <View style={[st.blockDetail, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
                    </View>
                )}

                {/* Sol */}
                <View style={st.ground}>
                    <Text style={st.groundEmoji}>🌿🌿🌿🌿🌿🌿🌿🌿🌿🌿</Text>
                </View>

                {/* Message de démarrage */}
                {gameState === 'ready' && (
                    <View style={st.startOverlay}>
                        <Text style={st.startEmoji}>🌬️</Text>
                        <Text style={st.startTitle}>WindTower</Text>
                        <Text style={st.startSubtitle}>Touchez pour commencer</Text>
                    </View>
                )}

                {/* Indicateur de tap */}
                {gameState === 'playing' && (
                    <View style={st.tapHint}>
                        <Text style={st.tapHintText}>👆 TAP</Text>
                    </View>
                )}
            </Pressable>

            {/* ── Rewarded Ad — seconde chance ── */}
            {gameState === 'playing' && (
                <Pressable
                    onPress={handleAdWatch}
                    disabled={adLoading}
                    style={[st.adBtn, adLoading && st.adBtnDisabled]}
                >
                    <Text style={st.adBtnText}>
                        {adLoading
                            ? '📺 Chargement…'
                            : '🛡️ Filet de sécurité (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Game Over ── */}
            {gameState === 'gameover' && (
                <View style={st.gameOverOverlay}>
                    <Text style={st.gameOverEmoji}>💨</Text>
                    <Text style={st.gameOverTitle}>Tour effondrée !</Text>
                    <Text style={st.gameOverSubtitle}>
                        Hauteur : {score} étages
                        {totalPerfects > 0 ? ` • ${totalPerfects} parfaits` : ''}
                    </Text>

                    {canRevive && (
                        <Pressable
                            onPress={handleAdWatch}
                            disabled={adLoading}
                            style={[st.reviveBtn, adLoading && st.reviveBtnDisabled]}
                        >
                            <Text style={st.reviveBtnText}>
                                {adLoading
                                    ? '📺 Chargement de la pub…'
                                    : '🌬️ Seconde chance (Vidéo 30s)'}
                            </Text>
                        </Pressable>
                    )}

                    <Pressable onPress={handleStart} style={st.newGameBtn}>
                        <Text style={st.newGameText}>🔄 Nouvelle partie</Text>
                    </Pressable>
                </View>
            )}

            <Text style={st.ecoNote}>
                Chaque étage construit contribue à l'énergie éolienne 🌍
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const st = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.sm,
        width: '100%',
    },

    // ── Header ──
    header: { alignItems: 'center', gap: 2 },
    title: { fontSize: FontSizes.md + 2, fontWeight: '900', color: Colors.textPrimary },
    subtitle: { fontSize: FontSizes.xs, color: Colors.textSecondary, fontStyle: 'italic' },

    // ── Stats ──
    statsRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
    statPill: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        paddingVertical: 3,
        paddingHorizontal: Spacing.sm + 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    scorePill: { borderColor: Colors.solarGold + '60', backgroundColor: Colors.solarGold + '10' },
    scoreText: { color: Colors.solarGold },
    statText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

    // ── Streak ──
    streakBar: {
        backgroundColor: '#E74C3C20',
        borderRadius: BorderRadius.md,
        paddingVertical: 4,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: '#E74C3C50',
    },
    streakText: { fontSize: FontSizes.xs, fontWeight: '800', color: '#E74C3C' },

    // ── Game Area ──
    gameArea: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 1,
        borderColor: Colors.border,
    },

    // Sky
    sky: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    skyTop: {
        flex: 1,
        backgroundColor: '#0A1628',
    },
    skyBottom: {
        flex: 1,
        backgroundColor: '#0D1F3C',
    },

    // Ground
    ground: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 30,
        backgroundColor: '#1B3A1B',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopWidth: 2,
        borderTopColor: '#2E7D32',
    },
    groundEmoji: { fontSize: 14, letterSpacing: -2 },

    // Block
    block: {
        position: 'absolute',
        borderRadius: 3,
        borderWidth: 1,
        overflow: 'hidden',
    },
    movingBlock: {
        shadowColor: Colors.solarGold,
        shadowOpacity: 0.4,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
    },
    blockDetail: {
        position: 'absolute',
        top: 2,
        left: '10%',
        right: '10%',
        height: 3,
        borderRadius: 1,
    },

    // Feedback
    feedbackBanner: {
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        zIndex: 20,
        alignItems: 'center',
    },
    feedbackText: {
        fontSize: FontSizes.md,
        fontWeight: '900',
        color: Colors.solarGold,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowRadius: 4,
        textShadowOffset: { width: 0, height: 1 },
    },

    // Start overlay
    startOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(10, 22, 40, 0.85)',
        zIndex: 30,
    },
    startEmoji: { fontSize: 48, marginBottom: Spacing.sm },
    startTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.textPrimary },
    startSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, marginTop: Spacing.xs },

    // Tap hint
    tapHint: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 10,
    },
    tapHintText: {
        fontSize: FontSizes.xs,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.3)',
    },

    // ── Ad ──
    adBtn: {
        backgroundColor: Colors.solarGold + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        maxWidth: GAME_WIDTH,
        alignItems: 'center',
    },
    adBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Game Over ──
    gameOverOverlay: {
        backgroundColor: '#0D1F3C',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: '#1A3A5C',
        width: '100%',
        maxWidth: GAME_WIDTH,
    },
    gameOverEmoji: { fontSize: 36 },
    gameOverTitle: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.textPrimary },
    gameOverSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    reviveBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    reviveBtnDisabled: { opacity: 0.5 },
    reviveBtnText: { fontSize: FontSizes.sm, fontWeight: '800', color: '#FFFFFF' },
    newGameBtn: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    newGameText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.textSecondary },

    ecoNote: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
