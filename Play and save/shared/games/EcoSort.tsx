import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// ♻️ EcoSort — Water Sort Puzzle écologique (tri sélectif)
// ══════════════════════════════════════════════════════════════
//
// • 4 poubelles (3 remplies mélangées + 1 vide)
// • Verre 🟢, Plastique 🟡, Papier 🔵
// • Clic pour sélectionner l'élément du haut, clic sur une
//   autre poubelle pour le déplacer (même type ou vide)
// • Victoire quand chaque type est dans sa propre poubelle
// • Rewarded Ad : ajoute une 5ème poubelle vide
// • Niveaux progressifs avec difficulté croissante
//

// ── TYPES ────────────────────────────────────────────────────

type WasteType = 'glass' | 'plastic' | 'paper';

interface WasteItem {
    type: WasteType;
}

// ── CONFIG DÉCHETS ───────────────────────────────────────────

const WASTE_CONFIG: Record<WasteType, { icon: string; label: string; color: string; bgColor: string }> = {
    glass: { icon: '🍾', label: 'Verre', color: '#2ECC71', bgColor: '#2ECC7130' },
    plastic: { icon: '🧴', label: 'Plastique', color: '#F1C40F', bgColor: '#F1C40F30' },
    paper: { icon: '📄', label: 'Papier', color: '#3498DB', bgColor: '#3498DB30' },
};

const BIN_CAPACITY = 4; // Chaque poubelle peut contenir 4 éléments

// ── GÉNÉRATEUR DE NIVEAUX ────────────────────────────────────

function generateLevel(level: number): WasteItem[][] {
    // Chaque type remplit une colonne entière (4 éléments)
    const types: WasteType[] = ['glass', 'plastic', 'paper'];
    const allItems: WasteItem[] = [];

    for (const type of types) {
        for (let i = 0; i < BIN_CAPACITY; i++) {
            allItems.push({ type });
        }
    }

    // ── Mélange Fisher-Yates avec seed basée sur le niveau ──
    const seed = level * 7919 + 42;
    let rng = seed;
    const nextRng = () => {
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        return (rng >> 16) / 32768;
    };

    for (let i = allItems.length - 1; i > 0; i--) {
        const j = Math.floor(nextRng() * (i + 1));
        [allItems[i], allItems[j]] = [allItems[j], allItems[i]];
    }

    // Répartir dans 3 poubelles pleines + 1 vide
    const bins: WasteItem[][] = [];
    for (let b = 0; b < 3; b++) {
        bins.push(allItems.slice(b * BIN_CAPACITY, (b + 1) * BIN_CAPACITY));
    }
    bins.push([]); // Poubelle vide

    // Pour niveaux > 3, ajouter un mélange supplémentaire entre poubelles
    if (level > 3) {
        for (let swap = 0; swap < Math.min(level, 8); swap++) {
            const from = Math.floor(nextRng() * 3);
            const to = Math.floor(nextRng() * 3);
            if (from !== to && bins[from].length > 0 && bins[to].length < BIN_CAPACITY) {
                const item = bins[from].pop()!;
                bins[to].push(item);
            }
        }
    }

    return bins;
}

// ── VÉRIFICATION VICTOIRE ────────────────────────────────────

function checkWin(bins: WasteItem[][]): boolean {
    for (const bin of bins) {
        if (bin.length === 0) continue;
        if (bin.length !== BIN_CAPACITY) return false;
        const type = bin[0].type;
        if (!bin.every(item => item.type === type)) return false;
    }
    return true;
}

// ── VÉRIFICATION SI BLOQUÉ ───────────────────────────────────

