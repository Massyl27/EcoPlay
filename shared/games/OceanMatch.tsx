import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🌊 OceanMatch — Match-3 nettoyage de l'océan
// ══════════════════════════════════════════════════════════════
//
// • Grille 8×8 de déchets marins et animaux
// • Intervertir 2 éléments adjacents
// • 3+ identiques en ligne/colonne → nettoyés + points
// • Gravité : éléments du dessus tombent, nouveaux apparaissent
// • 20 mouvements, Rewarded Ad → +5 mouvements
//

// ── TYPES DE CELLULES ────────────────────────────────────────

const ITEMS = ['🥤', '🥫', '🛍️', '🛢️', '🐟', '🐢'];

const ITEM_COLORS: Record<string, string> = {
    '🥤': '#E74C3C',
    '🥫': '#E67E22',
    '🛍️': '#9B59B6',
    '🛢️': '#2C3E50',
    '🐟': '#3498DB',
    '🐢': '#2ECC71',
};

const COLS = 8;
const ROWS = 8;
const INITIAL_MOVES = 20;

// ── UTILITAIRES ══════════════════════════════════════════════

function randomItem(): string {
    return ITEMS[Math.floor(Math.random() * ITEMS.length)];
}

// Créer une grille initiale sans match-3
function createGrid(): string[][] {
    const grid: string[][] = [];
    for (let r = 0; r < ROWS; r++) {
        grid.push([]);
        for (let c = 0; c < COLS; c++) {
            let item: string;
            do {
                item = randomItem();
            } while (
                // Éviter 3 horizontaux
                (c >= 2 && grid[r][c - 1] === item && grid[r][c - 2] === item) ||
                // Éviter 3 verticaux
                (r >= 2 && grid[r - 1][c] === item && grid[r - 2][c] === item)
            );
            grid[r].push(item);
        }
    }
    return grid;
}

// Copie profonde de la grille
function cloneGrid(grid: string[][]): string[][] {
    return grid.map(row => [...row]);
}

// Trouver tous les matchs (3+) horizontaux et verticaux
function findMatches(grid: string[][]): Set<string> {
    const matched = new Set<string>();

    // Horizontaux
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 2; c++) {
            const item = grid[r][c];
            if (item && item === grid[r][c + 1] && item === grid[r][c + 2]) {
                let end = c + 2;
                while (end + 1 < COLS && grid[r][end + 1] === item) end++;
                for (let k = c; k <= end; k++) matched.add(`${r},${k}`);
            }
        }
    }

    // Verticaux
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS - 2; r++) {
            const item = grid[r][c];
            if (item && item === grid[r + 1][c] && item === grid[r + 2][c]) {
                let end = r + 2;
                while (end + 1 < ROWS && grid[end + 1][c] === item) end++;
                for (let k = r; k <= end; k++) matched.add(`${k},${c}`);
            }
        }
    }

    return matched;
}

// Supprimer les matchs et faire tomber + remplir
function resolveBoard(grid: string[][]): { newGrid: string[][]; totalCleared: number } {
    let g = cloneGrid(grid);
    let totalCleared = 0;

    // Boucle de cascade
    let iterations = 0;
    while (iterations < 20) {
        const matches = findMatches(g);
        if (matches.size === 0) break;

        totalCleared += matches.size;

        // Effacer les matchs
        for (const key of matches) {
            const [r, c] = key.split(',').map(Number);
            g[r][c] = '';
        }

        // Gravité : faire tomber
        for (let c = 0; c < COLS; c++) {
            let writeRow = ROWS - 1;
            for (let r = ROWS - 1; r >= 0; r--) {
                if (g[r][c] !== '') {
                    g[writeRow][c] = g[r][c];
                    if (writeRow !== r) g[r][c] = '';
                    writeRow--;
                }
            }
            // Remplir le haut
            for (let r = writeRow; r >= 0; r--) {
                g[r][c] = randomItem();
            }
        }

        iterations++;
    }

    // S'assurer qu'il n'y a plus de match résiduel
    // (les nouveaux éléments pourraient en créer)
    // La boucle while ci-dessus le gère

    return { newGrid: g, totalCleared };
}

