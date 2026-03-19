import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🀄 NatureMahjong — Mahjong solitaire biodiversité
// ══════════════════════════════════════════════════════════════
//
// • Tuiles superposées sur 3 couches
// • Icônes biodiversité (feuilles, insectes, eau…)
// • Sélectionner 2 tuiles libres identiques → elles disparaissent
// • Libre = pas de tuile au-dessus ET bord gauche OU droit libre
// • Rewarded Ad : remélange les tuiles restantes si bloqué
//

// ── TUILES BIODIVERSITÉ ──────────────────────────────────────

const TILE_ICONS = [
    { id: 'leaf', emoji: '🍃', label: 'Feuille' },
    { id: 'flower', emoji: '🌸', label: 'Fleur' },
    { id: 'tree', emoji: '🌳', label: 'Arbre' },
    { id: 'drop', emoji: '💧', label: 'Eau' },
    { id: 'butterfly', emoji: '🦋', label: 'Papillon' },
    { id: 'bee', emoji: '🐝', label: 'Abeille' },
    { id: 'ladybug', emoji: '🐞', label: 'Coccinelle' },
    { id: 'mushroom', emoji: '🍄', label: 'Champignon' },
    { id: 'snail', emoji: '🐌', label: 'Escargot' },
    { id: 'herb', emoji: '🌿', label: 'Herbe' },
    { id: 'sunflower', emoji: '🌻', label: 'Tournesol' },
    { id: 'seedling', emoji: '🌱', label: 'Pousse' },
    { id: 'frog', emoji: '🐸', label: 'Grenouille' },
    { id: 'turtle', emoji: '🐢', label: 'Tortue' },
    { id: 'bird', emoji: '🐦', label: 'Oiseau' },
    { id: 'fish', emoji: '🐟', label: 'Poisson' },
    { id: 'coral', emoji: '🪸', label: 'Corail' },
    { id: 'pine', emoji: '🌲', label: 'Pin' },
];

// ── LAYOUT DES COUCHES ───────────────────────────────────────
// Chaque couche est un tableau de positions [row, col]
// Couche 0 = base (la plus large), Couche 2 = sommet

const LAYER_LAYOUTS: [number, number][][] = [
    // Couche 0 — 8x6 base (48 positions → 24 paires)
    [
        [0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7],
        [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6], [2, 7],
        [3, 0], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],
        [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6], [4, 7],
        [5, 0], [5, 1], [5, 2], [5, 3], [5, 4], [5, 5], [5, 6], [5, 7],
    ],
    // Couche 1 — 6x4 milieu (24 positions → 12 paires)
    [
        [1, 1], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6],
        [2, 1], [2, 2], [2, 3], [2, 4], [2, 5], [2, 6],
        [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6],
        [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6],
    ],
    // Couche 2 — 4x2 sommet (8 positions → 4 paires)
    [
        [2, 2], [2, 3], [2, 4], [2, 5],
        [3, 2], [3, 3], [3, 4], [3, 5],
    ],
];

// ── TYPES ────────────────────────────────────────────────────

interface MahjongTile {
    id: number;
    iconId: string;
    layer: number;
    row: number;
    col: number;
    removed: boolean;
}

// ── UTILITAIRES ──────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function generateTiles(): MahjongTile[] {
    // Compter le total de positions
    const totalPositions = LAYER_LAYOUTS.reduce((sum, l) => sum + l.length, 0);
    const pairsNeeded = totalPositions / 2;

    // Générer les paires d'icônes
    const iconPool: string[] = [];
    for (let i = 0; i < pairsNeeded; i++) {
        const icon = TILE_ICONS[i % TILE_ICONS.length].id;
        iconPool.push(icon, icon); // paire
    }

    const shuffled = shuffle(iconPool);

    const tiles: MahjongTile[] = [];
    let idx = 0;
    let tileId = 0;

    for (let layer = 0; layer < LAYER_LAYOUTS.length; layer++) {
        for (const [row, col] of LAYER_LAYOUTS[layer]) {
            tiles.push({
                id: tileId++,
                iconId: shuffled[idx++],
                layer,
                row,
                col,
                removed: false,
            });
        }
    }

    return tiles;
}

