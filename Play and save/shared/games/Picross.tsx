import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🧩 Picross (Nonogram) — Jeu complet
// ══════════════════════════════════════════════════════════════
//
// • Grille 5×5 avec indices auto-générés (axes haut + gauche)
// • Motifs écologiques prédéfinis (goutte, arbre, soleil, feuille, cœur)
// • Clic gauche = noircir (remplir) / Clic droit = croix (marquer vide)
// • Sur mobile : tap = noircir, bouton toggle pour passer en mode croix
// • Bouton "Révéler une case" via Rewarded Ad simulée
// • Design Dark Mode, cases vertes/dorées
//

// ── PUZZLES ÉCOLOGIQUES ──────────────────────────────────────
// 1 = case à remplir, 0 = case vide

interface PuzzleDef {
    name: string;
    icon: string;
    grid: number[][];
}

const PUZZLES: PuzzleDef[] = [
    {
        name: 'Goutte d\'eau',
        icon: '💧',
        grid: [
            [0, 0, 1, 0, 0],
            [0, 1, 0, 1, 0],
            [0, 1, 0, 1, 0],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0],
        ],
    },
    {
        name: 'Arbre',
        icon: '🌲',
        grid: [
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
        ],
    },
    {
        name: 'Soleil',
        icon: '☀️',
        grid: [
            [0, 1, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 1, 0],
        ],
    },
    {
        name: 'Feuille',
        icon: '🍃',
        grid: [
            [0, 1, 1, 0, 0],
            [1, 1, 1, 1, 0],
            [1, 1, 1, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 0, 1, 0, 0],
        ],
    },
    {
        name: 'Cœur vert',
        icon: '💚',
        grid: [
            [0, 1, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [1, 1, 1, 1, 1],
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0],
        ],
    },
    {
        name: 'Vague',
        icon: '🌊',
        grid: [
            [0, 0, 0, 0, 0],
            [0, 1, 0, 1, 0],
            [1, 0, 1, 0, 1],
            [1, 1, 1, 1, 1],
            [0, 0, 0, 0, 0],
        ],
    },
    {
        name: 'Éclair',
        icon: '⚡',
        grid: [
            [0, 1, 1, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0],
        ],
    },
];

const SIZE = 5;

// ── CALCUL DES INDICES ───────────────────────────────────────

/** Calcule les indices (groupes consécutifs) pour une ligne/colonne */
function computeClues(line: number[]): number[] {
    const clues: number[] = [];
    let count = 0;
    for (const cell of line) {
        if (cell === 1) {
            count++;
        } else if (count > 0) {
            clues.push(count);
            count = 0;
        }
    }
    if (count > 0) clues.push(count);
    return clues.length > 0 ? clues : [0];
}

// ── TYPES DE CELLULES ────────────────────────────────────────

type CellState = 'empty' | 'filled' | 'crossed';

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface PicrossProps {
    onGameEnd?: () => void;
}

