import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🔨 EcoWhack — Tape les déchets, protège les animaux !
// ══════════════════════════════════════════════════════════════
//
// • Grille 3×3 avec apparitions aléatoires
// • Déchets (🥤🛞🥫) = +10 points
// • Animaux (🐟🐦🐸) = -20 points
// • 30 secondes, Rewarded Ad → +15s
//

// ── OBJETS ───────────────────────────────────────────────────

interface WhackItem {
    id: string;
    emoji: string;
    label: string;
    type: 'trash' | 'animal';
    points: number;
    color: string;
}

const TRASH_ITEMS: WhackItem[] = [
    { id: 'bottle', emoji: '🥤', label: 'Bouteille', type: 'trash', points: 10, color: '#E74C3C' },
    { id: 'tire', emoji: '🛞', label: 'Pneu', type: 'trash', points: 10, color: '#E67E22' },
    { id: 'can', emoji: '🥫', label: 'Canette', type: 'trash', points: 10, color: '#D4A017' },
];

const ANIMAL_ITEMS: WhackItem[] = [
    { id: 'fish', emoji: '🐟', label: 'Poisson', type: 'animal', points: -20, color: '#3498DB' },
    { id: 'bird', emoji: '🐦', label: 'Oiseau', type: 'animal', points: -20, color: '#27AE60' },
    { id: 'frog', emoji: '🐸', label: 'Grenouille', type: 'animal', points: -20, color: '#2ECC71' },
];

const ALL_ITEMS = [...TRASH_ITEMS, ...ANIMAL_ITEMS];

const GRID_SIZE = 3;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const GAME_DURATION = 30;
const BONUS_TIME = 15;

// Fréquence de spawn (ms)
const SPAWN_MIN = 600;
const SPAWN_MAX = 1200;
// Durée d'affichage d'un objet (ms)
const SHOW_MIN = 800;
const SHOW_MAX = 1800;

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface EcoWhackProps {
    onGameEnd?: () => void;
}

interface CellState {
    item: WhackItem | null;
    feedback: 'hit' | 'miss' | 'oops' | null;
}

