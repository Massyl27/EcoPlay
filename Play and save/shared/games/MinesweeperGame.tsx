import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════
// 💣 Démineur — Jeu complet
// ══════════════════════════════════════════════

const ROWS = 9;
const COLS = 9;
const MINES = 10;

interface Cell {
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
}

type Board = Cell[][];

/** Crée un plateau avec des mines placées aléatoirement */
function createBoard(safeRow?: number, safeCol?: number): Board {
    const board: Board = Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            adjacentMines: 0,
        }))
    );

    // Placer les mines
    let placed = 0;
    while (placed < MINES) {
        const r = Math.floor(Math.random() * ROWS);
        const c = Math.floor(Math.random() * COLS);
        // Ne pas placer de mine sur la case de départ ni sur une mine existante
        if (
            !board[r][c].isMine &&
            !(safeRow !== undefined && Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol!) <= 1)
        ) {
            board[r][c].isMine = true;
            placed++;
        }
    }

    // Compter les mines adjacentes
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c].isMine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) {
                        count++;
                    }
                }
            }
            board[r][c].adjacentMines = count;
        }
    }

    return board;
}

/** Révèle en cascade les cellules vides (flood fill) */
function floodReveal(board: Board, row: number, col: number): Board {
    const newBoard = board.map((r) => r.map((c) => ({ ...c })));
    const queue: [number, number][] = [[row, col]];

    while (queue.length > 0) {
        const [r, c] = queue.shift()!;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        if (newBoard[r][c].isRevealed || newBoard[r][c].isFlagged) continue;

        newBoard[r][c].isRevealed = true;

        if (newBoard[r][c].adjacentMines === 0 && !newBoard[r][c].isMine) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr !== 0 || dc !== 0) {
                        queue.push([r + dr, c + dc]);
                    }
                }
            }
        }
    }

    return newBoard;
}

/** Vérifie si le joueur a gagné */
function checkWin(board: Board): boolean {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (!board[r][c].isMine && !board[r][c].isRevealed) return false;
        }
    }
    return true;
}

/** Couleurs des chiffres */
const NUMBER_COLORS: Record<number, string> = {
    1: '#3B82F6',
    2: '#2ECC71',
    3: '#E74C3C',
    4: '#9B59B6',
    5: '#E67E22',
    6: '#1ABC9C',
    7: '#34495E',
    8: '#95A5A6',
};

interface MinesweeperGameProps {
    onGameEnd?: () => void;
}