// Vérifier si une tuile est libre
function isTileFree(tile: MahjongTile, allTiles: MahjongTile[]): boolean {
    if (tile.removed) return false;

    const activeTiles = allTiles.filter(t => !t.removed && t.id !== tile.id);

    // 1. Pas de tuile au-dessus (couche supérieure, position chevauchante)
    const hasAbove = activeTiles.some(t =>
        t.layer > tile.layer &&
        Math.abs(t.row - tile.row) < 1 &&
        Math.abs(t.col - tile.col) < 1
    );
    if (hasAbove) return false;

    // 2. Bord gauche OU bord droit libre (pas bloqué des deux côtés)
    const hasLeft = activeTiles.some(t =>
        t.layer === tile.layer &&
        t.row === tile.row &&
        t.col === tile.col - 1
    );
    const hasRight = activeTiles.some(t =>
        t.layer === tile.layer &&
        t.row === tile.row &&
        t.col === tile.col + 1
    );

    // Libre si au moins un côté est dégagé
    if (hasLeft && hasRight) return false;

    return true;
}

// Trouver tous les coups possibles
function findPossibleMoves(tiles: MahjongTile[]): [MahjongTile, MahjongTile][] {
    const freeTiles = tiles.filter(t => !t.removed && isTileFree(t, tiles));
    const moves: [MahjongTile, MahjongTile][] = [];

    for (let i = 0; i < freeTiles.length; i++) {
        for (let j = i + 1; j < freeTiles.length; j++) {
            if (freeTiles[i].iconId === freeTiles[j].iconId) {
                moves.push([freeTiles[i], freeTiles[j]]);
            }
        }
    }

    return moves;
}

function getIcon(iconId: string) {
    return TILE_ICONS.find(t => t.id === iconId) || TILE_ICONS[0];
}

// Couleurs par couche
const LAYER_COLORS = [
    { bg: '#1A2744', border: '#2A3A5C' },
    { bg: '#1E3A2A', border: '#2E5A3A' },
    { bg: '#2A1E3A', border: '#4A2E5A' },
];

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface NatureMahjongProps {
    onGameEnd?: () => void;
}

