import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Chess as ChessEngine, Square, Move, PieceSymbol, Color } from 'chess.js';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// ♟️ Échecs — Jeu complet avec chess.js
// ══════════════════════════════════════════════════════════════
//
// • Moteur de règles complet via chess.js (validation, échec, mat, pat, etc.)
// • Plateau custom en React Native (compatible Expo Web)
// • Mode local (1v1 même écran) ou IA aléatoire
// • Surbrillance des cases légales, dernier coup joué
// • Bouton indice via Rewarded Ad simulée
// • Cases : anthracite (foncé) + vert sauge (clair) — Dark Mode
//

// ── PIÈCES UNICODE ───────────────────────────────────────────

const PIECE_CHARS: Record<Color, Record<PieceSymbol, string>> = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

// ── COULEURS DU PLATEAU ──────────────────────────────────────

const BOARD_COLORS = {
    light: '#8FAE80',     // Vert sauge (cases claires)
    dark: '#3A3F3A',      // Gris anthracite (cases foncées)
    selected: '#F5A62360', // Or translucide (sélection)
    legalMove: '#F5A62340', // Or léger (coups légaux)
    lastMove: '#27AE6030', // Vert léger (dernier coup)
    check: '#E74C3C40',    // Rouge léger (échec)
    hint: '#F1C40F60',     // Jaune (indice)
};

// ── COORDONNÉES ──────────────────────────────────────────────

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