// Vérifier si un swap est adjacent
function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
}

// Vérifier si un swap produit un match
function swapProducesMatch(grid: string[][], r1: number, c1: number, r2: number, c2: number): boolean {
    const g = cloneGrid(grid);
    [g[r1][c1], g[r2][c2]] = [g[r2][c2], g[r1][c1]];
    return findMatches(g).size > 0;
}

// Vérifier s'il existe au moins un mouvement possible
function hasValidMove(grid: string[][]): boolean {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            // Droite
            if (c + 1 < COLS && swapProducesMatch(grid, r, c, r, c + 1)) return true;
            // Bas
            if (r + 1 < ROWS && swapProducesMatch(grid, r, c, r + 1, c)) return true;
        }
    }
    return false;
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface OceanMatchProps {
    onGameEnd?: () => void;
}

export function OceanMatch({ onGameEnd }: OceanMatchProps) {
    const [grid, setGrid] = useState<string[][]>(() => {
        // Créer une grille et résoudre les matchs initiaux
        let g = createGrid();
        const { newGrid } = resolveBoard(g);
        return newGrid;
    });
    const [selected, setSelected] = useState<[number, number] | null>(null);
    const [score, setScore] = useState(0);
    const [movesLeft, setMovesLeft] = useState(INITIAL_MOVES);
    const [gameState, setGameState] = useState<'playing' | 'outOfMoves' | 'noMoves'>('playing');
    const [combo, setCombo] = useState(0);
    const [lastCleared, setLastCleared] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [matchedCells, setMatchedCells] = useState<Set<string>>(new Set());

    // Rewarded Ad
    const [adLoading, setAdLoading] = useState(false);

    // Statistiques
    const [totalCleaned, setTotalCleaned] = useState(0);
    const [bestCombo, setBestCombo] = useState(0);

    // Vérifier si le joueur est bloqué (aucun mouvement valide)
    useEffect(() => {
        if (gameState === 'playing' && movesLeft > 0 && !isAnimating) {
            if (!hasValidMove(grid)) {
                setGameState('noMoves');
            }
        }
    }, [grid, gameState, movesLeft, isAnimating]);

    // ── Clic sur une cellule ──
    const handleCellPress = useCallback((row: number, col: number) => {
        if (gameState !== 'playing' || isAnimating || movesLeft <= 0) return;

        if (selected === null) {
            // Sélectionner
            setSelected([row, col]);
            return;
        }

        const [sr, sc] = selected;

        // Même cellule → désélectionner
        if (sr === row && sc === col) {
            setSelected(null);
            return;
        }

        // Non adjacent → resélectionner
        if (!isAdjacent(sr, sc, row, col)) {
            setSelected([row, col]);
            return;
        }

        // ── Swap ──
        const newGrid = cloneGrid(grid);
        [newGrid[sr][sc], newGrid[row][col]] = [newGrid[row][col], newGrid[sr][sc]];

        // Vérifier si le swap produit un match
        const matches = findMatches(newGrid);
        if (matches.size === 0) {
            // Pas de match → annuler le swap (feedback visuel)
            setSelected(null);
            return;
        }

        // ── Swap valide ! ──
        setSelected(null);
        setIsAnimating(true);
        setMovesLeft(m => m - 1);

        // Afficher les cellules matchées brièvement
        setMatchedCells(matches);

        // Résoudre après un court délai pour l'animation
        setTimeout(() => {
            const { newGrid: resolved, totalCleared } = resolveBoard(newGrid);

            // Calcul des points
            const points = totalCleared * 10;
            const comboBonus = totalCleared > 3 ? Math.floor((totalCleared - 3) * 5) : 0;
            const earned = points + comboBonus;

            setGrid(resolved);
            setScore(s => s + earned);
            setCombo(totalCleared > 3 ? totalCleared : 0);
            setLastCleared(totalCleared);
            setTotalCleaned(t => t + totalCleared);
            setBestCombo(prev => Math.max(prev, totalCleared));
            setMatchedCells(new Set());
            setIsAnimating(false);

            // Effacer le feedback combo
            setTimeout(() => {
                setCombo(0);
                setLastCleared(0);
            }, 1200);

            // Vérifier fin de partie
            const newMoves = movesLeft - 1;
            if (newMoves <= 0) {
                setTimeout(() => setGameState('outOfMoves'), 300);
            }
        }, 250);
    }, [grid, selected, gameState, isAnimating, movesLeft]);

    // ── Rewarded Ad : +5 mouvements ──
    const handleAdWatch = useCallback(() => {
        if (adLoading) return;
        setAdLoading(true);

        setTimeout(() => {
            setAdLoading(false);
            setMovesLeft(m => m + 5);
            setGameState('playing');
        }, 2000);
    }, [adLoading]);

    // ── Nouvelle partie ──
    const handleRestart = useCallback(() => {
        let g = createGrid();
        const { newGrid } = resolveBoard(g);
        setGrid(newGrid);
        setSelected(null);
        setScore(0);
        setMovesLeft(INITIAL_MOVES);
        setGameState('playing');
        setCombo(0);
        setLastCleared(0);
        setIsAnimating(false);
        setMatchedCells(new Set());
        setTotalCleaned(0);
        setBestCombo(0);
    }, []);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── En-tête ── */}
            <View style={st.header}>
                <Text style={st.title}>🌊 OceanMatch</Text>
                <Text style={st.subtitle}>Nettoyez l'océan ! Alignez 3 déchets identiques</Text>
            </View>

            {/* ── Stats ── */}
            <View style={st.statsRow}>
                <View style={[st.statPill, st.scorePill]}>
                    <Text style={[st.statText, st.scoreText]}>⭐ {score} pts</Text>
                </View>
                <View style={[st.statPill, movesLeft <= 3 && st.dangerPill]}>
                    <Text style={[st.statText, movesLeft <= 3 && st.dangerText]}>
                        🔄 {movesLeft} coups
                    </Text>
                </View>
                <View style={st.statPill}>
                    <Text style={st.statText}>🧹 {totalCleaned} nettoyés</Text>
                </View>
            </View>

            {/* ── Combo feedback ── */}
            {combo > 0 && (
                <View style={st.comboBar}>
                    <Text style={st.comboText}>
                        💥 Combo ×{lastCleared} ! +{lastCleared * 10 + (lastCleared > 3 ? (lastCleared - 3) * 5 : 0)} pts
                    </Text>
                </View>
            )}

            {/* ── Grille 8×8 ── */}
            <View style={st.gridContainer}>
                <View style={st.grid}>
                    {grid.map((row, r) =>
                        row.map((cell, c) => {
                            const isSelected =
                                selected !== null && selected[0] === r && selected[1] === c;
                            const isMatched = matchedCells.has(`${r},${c}`);

                            return (
                                <Pressable
                                    key={`${r}-${c}`}
                                    onPress={() => handleCellPress(r, c)}
                                    disabled={isAnimating || gameState !== 'playing'}
                                    style={[
                                        st.cell,
                                        isSelected && st.cellSelected,
                                        isMatched && st.cellMatched,
                                    ]}
                                >
                                    <Text style={[st.cellEmoji, isMatched && st.cellEmojiMatched]}>
                                        {cell}
                                    </Text>
                                </Pressable>
                            );
                        })
                    )}
                </View>
            </View>

            {/* ── Légende ── */}
            <View style={st.legendRow}>
                {ITEMS.map((item, i) => (
                    <View key={i} style={[st.legendItem, { borderColor: ITEM_COLORS[item] + '60' }]}>
                        <Text style={st.legendEmoji}>{item}</Text>
                    </View>
                ))}
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
                            ? '📺 Chargement de la pub…'
                            : '🔄 +5 mouvements (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Plus de mouvements ── */}
            {(gameState === 'outOfMoves' || gameState === 'noMoves') && (
                <View style={st.gameOverOverlay}>
                    <Text style={st.gameOverEmoji}>
                        {gameState === 'noMoves' ? '😰' : '⏱️'}
                    </Text>
                    <Text style={st.gameOverTitle}>
                        {gameState === 'noMoves'
                            ? 'Aucun mouvement possible !'
                            : 'Plus de mouvements !'}
                    </Text>
                    <Text style={st.gameOverSubtitle}>
                        Score final : {score} points • {totalCleaned} déchets nettoyés
                    </Text>

                    {/* Bouton pub pour continuer */}
                    <Pressable
                        onPress={handleAdWatch}
                        disabled={adLoading}
                        style={[st.continueBtn, adLoading && st.continueBtnDisabled]}
                    >
                        <Text style={st.continueBtnText}>
                            {adLoading
                                ? '📺 Chargement…'
                                : '🎬 +5 mouvements (Vidéo 30s)'}
                        </Text>
                    </Pressable>

                    <Pressable onPress={handleRestart} style={st.newGameBtn}>
                        <Text style={st.newGameText}>🔄 Nouvelle partie</Text>
                    </Pressable>
                </View>
            )}

            <Text style={st.ecoNote}>
                Chaque déchet nettoyé sensibilise à la pollution des océans 🌊
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const CELL_SIZE = 36;
const CELL_GAP = 2;

