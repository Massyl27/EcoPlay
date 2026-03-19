import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════
// 🔢 Sudoku — Jeu complet
// ══════════════════════════════════════════════

type Board = (number | null)[][];

/** Vérifie si un nombre peut être placé à une position */
function isValid(board: Board, row: number, col: number, num: number): boolean {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num) return false;
        if (board[i][col] === num) return false;
    }
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
            if (board[r][c] === num) return false;
        }
    }
    return true;
}

/** Résout le sudoku par backtracking */
function solve(board: Board): boolean {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === null) {
                const nums = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (const num of nums) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (solve(board)) return true;
                        board[r][c] = null;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function shuffleArray<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Génère une grille de Sudoku avec des cases vides */
function generatePuzzle(clues: number = 35): { puzzle: Board; solution: Board } {
    const board: Board = Array.from({ length: 9 }, () => Array(9).fill(null));
    solve(board);
    const solution: Board = board.map((r) => [...r]);

    const puzzle: Board = board.map((r) => [...r]);
    const positions = shuffleArray(
        Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9])
    );
    let removed = 0;
    for (const [r, c] of positions) {
        if (removed >= 81 - clues) break;
        puzzle[r][c] = null;
        removed++;
    }

    return { puzzle, solution };
}

/** Vérifie si la grille est complète et correcte */
function isBoardComplete(board: Board, solution: Board): boolean {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] !== solution[r][c]) return false;
        }
    }
    return true;
}

interface SudokuGameProps {
    onGameEnd?: () => void;
}

export function SudokuGame({ onGameEnd }: SudokuGameProps) {
    const { puzzle, solution } = useMemo(() => generatePuzzle(35), []);
    const [board, setBoard] = useState<Board>(() => puzzle.map((r) => [...r]));
    const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
    const [errors, setErrors] = useState<Set<string>>(new Set());
    const [won, setWon] = useState(false);

    // Cellules initiales (non modifiables)
    const initialCells = useMemo(() => {
        const set = new Set<string>();
        puzzle.forEach((row, r) =>
            row.forEach((val, c) => {
                if (val !== null) set.add(`${r}-${c}`);
            })
        );
        return set;
    }, [puzzle]);

    const handleCellPress = useCallback(
        (row: number, col: number) => {
            if (won) return;
            if (initialCells.has(`${row}-${col}`)) return;
            setSelectedCell([row, col]);
        },
        [initialCells, won]
    );

    const handleNumberPress = useCallback(
        (num: number | null) => {
            if (!selectedCell || won) return;
            const [row, col] = selectedCell;
            if (initialCells.has(`${row}-${col}`)) return;

            const newBoard = board.map((r) => [...r]);
            newBoard[row][col] = num;
            setBoard(newBoard);

            // Vérifier les erreurs
            const newErrors = new Set<string>();
            for (let r = 0; r < 9; r++) {
                for (let c = 0; c < 9; c++) {
                    if (newBoard[r][c] !== null && newBoard[r][c] !== solution[r][c]) {
                        newErrors.add(`${r}-${c}`);
                    }
                }
            }
            setErrors(newErrors);

            // Vérifier la victoire
            if (num !== null && isBoardComplete(newBoard, solution)) {
                setWon(true);
                onGameEnd?.();
            }
        },
        [selectedCell, board, solution, initialCells, won, onGameEnd]
    );

    const isInSameGroup = (r: number, c: number) => {
        if (!selectedCell) return false;
        const [sr, sc] = selectedCell;
        return (
            r === sr ||
            c === sc ||
            (Math.floor(r / 3) === Math.floor(sr / 3) &&
                Math.floor(c / 3) === Math.floor(sc / 3))
        );
    };

    return (
        <View style={styles.container}>
            {won && (
                <View style={styles.winBanner}>
                    <Text style={styles.winText}>🎉 Bravo ! Sudoku résolu !</Text>
                </View>
            )}

            {/* Grille */}
            <View style={styles.grid}>
                {board.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((val, c) => {
                            const isSelected =
                                selectedCell?.[0] === r && selectedCell?.[1] === c;
                            const isInitial = initialCells.has(`${r}-${c}`);
                            const isError = errors.has(`${r}-${c}`);
                            const isHighlighted = isInSameGroup(r, c);

                            return (
                                <Pressable
                                    key={c}
                                    onPress={() => handleCellPress(r, c)}
                                    style={[
                                        styles.cell,
                                        isHighlighted && styles.cellHighlighted,
                                        isSelected && styles.cellSelected,
                                        isError && styles.cellError,
                                        c % 3 === 2 && c !== 8 && styles.cellBorderRight,
                                        r % 3 === 2 && r !== 8 && styles.cellBorderBottom,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.cellText,
                                            isInitial && styles.cellTextInitial,
                                            !isInitial && styles.cellTextUser,
                                            isError && styles.cellTextError,
                                        ]}
                                    >
                                        {val ?? ''}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* Clavier numérique */}
            <View style={styles.numPad}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <Pressable
                        key={num}
                        onPress={() => handleNumberPress(num)}
                        style={({ pressed }) => [
                            styles.numButton,
                            pressed && styles.numButtonPressed,
                        ]}
                    >
                        <Text style={styles.numButtonText}>{num}</Text>
                    </Pressable>
                ))}
                <Pressable
                    onPress={() => handleNumberPress(null)}
                    style={({ pressed }) => [
                        styles.numButton,
                        styles.eraseButton,
                        pressed && styles.numButtonPressed,
                    ]}
                >
                    <Text style={styles.eraseButtonText}>✕</Text>
                </Pressable>
            </View>
        </View>
    );
}

const CELL_SIZE = 36;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.lg,
    },
    winBanner: {
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.ecoGreen,
    },
    winText: {
        color: Colors.ecoGreen,
        fontWeight: '800',
        fontSize: FontSizes.md,
        textAlign: 'center',
    },
    grid: {
        borderWidth: 2,
        borderColor: Colors.solarGold,
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 0.5,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    cellHighlighted: {
        backgroundColor: Colors.surfaceLight,
    },
    cellSelected: {
        backgroundColor: Colors.solarGold + '30',
    },
    cellError: {
        backgroundColor: Colors.error + '20',
    },
    cellBorderRight: {
        borderRightWidth: 2,
        borderRightColor: Colors.solarGold + '80',
    },
    cellBorderBottom: {
        borderBottomWidth: 2,
        borderBottomColor: Colors.solarGold + '80',
    },
    cellText: {
        fontSize: FontSizes.md,
        fontWeight: '600',
    },
    cellTextInitial: {
        color: Colors.textPrimary,
        fontWeight: '800',
    },
    cellTextUser: {
        color: Colors.solarGold,
    },
    cellTextError: {
        color: Colors.error,
    },
    numPad: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.sm,
        maxWidth: CELL_SIZE * 9,
    },
    numButton: {
        width: 42,
        height: 42,
        borderRadius: BorderRadius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    numButtonPressed: {
        backgroundColor: Colors.solarGold + '30',
    },
    numButtonText: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    eraseButton: {
        backgroundColor: Colors.error + '15',
        borderColor: Colors.error + '40',
    },
    eraseButtonText: {
        fontSize: FontSizes.lg,
        fontWeight: '700',
        color: Colors.error,
    },
});
