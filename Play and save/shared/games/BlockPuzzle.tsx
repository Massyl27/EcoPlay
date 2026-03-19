import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🧱 Block Puzzle (type 1010 / Tetris) — Jeu complet
// ══════════════════════════════════════════════════════════════
//
// • Grille 10×10
// • 3 blocs de formes aléatoires proposés en bas
// • Clic pour sélectionner un bloc → clic sur la grille pour le placer
// • Lignes/colonnes pleines disparaissent + score
// • Blocs style "panneaux solaires" (bleu nuit + bordures argentées)
// • Bouton Rewarded Ad pour régénérer les 3 blocs
//

const GRID = 10;

// ── FORMES DES PIÈCES ────────────────────────────────────────
// Chaque forme est un tableau de [row, col] relatifs
type PieceShape = number[][];

const SHAPES: PieceShape[] = [
    // Carrés & petits blocs
    [[0, 0]],                                                       // 1×1
    [[0, 0], [0, 1]],                                                  // 1×2
    [[0, 0], [1, 0]],                                                  // 2×1
    [[0, 0], [0, 1], [0, 2]],                                            // 1×3
    [[0, 0], [1, 0], [2, 0]],                                            // 3×1
    [[0, 0], [0, 1], [1, 0], [1, 1]],                                      // 2×2
    // L-shapes
    [[0, 0], [1, 0], [1, 1]],                                            // L
    [[0, 0], [0, 1], [1, 0]],                                            // L inversé
    [[0, 0], [0, 1], [1, 1]],                                            // J
    [[0, 0], [1, 0], [1, -1]],                                           // J inversé
    // T-shapes
    [[0, 0], [0, 1], [0, 2], [1, 1]],                                      // T
    [[0, 0], [1, 0], [1, 1], [2, 0]],                                      // T latéral
    // Lignes longues
    [[0, 0], [0, 1], [0, 2], [0, 3]],                                      // 1×4
    [[0, 0], [1, 0], [2, 0], [3, 0]],                                      // 4×1
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],                                // 1×5
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],                                // 5×1
    // Gros L
    [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],                                // Grand L
    [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0]],                                // Grand L inversé
    // Carré 3×3
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],        // 3×3
];

// ── COULEURS "PANNEAUX SOLAIRES" ─────────────────────────────

const SOLAR_PALETTES = [
    { bg: '#1A2744', border: '#4A6FA5' },  // Bleu nuit profond
    { bg: '#1C2D4A', border: '#5B8DB8' },  // Bleu nuit moyen
    { bg: '#142238', border: '#3D5A80' },  // Bleu nuit foncé
    { bg: '#1E3050', border: '#6A9BC5' },  // Bleu acier
    { bg: '#0F1D33', border: '#2D4F7A' },  // Bleu marine
];

interface Piece {
    shape: PieceShape;
    palette: typeof SOLAR_PALETTES[0];
    id: number;
}

// ── UTILITAIRES ──────────────────────────────────────────────

let pieceIdCounter = 0;

function randomPiece(): Piece {
    const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const palette = SOLAR_PALETTES[Math.floor(Math.random() * SOLAR_PALETTES.length)];
    return { shape, palette, id: pieceIdCounter++ };
}

function generateThreePieces(): Piece[] {
    return [randomPiece(), randomPiece(), randomPiece()];
}

function createEmptyGrid(): number[][] {
    return Array.from({ length: GRID }, () => Array(GRID).fill(0));
}

/** Normaliser la forme pour que le minimum soit (0,0) */
function normalizeShape(shape: PieceShape): PieceShape {
    const minR = Math.min(...shape.map(([r]) => r));
    const minC = Math.min(...shape.map(([, c]) => c));
    return shape.map(([r, c]) => [r - minR, c - minC]);
}

/** Dimensions de la forme */
function shapeBounds(shape: PieceShape): { rows: number; cols: number } {
    const norm = normalizeShape(shape);
    return {
        rows: Math.max(...norm.map(([r]) => r)) + 1,
        cols: Math.max(...norm.map(([, c]) => c)) + 1,
    };
}

/** Peut-on placer la pièce sur la grille à (startR, startC) ? */
function canPlace(grid: number[][], shape: PieceShape, startR: number, startC: number): boolean {
    const norm = normalizeShape(shape);
    for (const [dr, dc] of norm) {
        const r = startR + dr;
        const c = startC + dc;
        if (r < 0 || r >= GRID || c < 0 || c >= GRID || grid[r][c] !== 0) return false;
    }
    return true;
}