export function Picross({ onGameEnd }: PicrossProps) {
    // ── État du jeu ──
    const [puzzleIndex, setPuzzleIndex] = useState(0);
    const puzzle = PUZZLES[puzzleIndex];

    const [grid, setGrid] = useState<CellState[][]>(() =>
        Array.from({ length: SIZE }, () => Array(SIZE).fill('empty'))
    );
    const [gameStatus, setGameStatus] = useState<'playing' | 'won'>('playing');
    const [crossMode, setCrossMode] = useState(false);

    // ── Rewarded Ad ──
    const [revealLoading, setRevealLoading] = useState(false);
    const [revealsUsed, setRevealsUsed] = useState(0);

    // ── Indices pré-calculés ──
    const rowClues = useMemo(
        () => puzzle.grid.map(row => computeClues(row)),
        [puzzle]
    );
    const colClues = useMemo(
        () => Array.from({ length: SIZE }, (_, c) =>
            computeClues(puzzle.grid.map(row => row[c]))
        ),
        [puzzle]
    );

    // ── Nombre de cases restantes ──
    const remaining = useMemo(() => {
        let total = 0;
        let found = 0;
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (puzzle.grid[r][c] === 1) {
                    total++;
                    if (grid[r][c] === 'filled') found++;
                }
            }
        }
        return total - found;
    }, [grid, puzzle]);

    // ── Vérification victoire ──
    const checkWin = useCallback((newGrid: CellState[][]) => {
        const isWin = puzzle.grid.every((row, r) =>
            row.every((cell, c) =>
                cell === 1 ? newGrid[r][c] === 'filled' : newGrid[r][c] !== 'filled'
            )
        );
        if (isWin) {
            setGameStatus('won');
            onGameEnd?.();
        }
    }, [puzzle, onGameEnd]);

    // ── Clic gauche → noircir / Clic droit → croix ──
    const handleCellPress = useCallback((r: number, c: number, isRightClick = false) => {
        if (gameStatus !== 'playing') return;

        const newGrid = grid.map(row => [...row]);
        const current = newGrid[r][c];

        if (isRightClick || crossMode) {
            // Mode croix : vide ↔ croix
            newGrid[r][c] = current === 'crossed' ? 'empty' : 'crossed';
        } else {
            // Mode remplissage : vide ↔ rempli
            newGrid[r][c] = current === 'filled' ? 'empty' : 'filled';
        }

        setGrid(newGrid);
        checkWin(newGrid);
    }, [grid, gameStatus, crossMode, checkWin]);

    // ── Clic droit natif (Web) ──
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof document === 'undefined') return;

        const handler = (e: MouseEvent) => {
            // Chercher si le clic droit est sur une cellule du picross
            const target = e.target as HTMLElement;
            const cellEl = target.closest('[data-picross-cell]') as HTMLElement;
            if (cellEl) {
                e.preventDefault();
                const r = parseInt(cellEl.getAttribute('data-row') || '0');
                const c = parseInt(cellEl.getAttribute('data-col') || '0');
                handleCellPress(r, c, true);
            }
        };

        document.addEventListener('contextmenu', handler);
        return () => document.removeEventListener('contextmenu', handler);
    }, [handleCellPress]);

    // ── Révéler une case (Rewarded Ad) ──
    const handleReveal = useCallback(() => {
        if (gameStatus !== 'playing' || revealLoading) return;

        // Trouver les cases correctes non encore remplies
        const unrevealed: [number, number][] = [];
        for (let r = 0; r < SIZE; r++) {
            for (let c = 0; c < SIZE; c++) {
                if (puzzle.grid[r][c] === 1 && grid[r][c] !== 'filled') {
                    unrevealed.push([r, c]);
                }
            }
        }

        if (unrevealed.length === 0) return;

        setRevealLoading(true);

        // Simuler 2 secondes de chargement pub
        setTimeout(() => {
            setRevealLoading(false);
            setRevealsUsed(prev => prev + 1);

            // Choisir une case au hasard parmi les non-révélées
            const [rr, rc] = unrevealed[Math.floor(Math.random() * unrevealed.length)];
            const newGrid = grid.map(row => [...row]);
            newGrid[rr][rc] = 'filled';
            setGrid(newGrid);
            checkWin(newGrid);
        }, 2000);
    }, [gameStatus, revealLoading, grid, puzzle, checkWin]);

    // ── Nouveau puzzle ──
    const handleNextPuzzle = () => {
        setPuzzleIndex(prev => (prev + 1) % PUZZLES.length);
        setGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill('empty')));
        setGameStatus('playing');
        setCrossMode(false);
        setRevealsUsed(0);
    };

    // ── Reset puzzle actuel ──
    const handleReset = () => {
        setGrid(Array.from({ length: SIZE }, () => Array(SIZE).fill('empty')));
        setGameStatus('playing');
    };

    // ── Vérifier si un indice de ligne est satisfait ──
    const isRowComplete = useCallback((r: number) => {
        const actual = computeClues(grid[r].map(c => c === 'filled' ? 1 : 0));
        const expected = rowClues[r];
        return actual.length === expected.length && actual.every((v, i) => v === expected[i]);
    }, [grid, rowClues]);

    const isColComplete = useCallback((c: number) => {
        const actual = computeClues(grid.map(row => row[c] === 'filled' ? 1 : 0));
        const expected = colClues[c];
        return actual.length === expected.length && actual.every((v, i) => v === expected[i]);
    }, [grid, colClues]);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={styles.container}>
            {/* ── En-tête puzzle ── */}
            <View style={styles.header}>
                <Text style={styles.puzzleIcon}>{puzzle.icon}</Text>
                <View>
                    <Text style={styles.puzzleName}>{puzzle.name}</Text>
                    <Text style={styles.puzzleProgress}>
                        {gameStatus === 'won' ? '✅ Résolu !' : `${remaining} cases restantes`}
                    </Text>
                </View>
                <Text style={styles.puzzleNumber}>#{puzzleIndex + 1}/{PUZZLES.length}</Text>
            </View>

            {/* ── Victoire ── */}
            {gameStatus === 'won' && (
                <View style={styles.winBanner}>
                    <Text style={styles.winText}>
                        🎉 Puzzle résolu {revealsUsed > 0 ? `(${revealsUsed} indice${revealsUsed > 1 ? 's' : ''})` : 'sans aide !'}
                    </Text>
                </View>
            )}

            {/* ── Grille avec indices ── */}
            <View style={styles.boardContainer}>
                {/* Indices colonnes (en haut) */}
                <View style={styles.colCluesRow}>
                    <View style={styles.cornerSpacer} />
                    {colClues.map((clues, c) => (
                        <View
                            key={c}
                            style={[styles.colClueCell, isColComplete(c) && styles.clueComplete]}
                        >
                            {clues.map((n, i) => (
                                <Text
                                    key={i}
                                    style={[styles.clueNumber, isColComplete(c) && styles.clueNumberDone]}
                                >
                                    {n}
                                </Text>
                            ))}
                        </View>
                    ))}
                </View>

                {/* Lignes de la grille avec indices à gauche */}
                {grid.map((row, r) => (
                    <View key={r} style={styles.gridRow}>
                        {/* Indice de ligne */}
                        <View style={[styles.rowClueCell, isRowComplete(r) && styles.clueComplete]}>
                            <Text style={[styles.clueRowText, isRowComplete(r) && styles.clueNumberDone]}>
                                {rowClues[r].join('  ')}
                            </Text>
                        </View>

                        {/* Cellules */}
                        {row.map((cell, c) => (
                            <Pressable
                                key={c}
                                onPress={() => handleCellPress(r, c, false)}
                                // @ts-ignore — data attributes for web right-click
                                dataSet={Platform.OS === 'web' ? { picrossCell: true, row: r, col: c } : undefined}
                                style={({ pressed }) => [
                                    styles.cell,
                                    cell === 'filled' && styles.cellFilled,
                                    cell === 'crossed' && styles.cellCrossed,
                                    // Bordures des blocs (séparation visuelle)
                                    r === 0 && styles.cellBorderTop,
                                    c === 0 && styles.cellBorderLeft,
                                    pressed && styles.cellPressed,
                                ]}
                            >
                                {cell === 'crossed' && (
                                    <Text style={styles.crossText}>✕</Text>
                                )}
                                {cell === 'filled' && gameStatus === 'won' && (
                                    <Text style={styles.cellGlow}>●</Text>
                                )}
                            </Pressable>
                        ))}
                    </View>
                ))}
            </View>

            {/* ── Contrôles ── */}
            <View style={styles.controls}>
                {/* Toggle mode : remplir / croix */}
                <View style={styles.modeToggle}>
                    <Pressable
                        onPress={() => setCrossMode(false)}
                        style={[styles.modeBtn, !crossMode && styles.modeBtnActive]}
                    >
                        <Text style={[styles.modeBtnText, !crossMode && styles.modeBtnTextActive]}>
                            ■ Remplir
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={() => setCrossMode(true)}
                        style={[styles.modeBtn, crossMode && styles.modeBtnActiveCross]}
                    >
                        <Text style={[styles.modeBtnText, crossMode && styles.modeBtnTextActive]}>
                            ✕ Croix
                        </Text>
                    </Pressable>
                </View>

                {Platform.OS === 'web' && (
                    <Text style={styles.tipText}>
                        💡 Clic droit = croix automatique
                    </Text>
                )}
            </View>

            {/* ── Bouton Révéler (Rewarded Ad) ── */}
            {gameStatus === 'playing' && (
                <Pressable
                    onPress={handleReveal}
                    disabled={revealLoading || remaining === 0}
                    style={[styles.revealBtn, (revealLoading || remaining === 0) && styles.revealBtnDisabled]}
                >
                    <Text style={styles.revealBtnText}>
                        {revealLoading
                            ? '📺 Chargement de la pub…'
                            : '🔍 Révéler une case (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Actions ── */}
            <View style={styles.actionRow}>
                <Pressable onPress={handleReset} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>🗑️ Effacer</Text>
                </Pressable>
                <Pressable onPress={handleNextPuzzle} style={styles.actionBtnPrimary}>
                    <Text style={styles.actionBtnPrimaryText}>
                        {gameStatus === 'won' ? '➡️ Puzzle suivant' : '🔀 Autre puzzle'}
                    </Text>
                </Pressable>
            </View>

            <Text style={styles.ecoNote}>Les revenus financent des panneaux solaires 🌱</Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const CELL_SZ = 48;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.md,
        width: '100%',
    },

    // ── Header ──
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        width: '100%',
        maxWidth: 360,
    },
    puzzleIcon: { fontSize: 28 },
    puzzleName: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.textPrimary },
    puzzleProgress: { fontSize: FontSizes.xs, color: Colors.textSecondary },
    puzzleNumber: { marginLeft: 'auto', fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '700' },

    // ── Win ──
    winBanner: {
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.ecoGreen,
    },
    winText: { fontWeight: '800', fontSize: FontSizes.sm, color: Colors.textPrimary, textAlign: 'center' },

    // ── Board ──
    boardContainer: { gap: 0 },

    // ── Indices colonnes ──
    colCluesRow: { flexDirection: 'row' },
    cornerSpacer: { width: 40 },
    colClueCell: {
        width: CELL_SZ,
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 4,
        minHeight: 30,
    },
    clueComplete: { opacity: 0.4 },
    clueNumber: {
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
        fontWeight: '800',
        lineHeight: 18,
    },
    clueNumberDone: { color: Colors.ecoGreen },

    // ── Indices lignes ──
    gridRow: { flexDirection: 'row' },
    rowClueCell: {
        width: 40,
        height: CELL_SZ,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: 6,
    },
    clueRowText: {
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
        fontWeight: '800',
    },

    // ── Cellules ──
    cell: {
        width: CELL_SZ,
        height: CELL_SZ,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellBorderTop: { borderTopWidth: 2, borderTopColor: Colors.solarGold + '60' },
    cellBorderLeft: { borderLeftWidth: 2, borderLeftColor: Colors.solarGold + '60' },
    cellFilled: {
        backgroundColor: Colors.ecoGreen,
    },
    cellCrossed: {
        backgroundColor: Colors.surface,
    },
    cellPressed: { opacity: 0.7 },
    crossText: {
        fontSize: 18,
        fontWeight: '900',
        color: Colors.error + 'B0',
    },
    cellGlow: {
        fontSize: 8,
        color: '#FFFFFF80',
    },

    // ── Contrôles ──
    controls: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    modeToggle: {
        flexDirection: 'row',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        overflow: 'hidden',
    },
    modeBtn: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
    },
    modeBtnActive: {
        backgroundColor: Colors.ecoGreen + '30',
    },
    modeBtnActiveCross: {
        backgroundColor: Colors.error + '20',
    },
    modeBtnText: {
        fontSize: FontSizes.xs,
        fontWeight: '700',
        color: Colors.textSecondary,
    },
    modeBtnTextActive: {
        color: Colors.textPrimary,
    },
    tipText: {
        fontSize: FontSizes.xs - 1,
        color: Colors.textMuted,
        fontStyle: 'italic',
    },

    // ── Révéler (Rewarded Ad) ──
    revealBtn: {
        backgroundColor: Colors.solarGold + '18',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
    },
    revealBtnDisabled: {
        opacity: 0.5,
        backgroundColor: Colors.surface,
        borderColor: Colors.border,
    },
    revealBtnText: {
        fontSize: FontSizes.xs + 1,
        fontWeight: '700',
        color: Colors.solarGold,
        textAlign: 'center',
    },

    // ── Actions ──
    actionRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    actionBtn: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    actionBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSizes.xs },
    actionBtnPrimary: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.solarGold + '40',
        backgroundColor: Colors.solarGold + '15',
    },
    actionBtnPrimaryText: { color: Colors.solarGold, fontWeight: '700', fontSize: FontSizes.xs },

    // ── Eco note ──
    ecoNote: { fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