const st = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.sm,
        width: '100%',
    },

    // ── Header ──
    header: { alignItems: 'center', gap: 2 },
    title: {
        fontSize: FontSizes.md + 2,
        fontWeight: '900',
        color: Colors.textPrimary,
    },
    subtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },

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
    statText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

    // ── Combo ──
    comboBar: {
        backgroundColor: Colors.solarGold + '20',
        borderRadius: BorderRadius.md,
        paddingVertical: 4,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
    },
    comboText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.solarGold, textAlign: 'center' },

    // ── Grid ──
    gridContainer: {
        backgroundColor: '#0D253F',
        borderRadius: BorderRadius.lg,
        padding: 4,
        borderWidth: 1,
        borderColor: '#1A3A5C',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: CELL_SIZE * COLS + CELL_GAP * (COLS - 1),
        gap: CELL_GAP,
    },

    // ── Cell ──
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: BorderRadius.sm + 1,
        backgroundColor: '#15304A',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1A3A5C',
    },
    cellSelected: {
        borderColor: Colors.solarGold,
        borderWidth: 2,
        backgroundColor: Colors.solarGold + '15',
    },
    cellMatched: {
        backgroundColor: Colors.ecoGreen + '30',
        borderColor: Colors.ecoGreen + '80',
    },
    cellEmoji: { fontSize: 18 },
    cellEmojiMatched: { opacity: 0.5 },

    // ── Legend ──
    legendRow: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
    legendItem: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.sm,
        padding: 3,
        borderWidth: 1,
    },
    legendEmoji: { fontSize: 14 },

    // ── Ad ──
    adBtn: {
        backgroundColor: Colors.solarGold + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        maxWidth: CELL_SIZE * COLS + CELL_GAP * (COLS - 1) + 8,
        alignItems: 'center',
    },
    adBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Game Over ──
    gameOverOverlay: {
        backgroundColor: '#0D253F',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: '#1A3A5C',
        width: '100%',
    },
    gameOverEmoji: { fontSize: 36 },
    gameOverTitle: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.textPrimary },
    gameOverSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    continueBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.xs,
    },
    continueBtnDisabled: { opacity: 0.5 },
    continueBtnText: { fontSize: FontSizes.sm, fontWeight: '800', color: '#FFFFFF' },
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
