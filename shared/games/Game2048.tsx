import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════
// 🎯 2048 — Jeu complet
// ══════════════════════════════════════════════

type Grid = number[][];

const GRID_SIZE = 4;

/** Couleurs des tuiles */
const TILE_COLORS: Record<number, { bg: string; text: string }> = {
    0: { bg: Colors.surfaceLight, text: 'transparent' },
    2: { bg: '#EEE4DA', text: '#776E65' },
    4: { bg: '#EDE0C8', text: '#776E65' },
    8: { bg: '#F2B179', text: '#F9F6F2' },
    16: { bg: '#F59563', text: '#F9F6F2' },
    32: { bg: '#F67C5F', text: '#F9F6F2' },
    64: { bg: '#F65E3B', text: '#F9F6F2' },
    128: { bg: '#EDCF72', text: '#F9F6F2' },
    256: { bg: '#EDCC61', text: '#F9F6F2' },
    512: { bg: '#EDC850', text: '#F9F6F2' },
    1024: { bg: '#EDC53F', text: '#F9F6F2' },
    2048: { bg: '#EDC22E', text: '#F9F6F2' },
};

function getTileColor(val: number) {
    return TILE_COLORS[val] || { bg: '#3C3A32', text: '#F9F6F2' };
}

/** Crée une grille vide */
function createEmptyGrid(): Grid {
    return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

/** Ajoute une tuile aléatoire (2 ou 4) */
function addRandomTile(grid: Grid): Grid {
    const newGrid = grid.map((r) => [...r]);
    const empty: [number, number][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (newGrid[r][c] === 0) empty.push([r, c]);
        }
    }
    if (empty.length === 0) return newGrid;
    const [row, col] = empty[Math.floor(Math.random() * empty.length)];
    newGrid[row][col] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
}

/** Fait glisser une ligne vers la gauche et fusionne */
function slideRow(row: number[]): { newRow: number[]; score: number } {
    let filtered = row.filter((v) => v !== 0);
    let score = 0;
    for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
            filtered[i] *= 2;
            score += filtered[i];
            filtered[i + 1] = 0;
        }
    }
    filtered = filtered.filter((v) => v !== 0);
    while (filtered.length < GRID_SIZE) filtered.push(0);
    return { newRow: filtered, score };
}

/** Déplace la grille dans une direction */
function move(
    grid: Grid,
    direction: 'left' | 'right' | 'up' | 'down'
): { newGrid: Grid; scoreDelta: number; moved: boolean } {
    let rotated = grid.map((r) => [...r]);
    let totalScore = 0;

    // Convertir en mouvement gauche
    if (direction === 'right') {
        rotated = rotated.map((r) => [...r].reverse());
    } else if (direction === 'up') {
        rotated = transpose(rotated);
    } else if (direction === 'down') {
        rotated = transpose(rotated).map((r) => [...r].reverse());
    }

    // Appliquer le slide sur chaque ligne
    const result = rotated.map((row) => {
        const { newRow, score } = slideRow(row);
        totalScore += score;
        return newRow;
    });

    // Reconvertir
    let final = result;
    if (direction === 'right') {
        final = result.map((r) => [...r].reverse());
    } else if (direction === 'up') {
        final = transpose(result);
    } else if (direction === 'down') {
        final = transpose(result.map((r) => [...r].reverse()));
    }

    const moved = JSON.stringify(final) !== JSON.stringify(grid);
    return { newGrid: final, scoreDelta: totalScore, moved };
}

function transpose(grid: Grid): Grid {
    return grid[0].map((_, c) => grid.map((r) => r[c]));
}

/** Vérifie si le jeu est terminé (plus de mouvements possible) */
function isGameOver(grid: Grid): boolean {
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (grid[r][c] === 0) return false;
            if (c < GRID_SIZE - 1 && grid[r][c] === grid[r][c + 1]) return false;
            if (r < GRID_SIZE - 1 && grid[r][c] === grid[r + 1][c]) return false;
        }
    }
    return true;
}

/** Vérifie si 2048 est atteint */
function hasWon(grid: Grid): boolean {
    return grid.some((row) => row.some((val) => val >= 2048));
}

/** Initialise le jeu */
function initGame(): Grid {
    let grid = createEmptyGrid();
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);
    return grid;
}

interface Game2048Props {
    onGameEnd?: () => void;
}