function isStuck(bins: WasteItem[][]): boolean {
    for (let i = 0; i < bins.length; i++) {
        if (bins[i].length === 0) continue;
        const topItem = bins[i][bins[i].length - 1];
        for (let j = 0; j < bins.length; j++) {
            if (i === j) continue;
            if (bins[j].length === 0) return false; // Can move to empty
            if (bins[j].length < BIN_CAPACITY && bins[j][bins[j].length - 1].type === topItem.type) return false;
        }
    }
    return true;
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface EcoSortProps {
    onGameEnd?: () => void;
}

export function EcoSort({ onGameEnd }: EcoSortProps) {
    const [level, setLevel] = useState(1);
    const [bins, setBins] = useState<WasteItem[][]>(() => generateLevel(1));
    const [selectedBin, setSelectedBin] = useState<number | null>(null);
    const [moves, setMoves] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'won'>('playing');
    const [extraBinAdded, setExtraBinAdded] = useState(false);
    const [adLoading, setAdLoading] = useState(false);
    const [lastMovedTo, setLastMovedTo] = useState<number | null>(null);
    const [showStuckHint, setShowStuckHint] = useState(false);
    const [moveHistory, setMoveHistory] = useState<{ from: number; to: number }[]>([]);

    // Stuck detection
    const stuck = useMemo(() => {
        if (gameState !== 'playing') return false;
        return isStuck(bins);
    }, [bins, gameState]);

    // Show stuck hint after a delay
    React.useEffect(() => {
        if (stuck && !extraBinAdded) {
            const t = setTimeout(() => setShowStuckHint(true), 1500);
            return () => clearTimeout(t);
        } else {
            setShowStuckHint(false);
        }
    }, [stuck, extraBinAdded]);

    // ── Clic sur une poubelle ──
    const handleBinPress = useCallback((binIndex: number) => {
        if (gameState !== 'playing') return;

        // Rien sélectionné → sélectionner cette poubelle si elle contient des éléments
        if (selectedBin === null) {
            if (bins[binIndex].length > 0) {
                setSelectedBin(binIndex);
            }
            return;
        }

        // Même poubelle → désélection
        if (selectedBin === binIndex) {
            setSelectedBin(null);
            return;
        }

        // Tenter le déplacement
        const sourceBin = bins[selectedBin];
        const targetBin = bins[binIndex];
        const topItem = sourceBin[sourceBin.length - 1];

        // Vérifier les règles
        const canMove =
            targetBin.length === 0 || // Poubelle vide
            (targetBin.length < BIN_CAPACITY && targetBin[targetBin.length - 1].type === topItem.type);

        if (!canMove) {
            // Mouvement invalide — feedback visuel (flash la cible)
            setSelectedBin(null);
            return;
        }

        // ── Effectuer le déplacement ──
        const newBins = bins.map(b => [...b]);
        const item = newBins[selectedBin].pop()!;
        newBins[binIndex].push(item);

        setBins(newBins);
        setMoves(m => m + 1);
        setSelectedBin(null);
        setLastMovedTo(binIndex);
        setMoveHistory(prev => [...prev, { from: selectedBin, to: binIndex }]);

        // Clear feedback
        setTimeout(() => setLastMovedTo(null), 300);

        // Vérifier victoire
        if (checkWin(newBins)) {
            setGameState('won');
            onGameEnd?.();
        }
    }, [bins, selectedBin, gameState, onGameEnd]);

    // ── Annuler le dernier mouvement ──
    const handleUndo = useCallback(() => {
        if (moveHistory.length === 0 || gameState !== 'playing') return;
        const lastMove = moveHistory[moveHistory.length - 1];
        const newBins = bins.map(b => [...b]);
        const item = newBins[lastMove.to].pop()!;
        newBins[lastMove.from].push(item);
        setBins(newBins);
        setMoveHistory(prev => prev.slice(0, -1));
        setMoves(m => m + 1);
    }, [bins, moveHistory, gameState]);

    // ── Rewarded Ad : ajouter une 5ème poubelle ──
    const handleAdWatch = useCallback(() => {
        if (adLoading) return;
        setAdLoading(true);

        setTimeout(() => {
            setAdLoading(false);
            if (!extraBinAdded) {
                setBins(prev => [...prev, []]); // Ajouter une poubelle vide
                setExtraBinAdded(true);
            } else {
                // Déjà ajoutée : on annule les 3 derniers mouvements à la place
                let newBins = bins.map(b => [...b]);
                let newHistory = [...moveHistory];
                for (let i = 0; i < 3 && newHistory.length > 0; i++) {
                    const lastMove = newHistory.pop()!;
                    const item = newBins[lastMove.to].pop()!;
                    newBins[lastMove.from].push(item);
                }
                setBins(newBins);
                setMoveHistory(newHistory);
            }
        }, 2000);
    }, [adLoading, extraBinAdded, bins, moveHistory]);

    // ── Niveau suivant ──
    const handleNextLevel = useCallback(() => {
        const next = level + 1;
        setLevel(next);
        setBins(generateLevel(next));
        setSelectedBin(null);
        setMoves(0);
        setGameState('playing');
        setExtraBinAdded(false);
        setMoveHistory([]);
        setShowStuckHint(false);
    }, [level]);

    // ── Recommencer le niveau ──
    const handleRestart = useCallback(() => {
        setBins(generateLevel(level));
        setSelectedBin(null);
        setMoves(0);
        setGameState('playing');
        setExtraBinAdded(false);
        setMoveHistory([]);
        setShowStuckHint(false);
    }, [level]);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    // Légende des types
    const legend = Object.entries(WASTE_CONFIG).map(([key, cfg]) => (
        <View key={key} style={[st.legendItem, { borderColor: cfg.color + '50' }]}>
            <Text style={st.legendIcon}>{cfg.icon}</Text>
            <View style={[st.legendDot, { backgroundColor: cfg.color }]} />
            <Text style={[st.legendLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
    ));

    return (
        <View style={st.container}>
            {/* ── En-tête ── */}
            <View style={st.header}>
                <Text style={st.title}>♻️ Tri Sélectif — Niveau {level}</Text>
                <View style={st.statsRow}>
                    <View style={st.statPill}>
                        <Text style={st.statText}>🔄 {moves} coups</Text>
                    </View>
                    <View style={st.statPill}>
                        <Text style={st.statText}>🗑️ {bins.length} poubelles</Text>
                    </View>
                </View>
            </View>

            {/* ── Légende ── */}
            <View style={st.legendRow}>{legend}</View>

            {/* ── Zone de jeu : Poubelles ── */}
            <View style={st.binsContainer}>
                {bins.map((bin, binIdx) => {
                    const isSelected = selectedBin === binIdx;
                    const isTarget = lastMovedTo === binIdx;
                    const isEmpty = bin.length === 0;
                    const isExtra = binIdx >= 4;

                    // Déterminer si cette poubelle est triée (mono-type + pleine)
                    const isSorted = bin.length === BIN_CAPACITY && bin.every(item => item.type === bin[0].type);

                    return (
                        <Pressable
                            key={binIdx}
                            onPress={() => handleBinPress(binIdx)}
                            style={[
                                st.bin,
                                isSelected && st.binSelected,
                                isTarget && st.binTarget,
                                isSorted && st.binSorted,
                                isExtra && st.binExtra,
                            ]}
                        >
                            {/* Étiquette de la poubelle */}
                            <View style={st.binLabelRow}>
                                <Text style={st.binLabel}>
                                    {isExtra ? '🆕' : ['🗑️ A', '🗑️ B', '🗑️ C', '🗑️ D'][binIdx]}
                                </Text>
                                {isSorted && <Text style={st.sortedBadge}>✅</Text>}
                            </View>

                            {/* Contenu (éléments empilés du bas vers le haut) */}
                            <View style={st.binContent}>
                                {Array.from({ length: BIN_CAPACITY }).map((_, slotIdx) => {
                                    const item = bin[slotIdx];
                                    if (!item) {
                                        return (
                                            <View key={slotIdx} style={st.emptySlot}>
                                                <Text style={st.emptySlotDot}>·</Text>
                                            </View>
                                        );
                                    }
                                    const cfg = WASTE_CONFIG[item.type];
                                    const isTop = slotIdx === bin.length - 1;
                                    return (
                                        <View
                                            key={slotIdx}
                                            style={[
                                                st.wasteItem,
                                                { backgroundColor: cfg.bgColor, borderColor: cfg.color + '60' },
                                                isTop && isSelected && st.wasteItemLifted,
                                            ]}
                                        >
                                            <Text style={st.wasteIcon}>{cfg.icon}</Text>
                                            <Text style={[st.wasteLabel, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Indicateur de sélection */}
                            {isSelected && (
                                <View style={st.selectionArrow}>
                                    <Text style={st.selectionArrowText}>▲ Sélectionné</Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Alerte bloqué ── */}
            {showStuckHint && gameState === 'playing' && (
                <View style={st.stuckBanner}>
                    <Text style={st.stuckIcon}>😰</Text>
                    <View style={st.stuckTextCol}>
                        <Text style={st.stuckTitle}>Vous êtes bloqué !</Text>
                        <Text style={st.stuckSubtitle}>
                            Regardez une vidéo pour obtenir une poubelle supplémentaire
                        </Text>
                    </View>
                </View>
            )}

            {/* ── Bouton Rewarded Ad ── */}
            {gameState === 'playing' && (
                <Pressable
                    onPress={handleAdWatch}
                    disabled={adLoading}
                    style={[st.adBtn, adLoading && st.adBtnDisabled]}
                >
                    <Text style={st.adBtnText}>
                        {adLoading
                            ? '📺 Chargement de la pub…'
                            : extraBinAdded
                                ? '↩️ Annuler 3 coups (Vidéo 30s)'
                                : '🗑️ Poubelle supplémentaire (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Boutons d'action ── */}
            {gameState === 'playing' && (
                <View style={st.actionRow}>
                    <Pressable
                        onPress={handleUndo}
                        disabled={moveHistory.length === 0}
                        style={[st.actionBtn, moveHistory.length === 0 && st.actionBtnDisabled]}
                    >
                        <Text style={st.actionBtnText}>↩️ Annuler</Text>
                    </Pressable>
                    <Pressable onPress={handleRestart} style={st.actionBtn}>
                        <Text style={st.actionBtnText}>🔄 Recommencer</Text>
                    </Pressable>
                </View>
            )}

            {/* ── Écran de victoire ── */}
            {gameState === 'won' && (
                <View style={st.winOverlay}>
                    <Text style={st.winEmoji}>🎉♻️🎉</Text>
                    <Text style={st.winTitle}>Tri parfait !</Text>
                    <Text style={st.winSubtitle}>
                        Niveau {level} terminé en {moves} coups
                        {extraBinAdded ? ' (avec aide)' : ' — sans aide !'}
                    </Text>
                    <View style={st.winActions}>
                        <Pressable onPress={handleNextLevel} style={st.nextLevelBtn}>
                            <Text style={st.nextLevelText}>▶️ Niveau {level + 1}</Text>
                        </Pressable>
                        <Pressable onPress={handleRestart} style={st.restartBtnWin}>
                            <Text style={st.restartBtnWinText}>🔄 Rejouer ce niveau</Text>
                        </Pressable>
                    </View>
                </View>
            )}

            <Text style={st.ecoNote}>Le tri sélectif finance des panneaux solaires 🌱</Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const st = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.md,
        width: '100%',
    },

    // ── Header ──
    header: { alignItems: 'center', gap: 6 },
    title: {
        fontSize: FontSizes.md + 2,
        fontWeight: '900',
        color: Colors.textPrimary,
    },
    statsRow: { flexDirection: 'row', gap: Spacing.sm },
    statPill: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        paddingVertical: 3,
        paddingHorizontal: Spacing.sm + 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textSecondary },

    // ── Legend ──
    legendRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: 3,
        paddingHorizontal: Spacing.sm,
        borderWidth: 1,
    },
    legendIcon: { fontSize: 14 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: FontSizes.xs, fontWeight: '700' },

    // ── Bins container ──
    binsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        justifyContent: 'center',
        width: '100%',
    },

    // ── Individual bin ──
    bin: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        borderWidth: 2,
        borderColor: Colors.border,
        padding: Spacing.sm,
        width: 90,
        alignItems: 'center',
        gap: 3,
    },
    binSelected: {
        borderColor: Colors.solarGold,
        backgroundColor: Colors.solarGold + '10',
    },
    binTarget: {
        borderColor: Colors.ecoGreen,
        backgroundColor: Colors.ecoGreen + '10',
    },
    binSorted: {
        borderColor: Colors.ecoGreen + '80',
        backgroundColor: Colors.ecoGreen + '08',
    },
    binExtra: {
        borderColor: Colors.solarGold + '60',
        borderStyle: 'dashed',
    },
    binLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginBottom: 2,
    },
    binLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted },
    sortedBadge: { fontSize: 10 },

    // ── Bin content ──
    binContent: { gap: 3, width: '100%' },

    // ── Waste item ──
    wasteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        paddingVertical: 5,
        paddingHorizontal: 4,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
    },
    wasteItemLifted: {
        transform: [{ translateY: -6 }],
        opacity: 0.7,
    },
    wasteIcon: { fontSize: 14 },
    wasteLabel: { fontSize: 9, fontWeight: '800' },

    // ── Empty slot ──
    emptySlot: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 5,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border + '40',
        borderStyle: 'dashed',
    },
    emptySlotDot: { fontSize: 12, color: Colors.textMuted },

    // ── Selection arrow ──
    selectionArrow: {
        backgroundColor: Colors.solarGold + '30',
        borderRadius: BorderRadius.sm,
        paddingVertical: 2,
        paddingHorizontal: 6,
        marginTop: 2,
    },
    selectionArrowText: {
        fontSize: 8,
        fontWeight: '800',
        color: Colors.solarGold,
        textAlign: 'center',
    },

    // ── Stuck banner ──
    stuckBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E74C3C18',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
        borderWidth: 1,
        borderColor: '#E74C3C40',
        width: '100%',
    },
    stuckIcon: { fontSize: 24 },
    stuckTextCol: { flex: 1 },
    stuckTitle: { fontSize: FontSizes.sm, fontWeight: '800', color: '#E74C3C' },
    stuckSubtitle: { fontSize: FontSizes.xs, color: Colors.textSecondary, marginTop: 1 },

    // ── Ad Button ──
    adBtn: {
        backgroundColor: Colors.solarGold + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        alignItems: 'center',
    },
    adBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Action buttons ──
    actionRow: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    actionBtnDisabled: { opacity: 0.35 },
    actionBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.textSecondary },

    // ── Win overlay ──
    winOverlay: {
        backgroundColor: Colors.ecoGreen + '15',
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
        width: '100%',
    },
    winEmoji: { fontSize: 36 },
    winTitle: { fontSize: FontSizes.xl, fontWeight: '900', color: Colors.ecoGreen },
    winSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    winActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.sm },
    nextLevelBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    nextLevelText: { fontSize: FontSizes.sm, fontWeight: '800', color: '#FFFFFF' },
    restartBtnWin: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    restartBtnWinText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textSecondary },

    ecoNote: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
