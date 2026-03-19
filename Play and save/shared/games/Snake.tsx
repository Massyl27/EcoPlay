import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🐍 Snake — Jeu complet
// ══════════════════════════════════════════════════════════════
//
// • Grille 15×15, serpent = liane/racine verte
// • Nourriture = 💧 goutte d'eau ou ☀️ soleil (alternée)
// • Boucle de jeu via useEffect + setInterval
// • Clavier (flèches) + D-pad tactile
// • Game Over avec "❤️ Continuer (Vidéo 30s)" — résurrection
// • Design Dark Mode discret
//

const GRID = 15;
const INITIAL_SPEED = 200; // ms par tick
const SPEED_INCREMENT = 3; // accélération par point

type Pos = { r: number; c: number };
type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

const DIR_DELTA: Record<Dir, Pos> = {
    UP: { r: -1, c: 0 },
    DOWN: { r: 1, c: 0 },
    LEFT: { r: 0, c: -1 },
    RIGHT: { r: 0, c: 1 },
};

const OPPOSITE: Record<Dir, Dir> = {
    UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT',
};

// ── Aliments écologiques ──
const FOODS = ['💧', '☀️', '🌱', '🍃', '🌻'];

function randomFood(): string {
    return FOODS[Math.floor(Math.random() * FOODS.length)];
}