/** La pièce peut-elle être placée quelque part sur la grille ? */
function canFitAnywhere(grid: number[][], shape: PieceShape): boolean {
    for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
            if (canPlace(grid, shape, r, c)) return true;
        }
    }
    return false;
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface BlockPuzzleProps {
    onGameEnd?: () => void;
}

export function BlockPuzzle({ onGameEnd }: BlockPuzzleProps) {
    const [grid, setGrid] = useState<number[][]>(createEmptyGrid);
    const [pieces, setPieces] = useState<(Piece | null)[]>(generateThreePieces);
    const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [linesCleared, setLinesCleared] = useState(0);
    const [preview, setPreview] = useState<{ r: number; c: number } | null>(null);

    // ── Rewarded Ad ──
    const [rerollLoading, setRerollLoading] = useState(false);

    // ── Couleurs des cellules sur la grille (stockées séparément) ──
    const [gridColors, setGridColors] = useState<(string | null)[][]>(
        () => Array.from({ length: GRID }, () => Array(GRID).fill(null))
    );

    const selectedPiece = selectedIdx !== null ? pieces[selectedIdx] : null;

    // ── Vérifier si le jeu est terminé ──
    const checkGameOver = useCallback((newGrid: number[][], newPieces: (Piece | null)[]) => {
        const remaining = newPieces.filter(p => p !== null) as Piece[];
        if (remaining.length === 0) return false; // Toutes placées → on régénère
        const stuck = remaining.every(p => !canFitAnywhere(newGrid, p.shape));
        if (stuck) {
            setGameOver(true);
            onGameEnd?.();
            return true;
        }
        return false;
    }, [onGameEnd]);

    // ── Effacer les lignes/colonnes pleines ──
    const clearLines = useCallback((newGrid: number[][], newColors: (string | null)[][]) => {
        let cleared = 0;

        // Lignes
        for (let r = 0; r < GRID; r++) {
            if (newGrid[r].every(cell => cell !== 0)) {
                newGrid[r].fill(0);
                newColors[r].fill(null);
                cleared++;
            }
        }

        // Colonnes
        for (let c = 0; c < GRID; c++) {
            if (newGrid.every(row => row[c] !== 0)) {
                for (let r = 0; r < GRID; r++) {
                    newGrid[r][c] = 0;
                    newColors[r][c] = null;
                }
                cleared++;
            }
        }

        return cleared;
    }, []);

    // ── Placer une pièce ──
    const handleGridPress = useCallback((row: number, col: number) => {
        if (gameOver || !selectedPiece) return;

        const norm = normalizeShape(selectedPiece.shape);
        if (!canPlace(grid, selectedPiece.shape, row, col)) return;

        const newGrid = grid.map(r => [...r]);
        const newColors = gridColors.map(r => [...r]);

        // Placer
        for (const [dr, dc] of norm) {
            newGrid[row + dr][col + dc] = 1;
            newColors[row + dr][col + dc] = selectedPiece.palette.bg;
        }

        // Effacer les lignes/colonnes
        const cleared = clearLines(newGrid, newColors);
        const placeScore = norm.length;
        const lineBonus = cleared * GRID * 2;

        setGrid(newGrid);
        setGridColors(newColors);
        setScore(s => {
            const newScore = s + placeScore + lineBonus;
            setBestScore(b => Math.max(b, newScore));
            return newScore;
        });
        setLinesCleared(l => l + cleared);

        // Retirer la pièce utilisée
        const newPieces = [...pieces];
        newPieces[selectedIdx!] = null;

        // Si toutes les pièces sont placées → en générer 3 nouvelles
        const allPlaced = newPieces.every(p => p === null);
        const nextPieces = allPlaced ? generateThreePieces() : newPieces;

        setPieces(nextPieces);
        setSelectedIdx(null);
        setPreview(null);

        // Vérifier game over
        checkGameOver(newGrid, nextPieces);
    }, [gameOver, selectedPiece, grid, gridColors, pieces, selectedIdx, clearLines, checkGameOver]);

    // ── Prévisualisation sur hover ──
    const handleGridHover = useCallback((row: number, col: number) => {
        if (!selectedPiece) return;
        if (canPlace(grid, selectedPiece.shape, row, col)) {
            setPreview({ r: row, c: col });
        } else {
            setPreview(null);
        }
    }, [selectedPiece, grid]);

    // ── Sélection d'une pièce ──
    const handlePieceSelect = (idx: number) => {
        if (gameOver || !pieces[idx]) return;
        setSelectedIdx(selectedIdx === idx ? null : idx);
        setPreview(null);
    };

    // ── Reroll (Rewarded Ad) ──
    const handleReroll = useCallback(() => {
        if (gameOver || rerollLoading) return;
        setRerollLoading(true);
        setTimeout(() => {
            setRerollLoading(false);
            const newPieces = generateThreePieces();
            setPieces(newPieces);
            setSelectedIdx(null);
            setPreview(null);
        }, 2000);
    }, [gameOver, rerollLoading]);

    // ── Restart ──
    const handleRestart = () => {
        setGrid(createEmptyGrid());
        setGridColors(Array.from({ length: GRID }, () => Array(GRID).fill(null)));
        setPieces(generateThreePieces());
        setSelectedIdx(null);
        setScore(0);
        setGameOver(false);
        setLinesCleared(0);
        setPreview(null);
    };

    // ── Preview cells (pour la grille) ──
    const previewCells = useMemo(() => {
        if (!selectedPiece || !preview) return new Set<string>();
        const norm = normalizeShape(selectedPiece.shape);
        const cells = new Set<string>();
        for (const [dr, dc] of norm) {
            cells.add(`${preview.r + dr},${preview.c + dc}`);
        }
        return cells;
    }, [selectedPiece, preview]);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── Score ── */}
            <View style={st.scoreRow}>
                <View style={st.scorePill}>
                    <Text style={st.scoreLabel}>SCORE</Text>
                    <Text style={st.scoreValue}>{score}</Text>
                </View>
                <View style={st.scorePill}>
                    <Text style={st.scoreLabel}>RECORD</Text>
                    <Text style={st.scoreValue}>{bestScore}</Text>
                </View>
                <View style={st.scorePill}>
                    <Text style={st.scoreLabel}>LIGNES</Text>
                    <Text style={st.scoreValue}>{linesCleared}</Text>
                </View>
            </View>

            {/* ── Game Over ── */}
            {gameOver && (
                <View style={st.gameOverBanner}>
                    <Text style={st.gameOverText}>⚡ Plus de place ! Score : {score}</Text>
                </View>
            )}

            {/* ── Grille 10×10 ── */}
            <View style={st.gridContainer}>
                {grid.map((row, r) => (
                    <View key={r} style={st.gridRow}>
                        {row.map((cell, c) => {
                            const color = gridColors[r][c];
                            const isPrev = previewCells.has(`${r},${c}`);

                            return (
                                <Pressable
                                    key={c}
                                    onPress={() => handleGridPress(r, c)}
                                    onHoverIn={() => handleGridHover(r, c)}
                                    onHoverOut={() => setPreview(null)}
                                    style={[
                                        st.cell,
                                        cell !== 0 && color
                                            ? { backgroundColor: color, borderColor: lighten(color) }
                                            : null,
                                        cell !== 0 && st.cellFilled,
                                        isPrev && st.cellPreview,
                                    ]}
                                >
                                    {cell !== 0 && (
                                        <View style={st.solarLine} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* ── Instruction ── */}
            {!gameOver && (
                <Text style={st.instruction}>
                    {selectedPiece
                        ? '👆 Cliquez sur la grille pour poser le bloc'
                        : '👇 Choisissez un bloc à placer'}
                </Text>
            )}

            {/* ── 3 Pièces à placer ── */}
            <View style={st.piecesRow}>
                {pieces.map((piece, idx) => (
                    <Pressable
                        key={idx}
                        onPress={() => handlePieceSelect(idx)}
                        style={[
                            st.pieceSlot,
                            selectedIdx === idx && st.pieceSlotSelected,
                            !piece && st.pieceSlotEmpty,
                        ]}
                    >
                        {piece ? (
                            <View style={st.piecePreview}>
                                {renderPiecePreview(piece)}
                            </View>
                        ) : (
                            <Text style={st.pieceCheckmark}>✓</Text>
                        )}
                    </Pressable>
                ))}
            </View>

            {/* ── Bouton Reroll (Rewarded Ad) ── */}
            {!gameOver && (
                <Pressable
                    onPress={handleReroll}
                    disabled={rerollLoading}
                    style={[st.rerollBtn, rerollLoading && st.rerollBtnDisabled]}
                >
                    <Text style={st.rerollBtnText}>
                        {rerollLoading
                            ? '📺 Chargement de la pub…'
                            : '🔄 Changer les 3 blocs (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Restart ── */}
            <Pressable onPress={handleRestart} style={st.restartBtn}>
                <Text style={st.restartText}>🔄 Nouvelle partie</Text>
            </Pressable>

            <Text style={st.ecoNote}>Les revenus financent des panneaux solaires 🌱</Text>
        </View>
    );
}

// ── Éclaircir une couleur hex ──
function lighten(hex: string): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xFF) + 50);
    const g = Math.min(255, ((num >> 8) & 0xFF) + 50);
    const b = Math.min(255, (num & 0xFF) + 50);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}

// ── Rendu mini d'une pièce dans le sélecteur ──
function renderPiecePreview(piece: Piece) {
    const norm = normalizeShape(piece.shape);
    const { rows, cols } = shapeBounds(piece.shape);
    const miniSize = 14;

    return (
        <View style={{ width: cols * miniSize, height: rows * miniSize }}>
            {Array.from({ length: rows }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row' }}>
                    {Array.from({ length: cols }).map((_, c) => {
                        const filled = norm.some(([pr, pc]) => pr === r && pc === c);
                        return (
                            <View
                                key={c}
                                style={{
                                    width: miniSize,
                                    height: miniSize,
                                    backgroundColor: filled ? piece.palette.bg : 'transparent',
                                    borderWidth: filled ? 1 : 0,
                                    borderColor: filled ? piece.palette.border : 'transparent',
                                    borderRadius: 2,
                                }}
                            />
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const CELL_SZ = 30;

const st = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.sm,
        width: '100%',
    },

    // ── Score ──
    scoreRow: { flexDirection: 'row', gap: Spacing.sm },
    scorePill: {
        backgroundColor: '#0D1117', borderRadius: BorderRadius.md,
        paddingVertical: 3, paddingHorizontal: Spacing.md,
        alignItems: 'center', borderWidth: 1, borderColor: '#1A2744',
    },
    scoreLabel: { fontSize: 8, color: '#4A6FA5', fontWeight: '700', letterSpacing: 1 },
    scoreValue: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.solarGold },

    // ── Game Over ──
    gameOverBanner: {
        backgroundColor: Colors.error + '18',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.error + '60',
    },
    gameOverText: { fontWeight: '800', fontSize: FontSizes.sm, color: Colors.textPrimary, textAlign: 'center' },

    // ── Grille ──
    gridContainer: {
        borderWidth: 2,
        borderColor: '#2D4F7A',
        borderRadius: 4,
        backgroundColor: '#0A0F1A',
        padding: 1,
    },
    gridRow: { flexDirection: 'row' },
    cell: {
        width: CELL_SZ,
        height: CELL_SZ,
        borderWidth: 0.5,
        borderColor: '#1A2744',
        backgroundColor: '#0D1520',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    cellFilled: {
        borderWidth: 1,
    },
    cellPreview: {
        backgroundColor: '#4A6FA540',
        borderColor: '#6A9BC580',
        borderWidth: 1,
    },
    // Ligne décorative "panneau solaire"
    solarLine: {
        position: 'absolute',
        top: '48%' as any,
        left: 2,
        right: 2,
        height: 1,
        backgroundColor: '#FFFFFF18',
    },

    // ── Instruction ──
    instruction: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
    },

    // ── Pièces ──
    piecesRow: { flexDirection: 'row', gap: Spacing.md },
    pieceSlot: {
        width: 80,
        height: 80,
        borderRadius: BorderRadius.md,
        backgroundColor: '#0D1520',
        borderWidth: 1,
        borderColor: '#1A2744',
        alignItems: 'center',
        justifyContent: 'center',
    },
    pieceSlotSelected: {
        borderColor: Colors.solarGold,
        borderWidth: 2,
        backgroundColor: Colors.solarGold + '10',
        shadowColor: Colors.solarGold,
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    pieceSlotEmpty: { opacity: 0.3 },
    piecePreview: { alignItems: 'center', justifyContent: 'center' },
    pieceCheckmark: { fontSize: 20, color: Colors.ecoGreen },

    // ── Reroll ──
    rerollBtn: {
        backgroundColor: Colors.solarGold + '18',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        maxWidth: 320,
        alignItems: 'center',
    },
    rerollBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    rerollBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Restart ──
    restartBtn: {
        backgroundColor: '#1A274415',
        paddingVertical: Spacing.xs + 2,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: '#2D4F7A50',
    },
    restartText: { color: '#4A6FA5', fontWeight: '700', fontSize: FontSizes.xs },

    ecoNote: { fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