export function EcoWhack({ onGameEnd }: EcoWhackProps) {
    // ── État du jeu ──
    const [gameState, setGameState] = useState<'ready' | 'playing' | 'timeup'>('ready');
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
    const [cells, setCells] = useState<CellState[]>(
        Array(TOTAL_CELLS).fill(null).map(() => ({ item: null, feedback: null }))
    );
    const [trashHit, setTrashHit] = useState(0);
    const [animalHit, setAnimalHit] = useState(0);
    const [combo, setCombo] = useState(0);
    const [bestCombo, setBestCombo] = useState(0);

    // Rewarded Ad
    const [adLoading, setAdLoading] = useState(false);
    const [adUsed, setAdUsed] = useState(false);

    // Refs
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const spawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const timeLeftRef = useRef(timeLeft);

    useEffect(() => { timeLeftRef.current = timeLeft; }, [timeLeft]);

    // ── Cleanup ──
    const stopAll = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (spawnRef.current) { clearTimeout(spawnRef.current); spawnRef.current = null; }
    }, []);

    useEffect(() => () => stopAll(), [stopAll]);

    // ── Spawn loop ──
    const scheduleSpawn = useCallback(() => {
        const delay = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
        spawnRef.current = setTimeout(() => {
            if (timeLeftRef.current <= 0) return;

            setCells(prev => {
                const newCells = [...prev];
                // Trouver une case vide
                const emptyCells = newCells
                    .map((c, i) => ({ cell: c, idx: i }))
                    .filter(({ cell }) => cell.item === null && cell.feedback === null);

                if (emptyCells.length === 0) return newCells;

                const target = emptyCells[Math.floor(Math.random() * emptyCells.length)];

                // Choisir un objet (70% déchet, 30% animal)
                const isTrash = Math.random() < 0.7;
                const pool = isTrash ? TRASH_ITEMS : ANIMAL_ITEMS;
                const item = pool[Math.floor(Math.random() * pool.length)];

                newCells[target.idx] = { item, feedback: null };

                // Auto-disparition après SHOW_MIN–SHOW_MAX
                const showDuration = SHOW_MIN + Math.random() * (SHOW_MAX - SHOW_MIN);
                setTimeout(() => {
                    setCells(curr => {
                        const updated = [...curr];
                        // Seulement si l'item est toujours là
                        if (updated[target.idx].item?.id === item.id && updated[target.idx].feedback === null) {
                            // Déchet raté !
                            if (item.type === 'trash') {
                                updated[target.idx] = { item: null, feedback: 'miss' };
                                setTimeout(() => {
                                    setCells(c2 => {
                                        const u2 = [...c2];
                                        if (u2[target.idx].feedback === 'miss') {
                                            u2[target.idx] = { item: null, feedback: null };
                                        }
                                        return u2;
                                    });
                                }, 400);
                            } else {
                                updated[target.idx] = { item: null, feedback: null };
                            }
                        }
                        return updated;
                    });
                }, showDuration);

                return newCells;
            });

            scheduleSpawn();
        }, delay);
    }, []);

    // ── Démarrer le jeu ──
    const handleStart = useCallback(() => {
        stopAll();
        setScore(0);
        setTimeLeft(GAME_DURATION);
        timeLeftRef.current = GAME_DURATION;
        setTrashHit(0);
        setAnimalHit(0);
        setCombo(0);
        setBestCombo(0);
        setAdUsed(false);
        setCells(Array(TOTAL_CELLS).fill(null).map(() => ({ item: null, feedback: null })));
        setGameState('playing');

        // Timer
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                const next = prev - 1;
                timeLeftRef.current = next;
                if (next <= 0) {
                    stopAll();
                    setGameState('timeup');
                    return 0;
                }
                return next;
            });
        }, 1000);

        // Spawn
        scheduleSpawn();
    }, [stopAll, scheduleSpawn]);

    // ── Clic sur une case ──
    const handleCellPress = useCallback((cellIdx: number) => {
        if (gameState !== 'playing') return;

        setCells(prev => {
            const newCells = [...prev];
            const cell = newCells[cellIdx];
            if (!cell.item) return newCells;

            const item = cell.item;

            if (item.type === 'trash') {
                // ── Déchet tapé → +10 ──
                newCells[cellIdx] = { item: null, feedback: 'hit' };
                setScore(s => s + item.points);
                setTrashHit(t => t + 1);
                setCombo(c => {
                    const newC = c + 1;
                    setBestCombo(bc => Math.max(bc, newC));
                    return newC;
                });
            } else {
                // ── Animal tapé → -20 ──
                newCells[cellIdx] = { item: null, feedback: 'oops' };
                setScore(s => Math.max(0, s + item.points));
                setAnimalHit(a => a + 1);
                setCombo(0);
            }

            // Effacer le feedback après un court délai
            setTimeout(() => {
                setCells(c => {
                    const u = [...c];
                    if (u[cellIdx].feedback) {
                        u[cellIdx] = { item: null, feedback: null };
                    }
                    return u;
                });
            }, 350);

            return newCells;
        });
    }, [gameState]);

    // ── Rewarded Ad : +15 secondes ──
    const handleAdWatch = useCallback(() => {
        if (adLoading || adUsed) return;
        setAdLoading(true);

        setTimeout(() => {
            setAdLoading(false);
            setAdUsed(true);
            setTimeLeft(prev => {
                const next = prev + BONUS_TIME;
                timeLeftRef.current = next;
                return next;
            });
            setGameState('playing');

            // Redémarrer le timer
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    const next = prev - 1;
                    timeLeftRef.current = next;
                    if (next <= 0) {
                        stopAll();
                        setGameState('timeup');
                        return 0;
                    }
                    return next;
                });
            }, 1000);

            // Relancer les spawns
            scheduleSpawn();
        }, 2000);
    }, [adLoading, adUsed, stopAll, scheduleSpawn]);

    // Best score tracking
    useEffect(() => {
        if (gameState === 'timeup' && score > bestScore) {
            setBestScore(score);
        }
    }, [gameState, score, bestScore]);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    const timerPercent = (timeLeft / (adUsed ? GAME_DURATION + BONUS_TIME : GAME_DURATION)) * 100;

    return (
        <View style={st.container}>
            {/* ── En-tête ── */}
            <View style={st.header}>
                <Text style={st.title}>🔨 EcoWhack</Text>
                <Text style={st.subtitle}>Tapez les déchets, protégez les animaux !</Text>
            </View>

            {/* ── Stats ── */}
            <View style={st.statsRow}>
                <View style={[st.statPill, st.scorePill]}>
                    <Text style={[st.statText, st.scoreText]}>⭐ {score} pts</Text>
                </View>
                {gameState === 'playing' && (
                    <View style={[st.statPill, timeLeft <= 5 && st.dangerPill]}>
                        <Text style={[st.statText, timeLeft <= 5 && st.dangerText]}>
                            ⏱️ {timeLeft}s
                        </Text>
                    </View>
                )}
                {bestScore > 0 && (
                    <View style={st.statPill}>
                        <Text style={st.statText}>🏆 {bestScore}</Text>
                    </View>
                )}
                {combo >= 3 && gameState === 'playing' && (
                    <View style={[st.statPill, st.comboPill]}>
                        <Text style={[st.statText, st.comboText]}>🔥 ×{combo}</Text>
                    </View>
                )}
            </View>

            {/* ── Timer bar ── */}
            {gameState === 'playing' && (
                <View style={st.timerBarOuter}>
                    <View
                        style={[
                            st.timerBarInner,
                            { width: `${Math.max(0, timerPercent)}%` },
                            timeLeft <= 5 && st.timerBarDanger,
                        ]}
                    />
                </View>
            )}

            {/* ── Légende ── */}
            <View style={st.legendRow}>
                <View style={st.legendGroup}>
                    <Text style={st.legendLabel}>✅ Taper :</Text>
                    {TRASH_ITEMS.map(t => (
                        <Text key={t.id} style={st.legendEmoji}>{t.emoji}</Text>
                    ))}
                </View>
                <View style={st.legendGroup}>
                    <Text style={st.legendLabel}>❌ Éviter :</Text>
                    {ANIMAL_ITEMS.map(a => (
                        <Text key={a.id} style={st.legendEmoji}>{a.emoji}</Text>
                    ))}
                </View>
            </View>

            {/* ── Grille 3×3 ── */}
            <View style={st.grid}>
                {cells.map((cell, idx) => (
                    <Pressable
                        key={idx}
                        onPress={() => handleCellPress(idx)}
                        disabled={gameState !== 'playing' || (!cell.item && !cell.feedback)}
                        style={[
                            st.cell,
                            cell.feedback === 'hit' && st.cellHit,
                            cell.feedback === 'oops' && st.cellOops,
                            cell.feedback === 'miss' && st.cellMiss,
                            cell.item?.type === 'trash' && st.cellTrash,
                            cell.item?.type === 'animal' && st.cellAnimal,
                        ]}
                    >
                        {cell.item && (
                            <>
                                <Text style={st.cellEmoji}>{cell.item.emoji}</Text>
                                <Text style={[
                                    st.cellLabel,
                                    cell.item.type === 'animal' && st.cellLabelAnimal,
                                ]}>
                                    {cell.item.type === 'trash' ? '+10' : '⚠️'}
                                </Text>
                            </>
                        )}
                        {cell.feedback === 'hit' && (
                            <Text style={st.feedbackEmoji}>✅</Text>
                        )}
                        {cell.feedback === 'oops' && (
                            <Text style={st.feedbackEmoji}>💔</Text>
                        )}
                        {cell.feedback === 'miss' && (
                            <Text style={st.feedbackEmoji}>💨</Text>
                        )}
                    </Pressable>
                ))}
            </View>

            {/* ── Démarrer ── */}
            {gameState === 'ready' && (
                <Pressable onPress={handleStart} style={st.startBtn}>
                    <Text style={st.startBtnText}>▶️ Commencer (30s)</Text>
                </Pressable>
            )}

            {/* ── Rewarded Ad en jeu ── */}
            {gameState === 'playing' && !adUsed && (
                <Pressable
                    onPress={handleAdWatch}
                    disabled={adLoading}
                    style={[st.adBtn, adLoading && st.adBtnDisabled]}
                >
                    <Text style={st.adBtnText}>
                        {adLoading
                            ? '📺 Chargement…'
                            : '⏱️ +15 secondes (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Temps écoulé ── */}
            {gameState === 'timeup' && (
                <View style={st.gameOverOverlay}>
                    <Text style={st.gameOverEmoji}>⏰</Text>
                    <Text style={st.gameOverTitle}>Temps écoulé !</Text>
                    <Text style={st.gameOverSubtitle}>
                        Score : {score} pts • {trashHit} déchets nettoyés
                    </Text>
                    {animalHit > 0 && (
                        <Text style={st.penaltyText}>
                            ⚠️ {animalHit} animal{animalHit > 1 ? 'ux' : ''} touché{animalHit > 1 ? 's' : ''} (−{animalHit * 20} pts)
                        </Text>
                    )}
                    {bestCombo >= 3 && (
                        <Text style={st.comboResultText}>🔥 Meilleur combo : ×{bestCombo}</Text>
                    )}

                    {!adUsed && (
                        <Pressable
                            onPress={handleAdWatch}
                            disabled={adLoading}
                            style={[st.reviveBtn, adLoading && st.reviveBtnDisabled]}
                        >
                            <Text style={st.reviveBtnText}>
                                {adLoading
                                    ? '📺 Chargement…'
                                    : '⏱️ +15 secondes (Vidéo 30s)'}
                            </Text>
                        </Pressable>
                    )}

                    <Pressable onPress={handleStart} style={st.newGameBtn}>
                        <Text style={st.newGameText}>🔄 Nouvelle partie</Text>
                    </Pressable>
                </View>
            )}

            <Text style={st.ecoNote}>
                Chaque déchet tapé protège un écosystème marin 🌊
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const CELL_SIZE = 85;
const CELL_GAP = 8;

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
    dangerPill: { borderColor: '#E74C3C60', backgroundColor: '#E74C3C15' },
    dangerText: { color: '#E74C3C' },
    comboPill: { borderColor: '#E74C3C60', backgroundColor: '#E74C3C10' },
    comboText: { color: '#E74C3C' },
    statText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

    // ── Timer bar ──
    timerBarOuter: {
        width: '100%',
        maxWidth: CELL_SIZE * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1),
        height: 6,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    timerBarInner: {
        height: '100%',
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.full,
    },
    timerBarDanger: {
        backgroundColor: '#E74C3C',
    },

    // ── Legend ──
    legendRow: {
        flexDirection: 'row',
        gap: Spacing.md,
        justifyContent: 'center',
    },
    legendGroup: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    legendLabel: { fontSize: 9, fontWeight: '700', color: Colors.textMuted },
    legendEmoji: { fontSize: 14 },

    // ── Grid ──
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: CELL_GAP,
        width: CELL_SIZE * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1),
    },

    // ── Cell ──
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#0D1F3C',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#1A3A5C',
        gap: 2,
    },
    cellTrash: {
        backgroundColor: '#3D1508',
        borderColor: '#E74C3C40',
    },
    cellAnimal: {
        backgroundColor: '#08261A',
        borderColor: '#2ECC7140',
    },
    cellHit: {
        backgroundColor: Colors.ecoGreen + '30',
        borderColor: Colors.ecoGreen + '80',
    },
    cellOops: {
        backgroundColor: '#E74C3C30',
        borderColor: '#E74C3C80',
    },
    cellMiss: {
        backgroundColor: '#F1C40F15',
        borderColor: '#F1C40F40',
    },
    cellEmoji: { fontSize: 30 },
    cellLabel: {
        fontSize: 9,
        fontWeight: '900',
        color: Colors.solarGold,
    },
    cellLabelAnimal: {
        color: '#E74C3C',
    },
    feedbackEmoji: { fontSize: 24 },

    // ── Start ──
    startBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.xl + Spacing.md,
    },
    startBtnText: { fontSize: FontSizes.md, fontWeight: '900', color: '#FFFFFF' },

    // ── Ad ──
    adBtn: {
        backgroundColor: Colors.solarGold + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        maxWidth: CELL_SIZE * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1),
        alignItems: 'center',
    },
    adBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Game Over ──
    gameOverOverlay: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        width: '100%',
    },
    gameOverEmoji: { fontSize: 36 },
    gameOverTitle: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.textPrimary },
    gameOverSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    penaltyText: { fontSize: FontSizes.xs, color: '#E74C3C', fontWeight: '700' },
    comboResultText: { fontSize: FontSizes.xs, color: Colors.solarGold, fontWeight: '700' },
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