export function MinesweeperGame({ onGameEnd }: MinesweeperGameProps) {
    const [board, setBoard] = useState<Board | null>(null);
    const [gameState, setGameState] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready');
    const [flagMode, setFlagMode] = useState(false);



    const getFlagCount = useCallback(() => {
        if (!board) return 0;
        let count = 0;
        board.forEach(row => row.forEach(cell => { if (cell.isFlagged) count++; }));
        return count;
    }, [board]);

    const handleCellPress = useCallback(
        (row: number, col: number) => {
            if (gameState === 'won' || gameState === 'lost') return;

            let currentBoard = board;

            // Premier clic — générer le plateau avec zone safe
            if (gameState === 'ready' || !currentBoard) {
                currentBoard = createBoard(row, col);
                setGameState('playing');
            }

            const cell = currentBoard[row][col];

            // Mode drapeau
            if (flagMode) {
                if (cell.isRevealed) return;
                const newBoard = currentBoard.map((r) => r.map((c) => ({ ...c })));
                newBoard[row][col].isFlagged = !newBoard[row][col].isFlagged;
                setBoard(newBoard);
                return;
            }

            // Case déjà révélée ou marquée
            if (cell.isRevealed || cell.isFlagged) return;

            // Mine ! 💥
            if (cell.isMine) {
                const newBoard = currentBoard.map((r) =>
                    r.map((c) => ({
                        ...c,
                        isRevealed: c.isMine ? true : c.isRevealed,
                    }))
                );
                newBoard[row][col].isRevealed = true;
                setBoard(newBoard);
                setGameState('lost');
                return;
            }

            // Révéler la case (+ flood fill si vide)
            const newBoard = floodReveal(currentBoard, row, col);
            setBoard(newBoard);

            // Vérifier victoire
            if (checkWin(newBoard)) {
                setGameState('won');
                onGameEnd?.();
            }
        },
        [board, gameState, flagMode, onGameEnd]
    );

    const handleRestart = () => {
        setBoard(null);
        setGameState('ready');
        setFlagMode(false);
    };

    // Grille d'affichage (vide avant le premier clic)
    const displayBoard: Board = board || createDisplayBoard();

    return (
        <View style={styles.container}>
            {/* Status bar */}
            <View style={styles.statusBar}>
                <View style={styles.statusItem}>
                    <Text style={styles.statusEmoji}>💣</Text>
                    <Text style={styles.statusValue}>
                        {MINES - getFlagCount()}
                    </Text>
                </View>

                <Pressable
                    onPress={() => setFlagMode(!flagMode)}
                    style={[
                        styles.flagToggle,
                        flagMode && styles.flagToggleActive,
                    ]}
                >
                    <Text style={styles.flagToggleText}>
                        {flagMode ? '🚩 Drapeau' : '👆 Révéler'}
                    </Text>
                </Pressable>

                <View style={styles.statusItem}>
                    <Text style={styles.statusEmoji}>
                        {gameState === 'won' ? '😎' : gameState === 'lost' ? '😵' : '🙂'}
                    </Text>
                </View>
            </View>

            {/* Grille */}
            <View style={styles.grid}>
                {displayBoard.map((row, r) => (
                    <View key={r} style={styles.row}>
                        {row.map((cell, c) => (
                            <Pressable
                                key={c}
                                onPress={() => handleCellPress(r, c)}
                                onLongPress={() => {
                                    // Long press = drapeau sur mobile
                                    if (gameState === 'won' || gameState === 'lost') return;
                                    if (!board) return;
                                    if (cell.isRevealed) return;
                                    const newBoard = board.map((r) => r.map((c) => ({ ...c })));
                                    newBoard[r][c].isFlagged = !newBoard[r][c].isFlagged;
                                    setBoard(newBoard);
                                }}
                                style={[
                                    styles.cell,
                                    cell.isRevealed && styles.cellRevealed,
                                    cell.isRevealed && cell.isMine && styles.cellMine,
                                ]}
                            >
                                <Text style={styles.cellContent}>
                                    {cell.isFlagged
                                        ? '🚩'
                                        : cell.isRevealed
                                            ? cell.isMine
                                                ? '💣'
                                                : cell.adjacentMines > 0
                                                    ? ''
                                                    : ''
                                            : ''}
                                </Text>
                                {cell.isRevealed &&
                                    !cell.isMine &&
                                    cell.adjacentMines > 0 && (
                                        <Text
                                            style={[
                                                styles.cellNumber,
                                                { color: NUMBER_COLORS[cell.adjacentMines] || Colors.textPrimary },
                                            ]}
                                        >
                                            {cell.adjacentMines}
                                        </Text>
                                    )}
                            </Pressable>
                        ))}
                    </View>
                ))}
            </View>

            {/* Message de fin */}
            {(gameState === 'won' || gameState === 'lost') && (
                <View
                    style={[
                        styles.endBanner,
                        gameState === 'won' ? styles.endBannerWon : styles.endBannerLost,
                    ]}
                >
                    <Text style={styles.endText}>
                        {gameState === 'won'
                            ? '🎉 Bravo ! Toutes les mines trouvées !'
                            : '💥 Boom ! Vous avez touché une mine.'}
                    </Text>
                </View>
            )}

            {/* Restart */}
            <Pressable onPress={handleRestart} style={styles.restartBtn}>
                <Text style={styles.restartText}>🔄 Nouvelle partie</Text>
            </Pressable>

            {gameState === 'ready' && (
                <Text style={styles.hint}>
                    Touchez une case pour commencer. Appui long = drapeau.
                </Text>
            )}
        </View>
    );
}

/** Grille vide pour l'affichage avant le premier clic */
function createDisplayBoard(): Board {
    return Array.from({ length: ROWS }, () =>
        Array.from({ length: COLS }, () => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            adjacentMines: 0,
        }))
    );
}

const CELL_SIZE = 34;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.md,
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: CELL_SIZE * COLS + (COLS - 1) * 2,
        gap: Spacing.sm,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        backgroundColor: Colors.surface,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.sm,
        borderRadius: BorderRadius.sm,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statusEmoji: {
        fontSize: 20,
    },
    statusValue: {
        fontSize: FontSizes.md,
        fontWeight: '800',
        color: Colors.solarGold,
    },
    flagToggle: {
        backgroundColor: Colors.surface,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    flagToggleActive: {
        backgroundColor: Colors.solarGold + '20',
        borderColor: Colors.solarGold,
    },
    flagToggleText: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    grid: {
        borderRadius: BorderRadius.sm,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.solarGold + '60',
    },
    row: {
        flexDirection: 'row',
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surfaceLight,
        borderWidth: 0.5,
        borderColor: Colors.border,
    },
    cellRevealed: {
        backgroundColor: Colors.surface,
    },
    cellMine: {
        backgroundColor: Colors.error + '30',
    },
    cellContent: {
        fontSize: 16,
        position: 'absolute',
    },
    cellNumber: {
        fontSize: FontSizes.md,
        fontWeight: '800',
    },
    endBanner: {
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        maxWidth: CELL_SIZE * COLS + 20,
    },
    endBannerWon: {
        backgroundColor: Colors.ecoGreen + '20',
        borderColor: Colors.ecoGreen,
    },
    endBannerLost: {
        backgroundColor: Colors.error + '20',
        borderColor: Colors.error,
    },
    endText: {
        fontWeight: '700',
        fontSize: FontSizes.sm,
        color: Colors.textPrimary,
        textAlign: 'center',
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
        textAlign: 'center',
    },
});