export function NatureMahjong({ onGameEnd }: NatureMahjongProps) {
    const [tiles, setTiles] = useState<MahjongTile[]>(() => generateTiles());
    const [selectedTile, setSelectedTile] = useState<MahjongTile | null>(null);
    const [gameState, setGameState] = useState<'playing' | 'stuck' | 'won'>('playing');
    const [pairsFound, setPairsFound] = useState(0);
    const [moves, setMoves] = useState(0);
    const [lastMatch, setLastMatch] = useState<string | null>(null);

    // Rewarded Ad
    const [adLoading, setAdLoading] = useState(false);

    // Stats
    const totalPairs = tiles.length / 2;
    const remaining = tiles.filter(t => !t.removed).length;

    // Calcul des tuiles libres
    const freeTileIds = useMemo(() => {
        return new Set(
            tiles.filter(t => !t.removed && isTileFree(t, tiles)).map(t => t.id)
        );
    }, [tiles]);

    // Vérifier si bloqué
    const checkStuck = useCallback((currentTiles: MahjongTile[]) => {
        const remainingTiles = currentTiles.filter(t => !t.removed);
        if (remainingTiles.length === 0) {
            setGameState('won');
            onGameEnd?.();
            return;
        }
        const moves = findPossibleMoves(currentTiles);
        if (moves.length === 0) {
            setGameState('stuck');
        }
    }, [onGameEnd]);

    // ── Clic sur une tuile ──
    const handleTilePress = useCallback((tile: MahjongTile) => {
        if (gameState !== 'playing') return;
        if (tile.removed) return;
        if (!freeTileIds.has(tile.id)) return;

        if (selectedTile === null) {
            setSelectedTile(tile);
            return;
        }

        // Même tuile → désélectionner
        if (selectedTile.id === tile.id) {
            setSelectedTile(null);
            return;
        }

        // Vérifier le match
        if (selectedTile.iconId === tile.iconId) {
            // ── Match ! ──
            const newTiles = tiles.map(t =>
                t.id === selectedTile.id || t.id === tile.id
                    ? { ...t, removed: true }
                    : t
            );
            setTiles(newTiles);
            setSelectedTile(null);
            setPairsFound(p => p + 1);
            setMoves(m => m + 1);
            setLastMatch(getIcon(tile.iconId).emoji);
            setTimeout(() => setLastMatch(null), 800);

            // Vérifier victoire ou blocage
            setTimeout(() => checkStuck(newTiles), 100);
        } else {
            // Pas de match → sélectionner la nouvelle tuile
            setSelectedTile(tile);
            setMoves(m => m + 1);
        }
    }, [gameState, selectedTile, tiles, freeTileIds, checkStuck]);

    // ── Rewarded Ad : remélanger ──
    const handleAdWatch = useCallback(() => {
        if (adLoading) return;
        setAdLoading(true);

        setTimeout(() => {
            setAdLoading(false);

            // Remélanger les tuiles restantes
            const remainingTiles = tiles.filter(t => !t.removed);
            const removedTiles = tiles.filter(t => t.removed);

            // Récupérer les icônes restantes et les mélanger
            const remainingIcons = shuffle(remainingTiles.map(t => t.iconId));

            // Réassigner les icônes
            const reshuffled = remainingTiles.map((t, i) => ({
                ...t,
                iconId: remainingIcons[i],
            }));

            setTiles([...removedTiles, ...reshuffled]);
            setSelectedTile(null);
            setGameState('playing');
        }, 2000);
    }, [adLoading, tiles]);

    // ── Nouvelle partie ──
    const handleRestart = useCallback(() => {
        setTiles(generateTiles());
        setSelectedTile(null);
        setGameState('playing');
        setPairsFound(0);
        setMoves(0);
        setLastMatch(null);
    }, []);

    // ── Rendu des tuiles par couche (de bas en haut) ──
    const TILE_W = 36;
    const TILE_H = 42;
    const LAYER_OFFSET = 3; // décalage 3D par couche

    // Calculer la taille du plateau
    const maxCol = Math.max(...LAYER_LAYOUTS.flat().map(([_, c]) => c));
    const maxRow = Math.max(...LAYER_LAYOUTS.flat().map(([r]) => r));
    const boardWidth = (maxCol + 1) * TILE_W + LAYER_LAYOUTS.length * LAYER_OFFSET + 16;
    const boardHeight = (maxRow + 1) * TILE_H + LAYER_LAYOUTS.length * LAYER_OFFSET + 16;

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── En-tête ── */}
            <View style={st.header}>
                <Text style={st.title}>🀄 NatureMahjong</Text>
                <Text style={st.subtitle}>Associez les tuiles de la biodiversité !</Text>
            </View>

            {/* ── Stats ── */}
            <View style={st.statsRow}>
                <View style={[st.statPill, st.scorePill]}>
                    <Text style={[st.statText, st.scoreText]}>🎯 {pairsFound}/{totalPairs}</Text>
                </View>
                <View style={st.statPill}>
                    <Text style={st.statText}>🔄 {moves} coups</Text>
                </View>
                <View style={st.statPill}>
                    <Text style={st.statText}>🀄 {remaining} restantes</Text>
                </View>
            </View>

            {/* ── Match feedback ── */}
            {lastMatch && (
                <View style={st.matchBar}>
                    <Text style={st.matchText}>✨ Paire trouvée ! {lastMatch}{lastMatch}</Text>
                </View>
            )}

            {/* ── Plateau de jeu ── */}
            <ScrollView
                horizontal
                contentContainerStyle={st.boardScroll}
                showsHorizontalScrollIndicator={false}
            >
                <View style={[st.board, { width: boardWidth, height: boardHeight }]}>
                    {/* Rendu couche par couche */}
                    {LAYER_LAYOUTS.map((_, layerIdx) =>
                        tiles
                            .filter(t => t.layer === layerIdx && !t.removed)
                            .map(tile => {
                                const isFree = freeTileIds.has(tile.id);
                                const isSelected = selectedTile?.id === tile.id;
                                const icon = getIcon(tile.iconId);
                                const layerColor = LAYER_COLORS[layerIdx];

                                const left = tile.col * TILE_W + tile.layer * LAYER_OFFSET + 8;
                                const top = tile.row * TILE_H + tile.layer * LAYER_OFFSET + 8;

                                return (
                                    <Pressable
                                        key={tile.id}
                                        onPress={() => handleTilePress(tile)}
                                        disabled={!isFree || gameState !== 'playing'}
                                        style={[
                                            st.tile,
                                            {
                                                left,
                                                top,
                                                width: TILE_W - 2,
                                                height: TILE_H - 2,
                                                backgroundColor: layerColor.bg,
                                                borderColor: isSelected
                                                    ? Colors.solarGold
                                                    : isFree
                                                        ? layerColor.border
                                                        : '#111827',
                                                zIndex: layerIdx * 100 + tile.row * 10 + tile.col,
                                                opacity: isFree ? 1 : 0.5,
                                                borderWidth: isSelected ? 2 : 1,
                                            },
                                            isSelected && st.tileSelected,
                                        ]}
                                    >
                                        <Text style={[st.tileEmoji, { fontSize: layerIdx === 2 ? 16 : 15 }]}>
                                            {icon.emoji}
                                        </Text>
                                    </Pressable>
                                );
                            })
                    )}
                </View>
            </ScrollView>

            {/* ── Légende des couches ── */}
            <View style={st.layerLegend}>
                {LAYER_COLORS.map((lc, i) => (
                    <View key={i} style={[st.layerDot, { backgroundColor: lc.border }]}>
                        <Text style={st.layerDotText}>C{i + 1}</Text>
                    </View>
                ))}
                <Text style={st.layerHint}>← Couches (bas → haut)</Text>
            </View>

            {/* ── Rewarded Ad ── */}
            {gameState === 'playing' && (
                <Pressable
                    onPress={handleAdWatch}
                    disabled={adLoading}
                    style={[st.adBtn, adLoading && st.adBtnDisabled]}
                >
                    <Text style={st.adBtnText}>
                        {adLoading
                            ? '📺 Chargement…'
                            : '🔀 Remélanger les tuiles (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Bloqué ── */}
            {gameState === 'stuck' && (
                <View style={st.stuckOverlay}>
                    <Text style={st.stuckEmoji}>😰</Text>
                    <Text style={st.stuckTitle}>Aucun coup possible !</Text>
                    <Text style={st.stuckSubtitle}>
                        {pairsFound} paires trouvées • {remaining} tuiles restantes
                    </Text>

                    <Pressable
                        onPress={handleAdWatch}
                        disabled={adLoading}
                        style={[st.reviveBtn, adLoading && st.reviveBtnDisabled]}
                    >
                        <Text style={st.reviveBtnText}>
                            {adLoading
                                ? '📺 Chargement…'
                                : '🔀 Remélanger (Vidéo 30s)'}
                        </Text>
                    </Pressable>

                    <Pressable onPress={handleRestart} style={st.newGameBtn}>
                        <Text style={st.newGameText}>🔄 Nouvelle partie</Text>
                    </Pressable>
                </View>
            )}

            {/* ── Victoire ── */}
            {gameState === 'won' && (
                <View style={st.wonOverlay}>
                    <Text style={st.wonEmoji}>🎉🀄🎉</Text>
                    <Text style={st.wonTitle}>Plateau nettoyé !</Text>
                    <Text style={st.wonSubtitle}>
                        {totalPairs} paires en {moves} coups
                    </Text>
                    <Pressable onPress={handleRestart} style={st.newGameBtn2}>
                        <Text style={st.newGameText2}>🔄 Nouvelle partie</Text>
                    </Pressable>
                </View>
            )}

            <Text style={st.ecoNote}>
                Chaque paire révèle une espèce protégée 🌍
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

    // ── Match ──
    matchBar: {
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.md,
        paddingVertical: 4,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
    },
    matchText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.ecoGreen, textAlign: 'center' },

    // ── Board ──
    boardScroll: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
    },
    board: {
        position: 'relative',
        backgroundColor: '#0A1628',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#1A2A4C',
    },

    // ── Tile ──
    tile: {
        position: 'absolute',
        borderRadius: BorderRadius.sm + 1,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 2,
        shadowOffset: { width: 1, height: 1 },
        elevation: 3,
    },
    tileSelected: {
        shadowColor: Colors.solarGold,
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 8,
    },
    tileEmoji: { fontSize: 15 },

    // ── Layer legend ──
    layerLegend: { flexDirection: 'row', gap: 4, alignItems: 'center' },
    layerDot: {
        width: 22,
        height: 16,
        borderRadius: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    layerDotText: { fontSize: 7, fontWeight: '900', color: 'rgba(255,255,255,0.6)' },
    layerHint: { fontSize: 8, color: Colors.textMuted, marginLeft: 4 },

    // ── Ad ──
    adBtn: {
        backgroundColor: Colors.solarGold + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        alignItems: 'center',
    },
    adBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Stuck ──
    stuckOverlay: {
        backgroundColor: '#E74C3C12',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: '#E74C3C50',
        width: '100%',
    },
    stuckEmoji: { fontSize: 32 },
    stuckTitle: { fontSize: FontSizes.md, fontWeight: '900', color: '#E74C3C' },
    stuckSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
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

    // ── Won ──
    wonOverlay: {
        backgroundColor: Colors.ecoGreen + '15',
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
        width: '100%',
    },
    wonEmoji: { fontSize: 36 },
    wonTitle: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.ecoGreen },
    wonSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    newGameBtn2: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.xs,
    },
    newGameText2: { fontSize: FontSizes.sm, fontWeight: '800', color: '#FFFFFF' },

    ecoNote: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