export function Game2048({ onGameEnd }: Game2048Props) {
    const [grid, setGrid] = useState<Grid>(initGame);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [won, setWon] = useState(false);

    // Gestion du swipe / touches
    const touchStart = useRef<{ x: number; y: number } | null>(null);

    const handleMove = useCallback(
        (direction: 'left' | 'right' | 'up' | 'down') => {
            if (gameOver) return;
            const { newGrid, scoreDelta, moved } = move(grid, direction);
            if (!moved) return;

            const withNew = addRandomTile(newGrid);
            const newScore = score + scoreDelta;
            setGrid(withNew);
            setScore(newScore);
            if (newScore > bestScore) setBestScore(newScore);

            if (hasWon(withNew) && !won) {
                setWon(true);
                onGameEnd?.();
            }
            if (isGameOver(withNew)) {
                setGameOver(true);
            }
        },
        [grid, score, bestScore, gameOver, won, onGameEnd]
    );

    // Clavier (Web)
    useEffect(() => {
        if (Platform.OS !== 'web') return;
        const handleKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft': e.preventDefault(); handleMove('left'); break;
                case 'ArrowRight': e.preventDefault(); handleMove('right'); break;
                case 'ArrowUp': e.preventDefault(); handleMove('up'); break;
                case 'ArrowDown': e.preventDefault(); handleMove('down'); break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleMove]);

    const handleRestart = () => {
        setGrid(initGame());
        setScore(0);
        setGameOver(false);
        setWon(false);
    };

    // Touch handlers pour le swipe
    const onTouchStart = (e: any) => {
        const touch = e.nativeEvent;
        touchStart.current = { x: touch.pageX, y: touch.pageY };
    };

    const onTouchEnd = (e: any) => {
        if (!touchStart.current) return;
        const touch = e.nativeEvent;
        const dx = touch.pageX - touchStart.current.x;
        const dy = touch.pageY - touchStart.current.y;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) < 30) return; // Trop petit

        if (absDx > absDy) {
            handleMove(dx > 0 ? 'right' : 'left');
        } else {
            handleMove(dy > 0 ? 'down' : 'up');
        }
        touchStart.current = null;
    };

    return (
        <View style={styles.container}>
            {/* Scores */}
            <View style={styles.scoreRow}>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>SCORE</Text>
                    <Text style={styles.scoreValue}>{score}</Text>
                </View>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>MEILLEUR</Text>
                    <Text style={styles.scoreValue}>{bestScore}</Text>
                </View>
            </View>

            {/* Grille */}
            <View
                style={styles.gridContainer}
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
                // @ts-ignore — pour le web
                onPointerDown={onTouchStart}
                onPointerUp={onTouchEnd}
            >
                {grid.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((val, c) => {
                            const color = getTileColor(val);
                            return (
                                <View
                                    key={c}
                                    style={[styles.tile, { backgroundColor: color.bg }]}
                                >
                                    {val > 0 && (
                                        <Text
                                            style={[
                                                styles.tileText,
                                                { color: color.text },
                                                val >= 100 && styles.tileTextSmall,
                                                val >= 1000 && styles.tileTextTiny,
                                            ]}
                                        >
                                            {val}
                                        </Text>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                ))}

                {/* Overlay game over / win */}
                {(gameOver || won) && (
                    <View style={styles.overlay}>
                        <Text style={styles.overlayText}>
                            {won ? '🎉 2048 !' : '😢 Game Over'}
                        </Text>
                        <Text style={styles.overlayScore}>Score : {score}</Text>
                    </View>
                )}
            </View>

            {/* Contrôles mobile */}
            <View style={styles.controls}>
                <View style={styles.controlRow}>
                    <View style={styles.controlSpacer} />
                    <Pressable onPress={() => handleMove('up')} style={styles.controlBtn}>
                        <Text style={styles.controlText}>▲</Text>
                    </Pressable>
                    <View style={styles.controlSpacer} />
                </View>
                <View style={styles.controlRow}>
                    <Pressable onPress={() => handleMove('left')} style={styles.controlBtn}>
                        <Text style={styles.controlText}>◀</Text>
                    </Pressable>
                    <Pressable onPress={() => handleMove('down')} style={styles.controlBtn}>
                        <Text style={styles.controlText}>▼</Text>
                    </Pressable>
                    <Pressable onPress={() => handleMove('right')} style={styles.controlBtn}>
                        <Text style={styles.controlText}>▶</Text>
                    </Pressable>
                </View>
            </View>

            {/* Bouton restart */}
            <Pressable onPress={handleRestart} style={styles.restartBtn}>
                <Text style={styles.restartText}>🔄 Nouvelle partie</Text>
            </Pressable>

            {Platform.OS === 'web' && (
                <Text style={styles.hint}>
                    Utilisez les touches ← ↑ → ↓ ou swipez
                </Text>
            )}
        </View>
    );
}

const TILE_SIZE = 72;
const TILE_GAP = 6;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.md,
    },
    scoreRow: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    scoreBox: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        minWidth: 100,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    scoreLabel: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        fontWeight: '700',
        letterSpacing: 1,
    },
    scoreValue: {
        fontSize: FontSizes.xl,
        fontWeight: '900',
        color: Colors.solarGold,
    },
    gridContainer: {
        backgroundColor: Colors.card,
        borderRadius: BorderRadius.md,
        padding: TILE_GAP,
        position: 'relative',
    },
    row: {
        flexDirection: 'row',
    },
    tile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        margin: TILE_GAP / 2,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tileText: {
        fontSize: 24,
        fontWeight: '800',
    },
    tileTextSmall: {
        fontSize: 20,
    },
    tileTextTiny: {
        fontSize: 16,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13, 17, 23, 0.85)',
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    overlayText: {
        fontSize: FontSizes.xxl,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    overlayScore: {
        fontSize: FontSizes.lg,
        color: Colors.solarGold,
        fontWeight: '700',
    },
    controls: {
        gap: Spacing.xs,
    },
    controlRow: {
        flexDirection: 'row',
        gap: Spacing.xs,
        justifyContent: 'center',
    },
    controlSpacer: {
        width: 52,
        height: 44,
    },
    controlBtn: {
        width: 52,
        height: 44,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    controlText: {
        fontSize: 18,
        color: Colors.textPrimary,
    },
    restartBtn: {
        backgroundColor: Colors.solarGold + '20',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.solarGold + '40',
    },
    restartText: {
        color: Colors.solarGold,
        fontWeight: '700',
        fontSize: FontSizes.sm,
    },
    hint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
    },
});