function toSquare(row: number, col: number): Square {
    return `${FILES[col]}${RANKS[row]}` as Square;
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface ChessProps {
    onGameEnd?: () => void;
}

export function Chess({ onGameEnd }: ChessProps) {
    // ── État du jeu ──
    const [game, setGame] = useState(() => new ChessEngine());
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [legalMoves, setLegalMoves] = useState<Square[]>([]);
    const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
    const [gameMode, setGameMode] = useState<'local' | 'ai'>('ai');
    const [hintSquare, setHintSquare] = useState<Square | null>(null);
    const [capturedWhite, setCapturedWhite] = useState<string[]>([]);
    const [capturedBlack, setCapturedBlack] = useState<string[]>([]);
    const [updateKey, setUpdateKey] = useState(0);

    // ── Rewarded Ad ──
    const [hintLoading, setHintLoading] = useState(false);

    // ── Forcer un re-render après mutation ──
    const forceUpdate = useCallback(() => setUpdateKey(k => k + 1), []);

    // ── Statut de la partie ──
    const gameStatus = useMemo(() => {
        if (game.isCheckmate()) return game.turn() === 'w' ? 'Échec et mat — Noirs gagnent !' : 'Échec et mat — Blancs gagnent !';
        if (game.isStalemate()) return 'Pat — Match nul';
        if (game.isDraw()) return 'Match nul';
        if (game.isCheck()) return `Échec au ${game.turn() === 'w' ? 'roi blanc' : 'roi noir'} !`;
        return game.turn() === 'w' ? 'Blancs jouent' : 'Noirs jouent';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [updateKey]);

    const isGameOver = game.isGameOver();

    // ── IA : coup aléatoire ──
    const makeAIMove = useCallback(() => {
        if (game.isGameOver()) return;
        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return;

        // Petit délai pour simuler la réflexion
        setTimeout(() => {
            const randomMove = moves[Math.floor(Math.random() * moves.length)];

            // Capturer
            if (randomMove.captured) {
                const piece = PIECE_CHARS['w'][randomMove.captured as PieceSymbol];
                setCapturedWhite(prev => [...prev, piece]);
            }

            game.move(randomMove);
            setLastMove({ from: randomMove.from as Square, to: randomMove.to as Square });
            setSelectedSquare(null);
            setLegalMoves([]);
            setHintSquare(null);
            forceUpdate();

            if (game.isGameOver()) onGameEnd?.();
        }, 400);
    }, [game, forceUpdate, onGameEnd]);

    // ── Clic sur une case ──
    const handleSquarePress = useCallback((row: number, col: number) => {
        if (isGameOver) return;
        // En mode IA, les noirs ne sont pas jouables
        if (gameMode === 'ai' && game.turn() === 'b') return;

        const square = toSquare(row, col);
        const piece = game.get(square);

        // Cas 1 : une pièce est déjà sélectionnée → tenter un coup
        if (selectedSquare) {
            // Sélectionner une autre pièce de la même couleur
            if (piece && piece.color === game.turn()) {
                setSelectedSquare(square);
                const moves = game.moves({ square, verbose: true });
                setLegalMoves(moves.map(m => m.to as Square));
                setHintSquare(null);
                return;
            }

            // Tenter le déplacement
            try {
                const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
                if (move) {
                    // Pièce capturée
                    if (move.captured) {
                        const capturedPiece = PIECE_CHARS[move.color === 'w' ? 'b' : 'w'][move.captured as PieceSymbol];
                        if (move.color === 'w') {
                            setCapturedBlack(prev => [...prev, capturedPiece]);
                        } else {
                            setCapturedWhite(prev => [...prev, capturedPiece]);
                        }
                    }

                    setLastMove({ from: move.from as Square, to: move.to as Square });
                    setSelectedSquare(null);
                    setLegalMoves([]);
                    setHintSquare(null);
                    forceUpdate();

                    if (game.isGameOver()) {
                        onGameEnd?.();
                    } else if (gameMode === 'ai') {
                        makeAIMove();
                    }
                    return;
                }
            } catch {
                // Coup invalide — ignorer
            }

            // Désélectionner
            setSelectedSquare(null);
            setLegalMoves([]);
            return;
        }

        // Cas 2 : rien de sélectionné → sélectionner une pièce
        if (piece && piece.color === game.turn()) {
            setSelectedSquare(square);
            const moves = game.moves({ square, verbose: true });
            setLegalMoves(moves.map(m => m.to as Square));
            setHintSquare(null);
        }
    }, [selectedSquare, game, isGameOver, gameMode, forceUpdate, makeAIMove, onGameEnd]);

    // ── Indice (Rewarded Ad) ──
    const handleHint = useCallback(() => {
        if (isGameOver || hintLoading) return;
        setHintLoading(true);

        setTimeout(() => {
            setHintLoading(false);

            // Trouver une pièce qui peut bouger
            const allMoves = game.moves({ verbose: true });
            if (allMoves.length > 0) {
                // Choisir un coup au hasard et en suggérer la source
                const suggestedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
                setHintSquare(suggestedMove.from as Square);
                setSelectedSquare(suggestedMove.from as Square);
                const moves = game.moves({ square: suggestedMove.from as Square, verbose: true });
                setLegalMoves(moves.map(m => m.to as Square));
            }
        }, 2000);
    }, [isGameOver, hintLoading, game]);

    // ── Nouvelle partie ──
    const handleRestart = useCallback((mode?: 'local' | 'ai') => {
        const newGame = new ChessEngine();
        setGame(newGame);
        setSelectedSquare(null);
        setLegalMoves([]);
        setLastMove(null);
        setHintSquare(null);
        setCapturedWhite([]);
        setCapturedBlack([]);
        if (mode) setGameMode(mode);
        forceUpdate();
    }, [forceUpdate]);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    const board = game.board();
    const kingInCheck = game.isCheck() ? game.turn() : null;

    // Trouver la case du roi en échec
    let checkSquare: Square | null = null;
    if (kingInCheck) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = board[r][c];
                if (p && p.type === 'k' && p.color === kingInCheck) {
                    checkSquare = toSquare(r, c);
                }
            }
        }
    }

    return (
        <View style={styles.container}>
            {/* ── Status bar ── */}
            <View style={[
                styles.statusBar,
                isGameOver && styles.statusBarOver,
                game.isCheck() && !isGameOver && styles.statusBarCheck,
            ]}>
                <View style={[styles.turnDot, game.turn() === 'w' ? styles.dotWhite : styles.dotBlack]} />
                <Text style={styles.statusText}>{gameStatus}</Text>
            </View>

            {/* ── Mode selector ── */}
            <View style={styles.modeRow}>
                <Pressable
                    onPress={() => handleRestart('ai')}
                    style={[styles.modeBtn, gameMode === 'ai' && styles.modeBtnActive]}
                >
                    <Text style={[styles.modeBtnText, gameMode === 'ai' && styles.modeBtnTextActive]}>
                        🤖 vs IA
                    </Text>
                </Pressable>
                <Pressable
                    onPress={() => handleRestart('local')}
                    style={[styles.modeBtn, gameMode === 'local' && styles.modeBtnActive]}
                >
                    <Text style={[styles.modeBtnText, gameMode === 'local' && styles.modeBtnTextActive]}>
                        👥 Local 1v1
                    </Text>
                </Pressable>
            </View>

            {/* ── Capturées (noirs) ── */}
            <View style={styles.capturedRow}>
                <Text style={styles.capturedPieces}>
                    {capturedBlack.join(' ')}
                </Text>
            </View>

            {/* ── PLATEAU ── */}
            <View style={styles.board}>
                {board.map((row, r) => (
                    <View key={r} style={styles.boardRow}>
                        {/* Numéro de rangée */}
                        <Text style={styles.rankLabel}>{RANKS[r]}</Text>

                        {row.map((piece, c) => {
                            const square = toSquare(r, c);
                            const isLight = (r + c) % 2 === 0;
                            const isSelected = selectedSquare === square;
                            const isLegal = legalMoves.includes(square);
                            const isLast = lastMove?.from === square || lastMove?.to === square;
                            const isCheck = checkSquare === square;
                            const isHint = hintSquare === square;
                            const hasPiece = piece !== null;

                            return (
                                <Pressable
                                    key={c}
                                    onPress={() => handleSquarePress(r, c)}
                                    style={[
                                        styles.square,
                                        { backgroundColor: isLight ? BOARD_COLORS.light : BOARD_COLORS.dark },
                                        isLast && { backgroundColor: isLight ? '#8FAE80' : '#3A3F3A' },
                                        isLast && styles.squareLastMove,
                                        isSelected && styles.squareSelected,
                                        isCheck && styles.squareCheck,
                                        isHint && styles.squareHint,
                                    ]}
                                >
                                    {/* Indicateur de coup légal */}
                                    {isLegal && !hasPiece && (
                                        <View style={styles.legalDot} />
                                    )}
                                    {isLegal && hasPiece && (
                                        <View style={styles.legalCapture} />
                                    )}

                                    {/* Pièce */}
                                    {piece && (
                                        <Text style={[
                                            styles.pieceText,
                                            piece.color === 'w' ? styles.pieceWhite : styles.pieceBlack,
                                        ]}>
                                            {PIECE_CHARS[piece.color][piece.type]}
                                        </Text>
                                    )}

                                    {/* Label de fichier (dernière rangée) */}
                                    {r === 7 && (
                                        <Text style={[styles.fileLabel, { color: isLight ? BOARD_COLORS.dark : BOARD_COLORS.light }]}>
                                            {FILES[c]}
                                        </Text>
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* ── Capturées (blancs) ── */}
            <View style={styles.capturedRow}>
                <Text style={styles.capturedPieces}>
                    {capturedWhite.join(' ')}
                </Text>
            </View>

            {/* ── Bouton Indice (Rewarded Ad) ── */}
            {!isGameOver && (
                <Pressable
                    onPress={handleHint}
                    disabled={hintLoading}
                    style={[styles.hintBtn, hintLoading && styles.hintBtnDisabled]}
                >
                    <Text style={styles.hintBtnText}>
                        {hintLoading
                            ? '📺 Chargement de la pub…'
                            : '💡 Demander un indice (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Restart ── */}
            <Pressable onPress={() => handleRestart()} style={styles.restartBtn}>
                <Text style={styles.restartText}>🔄 Nouvelle partie</Text>
            </Pressable>

            <Text style={styles.ecoNote}>Les revenus financent des panneaux solaires 🌱</Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const SQ_SIZE = 42;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.sm,
        width: '100%',
    },

    // ── Status bar ──
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        paddingVertical: Spacing.xs + 2,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statusBarOver: { borderColor: Colors.solarGold, backgroundColor: Colors.solarGold + '15' },
    statusBarCheck: { borderColor: Colors.error + '60', backgroundColor: Colors.error + '10' },
    turnDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1, borderColor: Colors.border },
    dotWhite: { backgroundColor: '#E8E8E8' },
    dotBlack: { backgroundColor: '#2A2A2A' },
    statusText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary },

    // ── Mode ──
    modeRow: { flexDirection: 'row', gap: 2, backgroundColor: Colors.surface, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    modeBtn: { paddingVertical: Spacing.xs + 1, paddingHorizontal: Spacing.md },
    modeBtnActive: { backgroundColor: Colors.ecoGreen + '25' },
    modeBtnText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textSecondary },
    modeBtnTextActive: { color: Colors.textPrimary },

    // ── Capturées ──
    capturedRow: { minHeight: 20, width: SQ_SIZE * 8 + 16, paddingLeft: 16 },
    capturedPieces: { fontSize: 16, color: Colors.textSecondary, letterSpacing: 2 },

    // ── Plateau ──
    board: {
        borderWidth: 2,
        borderColor: Colors.solarGold + '60',
        borderRadius: 4,
        overflow: 'hidden',
    },
    boardRow: { flexDirection: 'row', alignItems: 'center' },
    rankLabel: {
        width: 16, textAlign: 'center',
        fontSize: 10, fontWeight: '700', color: Colors.textMuted,
    },
    square: {
        width: SQ_SIZE, height: SQ_SIZE,
        alignItems: 'center', justifyContent: 'center',
        position: 'relative',
    },
    squareSelected: {
        backgroundColor: BOARD_COLORS.selected + ' !important' as any,
        shadowColor: Colors.solarGold, shadowOpacity: 0.4, shadowRadius: 8,
    },
    squareLastMove: { opacity: 0.85 },
    squareCheck: { backgroundColor: BOARD_COLORS.check },
    squareHint: { backgroundColor: BOARD_COLORS.hint },
    fileLabel: {
        position: 'absolute', bottom: 1, right: 3,
        fontSize: 9, fontWeight: '700',
    },

    // ── Coups légaux ──
    legalDot: {
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: Colors.solarGold + '50',
    },
    legalCapture: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        borderWidth: 3, borderColor: Colors.solarGold + '50',
        borderRadius: SQ_SIZE / 2,
    },

    // ── Pièces ──
    pieceText: { fontSize: 28, textAlign: 'center' },
    pieceWhite: { textShadowColor: '#00000040', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    pieceBlack: { textShadowColor: '#00000060', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },

    // ── Hint button ──
    hintBtn: {
        backgroundColor: Colors.solarGold + '18',
        borderRadius: BorderRadius.lg, paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg, borderWidth: 1, borderColor: Colors.solarGold + '50',
        maxWidth: 340, alignItems: 'center',
    },
    hintBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    hintBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Restart ──
    restartBtn: {
        backgroundColor: Colors.solarGold + '15', paddingVertical: Spacing.xs + 2,
        paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.full,
        borderWidth: 1, borderColor: Colors.solarGold + '30',
    },
    restartText: { color: Colors.solarGold, fontWeight: '700', fontSize: FontSizes.xs },

    ecoNote: { fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