function randomFoodPos(snake: Pos[]): Pos {
    const occupied = new Set(snake.map(p => `${p.r},${p.c}`));
    let pos: Pos;
    do {
        pos = { r: Math.floor(Math.random() * GRID), c: Math.floor(Math.random() * GRID) };
    } while (occupied.has(`${pos.r},${pos.c}`));
    return pos;
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface SnakeProps {
    onGameEnd?: () => void;
}

export function Snake({ onGameEnd }: SnakeProps) {
    const center = Math.floor(GRID / 2);

    // ── État du jeu ──
    const [snake, setSnake] = useState<Pos[]>([
        { r: center, c: center },
        { r: center, c: center - 1 },
        { r: center, c: center - 2 },
    ]);
    const [dir, setDir] = useState<Dir>('RIGHT');
    const [food, setFood] = useState<Pos>({ r: 3, c: 3 });
    const [foodIcon, setFoodIcon] = useState<string>('💧');
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [gameState, setGameState] = useState<'waiting' | 'playing' | 'over'>('waiting');

    // ── Résurrection (Rewarded Ad) ──
    const [continueLoading, setContinueLoading] = useState(false);
    const [continueUsed, setContinueUsed] = useState(false);

    // ── Refs pour la boucle de jeu ──
    const dirRef = useRef<Dir>(dir);
    const snakeRef = useRef<Pos[]>(snake);
    const foodRef = useRef<Pos>(food);
    const gameStateRef = useRef(gameState);

    // Synchroniser les refs
    useEffect(() => { dirRef.current = dir; }, [dir]);
    useEffect(() => { snakeRef.current = snake; }, [snake]);
    useEffect(() => { foodRef.current = food; }, [food]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    // ── Vitesse adaptative ──
    const speed = Math.max(80, INITIAL_SPEED - score * SPEED_INCREMENT);

    // ── Démarrer le jeu ──
    const startGame = useCallback(() => {
        if (gameState === 'waiting') {
            setGameState('playing');
        }
    }, [gameState]);

    // ── Changer de direction ──
    const changeDir = useCallback((newDir: Dir) => {
        // Empêcher le demi-tour
        if (OPPOSITE[newDir] === dirRef.current) return;
        setDir(newDir);

        // Auto-start si en attente
        if (gameStateRef.current === 'waiting') {
            setGameState('playing');
        }
    }, []);

    // ── Boucle de jeu ──
    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            const currentSnake = snakeRef.current;
            const currentDir = dirRef.current;
            const currentFood = foodRef.current;
            const head = currentSnake[0];

            const delta = DIR_DELTA[currentDir];
            const newHead: Pos = { r: head.r + delta.r, c: head.c + delta.c };

            // ── Collision mur ──
            if (newHead.r < 0 || newHead.r >= GRID || newHead.c < 0 || newHead.c >= GRID) {
                setGameState('over');
                onGameEnd?.();
                return;
            }

            // ── Collision corps (exclure la queue qui va bouger) ──
            const willEat = newHead.r === currentFood.r && newHead.c === currentFood.c;
            const bodyToCheck = willEat ? currentSnake : currentSnake.slice(0, -1);
            if (bodyToCheck.some(p => p.r === newHead.r && p.c === newHead.c)) {
                setGameState('over');
                onGameEnd?.();
                return;
            }

            // ── Avancer ──
            const newSnake = [newHead, ...currentSnake];

            if (willEat) {
                // Manger → garder toute la longueur (pas de pop)
                setScore(s => {
                    const ns = s + 1;
                    setBestScore(b => Math.max(b, ns));
                    return ns;
                });
                const newFoodPos = randomFoodPos(newSnake);
                setFood(newFoodPos);
                setFoodIcon(randomFood());
            } else {
                newSnake.pop(); // Enlever la queue
            }

            setSnake(newSnake);
        }, speed);

        return () => clearInterval(interval);
    }, [gameState, speed, onGameEnd]);

    // ── Clavier (Web) ──
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        const handler = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowUp': e.preventDefault(); changeDir('UP'); break;
                case 'ArrowDown': e.preventDefault(); changeDir('DOWN'); break;
                case 'ArrowLeft': e.preventDefault(); changeDir('LEFT'); break;
                case 'ArrowRight': e.preventDefault(); changeDir('RIGHT'); break;
                case ' ': e.preventDefault(); startGame(); break;
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [changeDir, startGame]);

    // ── Continuer (Rewarded Ad) ──
    const handleContinue = useCallback(() => {
        if (continueLoading) return;
        setContinueLoading(true);

        setTimeout(() => {
            setContinueLoading(false);

            // Résurrection : réduire la taille et replacer au centre
            const newSnake = [
                { r: center, c: center },
                { r: center, c: center - 1 },
                { r: center, c: center - 2 },
            ];
            setSnake(newSnake);
            setDir('RIGHT');
            setFood(randomFoodPos(newSnake));
            setFoodIcon(randomFood());
            setGameState('playing');
        }, 2000);
    }, [continueLoading, center]);

    // ── Restart ──
    const handleRestart = () => {
        setSnake([
            { r: center, c: center },
            { r: center, c: center - 1 },
            { r: center, c: center - 2 },
        ]);
        setDir('RIGHT');
        setFood({ r: 3, c: 3 });
        setFoodIcon('💧');
        setScore(0);
        setGameState('waiting');
        setContinueUsed(false);
    };

    // ── Set de positions du serpent pour lookup rapide ──
    const snakeSet = new Set(snake.map(p => `${p.r},${p.c}`));
    const headKey = `${snake[0].r},${snake[0].c}`;
    const tailKey = snake.length > 0 ? `${snake[snake.length - 1].r},${snake[snake.length - 1].c}` : '';

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── Score bar ── */}
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
                    <Text style={st.scoreLabel}>TAILLE</Text>
                    <Text style={st.scoreValue}>{snake.length}</Text>
                </View>
            </View>

            {/* ── Grille ── */}
            <View style={st.gridContainer}>
                {Array.from({ length: GRID }).map((_, r) => (
                    <View key={r} style={st.gridRow}>
                        {Array.from({ length: GRID }).map((_, c) => {
                            const key = `${r},${c}`;
                            const isSnake = snakeSet.has(key);
                            const isHead = key === headKey;
                            const isTail = key === tailKey;
                            const isFood = r === food.r && c === food.c;

                            return (
                                <View
                                    key={c}
                                    style={[
                                        st.cell,
                                        isSnake && st.cellSnake,
                                        isHead && st.cellHead,
                                        isTail && st.cellTail,
                                        isFood && st.cellFood,
                                        gameState === 'over' && isSnake && st.cellSnakeDead,
                                    ]}
                                >
                                    {isHead && (
                                        <Text style={st.headEye}>
                                            {dir === 'RIGHT' ? '👀' : dir === 'LEFT' ? '👀' : dir === 'UP' ? '👀' : '👀'}
                                        </Text>
                                    )}
                                    {isFood && <Text style={st.foodEmoji}>{foodIcon}</Text>}
                                </View>
                            );
                        })}
                    </View>
                ))}

                {/* ── Overlay d'attente ── */}
                {gameState === 'waiting' && (
                    <View style={st.overlay}>
                        <Pressable onPress={startGame} style={st.overlayBtn}>
                            <Text style={st.overlayTitle}>🌿 Snake Écolo</Text>
                            <Text style={st.overlayText}>Appuyez sur ▶ ou une flèche</Text>
                        </Pressable>
                    </View>
                )}

                {/* ── Overlay Game Over ── */}
                {gameState === 'over' && (
                    <View style={st.overlay}>
                        <View style={st.gameOverBox}>
                            <Text style={st.gameOverTitle}>🍂 Game Over</Text>
                            <Text style={st.gameOverScore}>Score : {score}</Text>
                            <Text style={st.gameOverSize}>Taille : {snake.length} segments</Text>

                            {/* ── Continue (Rewarded Ad) ── */}
                            <Pressable
                                onPress={handleContinue}
                                disabled={continueLoading}
                                style={[st.continueBtn, continueLoading && st.continueBtnLoading]}
                            >
                                <Text style={st.continueBtnText}>
                                    {continueLoading
                                        ? '📺 Chargement…'
                                        : '❤️ Continuer (Vidéo 30s)'}
                                </Text>
                            </Pressable>

                            <Pressable onPress={handleRestart} style={st.restartBtn}>
                                <Text style={st.restartText}>🔄 Nouvelle partie</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </View>

            {/* ── D-pad tactile ── */}
            <View style={st.dpad}>
                <View style={st.dpadRow}>
                    <View style={st.dpadSpacer} />
                    <Pressable onPress={() => changeDir('UP')} style={st.dpadBtn}>
                        <Text style={st.dpadText}>▲</Text>
                    </Pressable>
                    <View style={st.dpadSpacer} />
                </View>
                <View style={st.dpadRow}>
                    <Pressable onPress={() => changeDir('LEFT')} style={st.dpadBtn}>
                        <Text style={st.dpadText}>◀</Text>
                    </Pressable>
                    <View style={[st.dpadBtn, st.dpadCenter]}>
                        <Text style={st.dpadCenterText}>🌿</Text>
                    </View>
                    <Pressable onPress={() => changeDir('RIGHT')} style={st.dpadBtn}>
                        <Text style={st.dpadText}>▶</Text>
                    </Pressable>
                </View>
                <View style={st.dpadRow}>
                    <View style={st.dpadSpacer} />
                    <Pressable onPress={() => changeDir('DOWN')} style={st.dpadBtn}>
                        <Text style={st.dpadText}>▼</Text>
                    </Pressable>
                    <View style={st.dpadSpacer} />
                </View>
            </View>

            <Text style={st.ecoNote}>Les revenus financent des panneaux solaires 🌱</Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const CELL_SZ = 22;

const st = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.sm,
        width: '100%',
    },

    // ── Score ──
    scoreRow: { flexDirection: 'row', gap: Spacing.sm },
    scorePill: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingVertical: 3, paddingHorizontal: Spacing.md,
        alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    },
    scoreLabel: { fontSize: 8, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
    scoreValue: { fontSize: FontSizes.md, fontWeight: '900', color: Colors.ecoGreen },

    // ── Grille ──
    gridContainer: {
        borderWidth: 2,
        borderColor: Colors.ecoGreen + '30',
        borderRadius: 4,
        backgroundColor: '#0A0F0A',
        padding: 1,
        position: 'relative',
    },
    gridRow: { flexDirection: 'row' },
    cell: {
        width: CELL_SZ,
        height: CELL_SZ,
        borderWidth: 0.5,
        borderColor: '#1A2A1A',
        backgroundColor: '#0D150D',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Serpent (liane/racine) ──
    cellSnake: {
        backgroundColor: '#1B5E20',
        borderColor: '#2E7D32',
        borderWidth: 1,
        borderRadius: 3,
    },
    cellHead: {
        backgroundColor: '#27AE60',
        borderColor: '#2ECC71',
        borderWidth: 1.5,
        borderRadius: 5,
    },
    cellTail: {
        backgroundColor: '#1A4D2E',
        borderColor: '#1B5E20',
        borderRadius: 2,
        opacity: 0.8,
    },
    cellSnakeDead: {
        backgroundColor: '#5D4037',
        borderColor: '#795548',
    },
    headEye: { fontSize: 10, position: 'absolute' },

    // ── Nourriture ──
    cellFood: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    foodEmoji: { fontSize: 16 },

    // ── Overlays ──
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#00000090',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
    },
    overlayBtn: {
        alignItems: 'center',
        gap: Spacing.xs,
        padding: Spacing.lg,
    },
    overlayTitle: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.ecoGreen },
    overlayText: { fontSize: FontSizes.sm, color: Colors.textSecondary },

    // ── Game Over ──
    gameOverBox: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        minWidth: 220,
    },
    gameOverTitle: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.error },
    gameOverScore: { fontSize: FontSizes.md, fontWeight: '800', color: Colors.solarGold },
    gameOverSize: { fontSize: FontSizes.sm, color: Colors.textSecondary },

    // ── Continue (Rewarded Ad) ──
    continueBtn: {
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
        width: '100%',
        alignItems: 'center',
    },
    continueBtnLoading: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    continueBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.ecoGreen },

    // ── Restart ──
    restartBtn: {
        paddingVertical: Spacing.xs + 2,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    restartText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSizes.xs },

    // ── D-pad ──
    dpad: { gap: 3 },
    dpadRow: { flexDirection: 'row', gap: 3, justifyContent: 'center' },
    dpadSpacer: { width: 48, height: 48 },
    dpadBtn: {
        width: 48, height: 48,
        borderRadius: BorderRadius.md,
        backgroundColor: Colors.surface,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
    dpadCenter: {
        backgroundColor: Colors.ecoGreen + '15',
        borderColor: Colors.ecoGreen + '40',
    },
    dpadCenterText: { fontSize: 16 },
    dpadText: { fontSize: 16, color: Colors.textPrimary },

    ecoNote: { fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
