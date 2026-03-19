import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🐝 Eco-Flappy — Flappy Bird écologique complet
// ══════════════════════════════════════════════════════════════
//
// • Abeille (🐝) pilotée par clic/toucher
// • Obstacles = cheminées d'usine avec fumée
// • Fond dynamique : gris pollué → bleu ciel avec le score
// • Gravité + saut
// • "🛡️ Sauver l'abeille (Vidéo 30s)" pour continuer
// • Design Dark Mode
//

// ── CONSTANTES ───────────────────────────────────────────────

const CANVAS_W = 320;
const CANVAS_H = 400;
const BEE_SIZE = 30;
const BEE_X = 70;            // Position horizontale fixe de l'abeille
const GRAVITY = 0.45;
const JUMP_FORCE = -7;
const PIPE_WIDTH = 45;
const PIPE_GAP = 110;         // Espace entre haut et bas de la cheminée
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_DIST = 180;  // Distance entre deux cheminées
const TICK = 20;              // ms par frame (~50fps)

interface Pipe {
    x: number;
    gapTop: number;   // Y du haut de l'espace
    scored: boolean;
    destroyed: boolean;
}

// ── COULEURS DU CIEL (gris pollué → bleu ciel) ──────────────

function skyColor(score: number): string {
    // Progression : 0 = gris pollué, 20+ = bleu ciel
    const t = Math.min(score / 20, 1);
    const r = Math.round(30 + (15 - 30) * t);   // 30 → 15
    const g = Math.round(32 + (25 - 32) * t);   // 32 → 25
    const b = Math.round(38 + (60 - 38) * t);   // 38 → 60
    return `rgb(${Math.max(0, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
}

function skyGradientTop(score: number): string {
    const t = Math.min(score / 20, 1);
    const r = Math.round(20 + (40 - 20) * t);
    const g = Math.round(22 + (80 - 22) * t);
    const b = Math.round(30 + (140 - 30) * t);
    return `rgb(${r}, ${g}, ${b})`;
}

// ── FUMÉE ────────────────────────────────────────────────────

const SMOKE_CHARS = ['░', '▒', '░', '▓'];

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface EcoFlappyProps {
    onGameEnd?: () => void;
}

export function EcoFlappy({ onGameEnd }: EcoFlappyProps) {
    // ── État du jeu ──
    const [beeY, setBeeY] = useState(CANVAS_H / 2 - BEE_SIZE / 2);
    const [velocity, setVelocity] = useState(0);
    const [pipes, setPipes] = useState<Pipe[]>([]);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [gameState, setGameState] = useState<'waiting' | 'playing' | 'over'>('waiting');
    const [beeAngle, setBeeAngle] = useState(0);

    // ── Rewarded Ad ──
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveUsed, setSaveUsed] = useState(false);
    const [crashedPipeIdx, setCrashedPipeIdx] = useState<number>(-1);

    // ── Refs pour la boucle ──
    const beeYRef = useRef(beeY);
    const velocityRef = useRef(velocity);
    const pipesRef = useRef(pipes);
    const scoreRef = useRef(score);
    const gameStateRef = useRef(gameState);

    useEffect(() => { beeYRef.current = beeY; }, [beeY]);
    useEffect(() => { velocityRef.current = velocity; }, [velocity]);
    useEffect(() => { pipesRef.current = pipes; }, [pipes]);
    useEffect(() => { scoreRef.current = score; }, [score]);
    useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

    // ── Saut ──
    const flap = useCallback(() => {
        if (gameStateRef.current === 'waiting') {
            setGameState('playing');
            setVelocity(JUMP_FORCE);
            return;
        }
        if (gameStateRef.current === 'playing') {
            setVelocity(JUMP_FORCE);
        }
    }, []);

    // ── Boucle de jeu ──
    useEffect(() => {
        if (gameState !== 'playing') return;

        const interval = setInterval(() => {
            // ── Physique de l'abeille ──
            let newV = velocityRef.current + GRAVITY;
            let newY = beeYRef.current + newV;

            // Angle basé sur la vélocité
            const angle = Math.min(Math.max(newV * 3, -30), 70);
            setBeeAngle(angle);

            // ── Collision plafond/sol ──
            if (newY < 0) { newY = 0; newV = 0; }
            if (newY + BEE_SIZE > CANVAS_H) {
                // Touche le sol
                setGameState('over');
                setBeeY(CANVAS_H - BEE_SIZE);
                onGameEnd?.();
                return;
            }

            setBeeY(newY);
            setVelocity(newV);

            // ── Déplacement des cheminées ──
            let currentPipes = [...pipesRef.current];
            let newScore = scoreRef.current;

            // Bouger les cheminées
            currentPipes = currentPipes
                .map(p => ({ ...p, x: p.x - PIPE_SPEED }))
                .filter(p => p.x + PIPE_WIDTH > -20); // Garder celles encore visibles

            // Spawn de nouvelles cheminées
            const lastPipe = currentPipes[currentPipes.length - 1];
            if (!lastPipe || lastPipe.x < CANVAS_W - PIPE_SPAWN_DIST) {
                const gapTop = 50 + Math.random() * (CANVAS_H - PIPE_GAP - 100);
                currentPipes.push({ x: CANVAS_W + 20, gapTop, scored: false, destroyed: false });
            }

            // ── Collision & Score ──
            const beeTop = newY;
            const beeBottom = newY + BEE_SIZE;
            const beeLeft = BEE_X;
            const beeRight = BEE_X + BEE_SIZE;

            for (let i = 0; i < currentPipes.length; i++) {
                const p = currentPipes[i];
                if (p.destroyed) continue;

                const pLeft = p.x;
                const pRight = p.x + PIPE_WIDTH;

                // Score : l'abeille a passé la cheminée
                if (!p.scored && pRight < beeLeft) {
                    currentPipes[i] = { ...p, scored: true };
                    newScore++;
                }

                // Collision rectangle
                if (beeRight > pLeft && beeLeft < pRight) {
                    if (beeTop < p.gapTop || beeBottom > p.gapTop + PIPE_GAP) {
                        // CRASH !
                        setCrashedPipeIdx(i);
                        setGameState('over');
                        setPipes(currentPipes);
                        setScore(newScore);
                        setBestScore(b => Math.max(b, newScore));
                        onGameEnd?.();
                        return;
                    }
                }
            }

            setPipes(currentPipes);
            if (newScore !== scoreRef.current) {
                setScore(newScore);
                setBestScore(b => Math.max(b, newScore));
            }
        }, TICK);

        return () => clearInterval(interval);
    }, [gameState, onGameEnd]);

    // ── Clavier / toucher ──
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        const handler = (e: KeyboardEvent) => {
            if (e.key === ' ' || e.key === 'ArrowUp') {
                e.preventDefault();
                flap();
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [flap]);

    // ── Save l'abeille (Rewarded Ad) ──
    const handleSave = useCallback(() => {
        if (saveLoading) return;
        setSaveLoading(true);

        setTimeout(() => {
            setSaveLoading(false);

            // Détruire la cheminée fautive
            const newPipes = [...pipesRef.current];
            if (crashedPipeIdx >= 0 && crashedPipeIdx < newPipes.length) {
                newPipes[crashedPipeIdx] = { ...newPipes[crashedPipeIdx], destroyed: true };
            }

            // Replacer l'abeille au milieu
            setBeeY(CANVAS_H / 2 - BEE_SIZE / 2);
            setVelocity(0);
            setPipes(newPipes);
            setGameState('playing');
        }, 2000);
    }, [saveLoading, crashedPipeIdx]);

    // ── Restart ──
    const handleRestart = () => {
        setBeeY(CANVAS_H / 2 - BEE_SIZE / 2);
        setVelocity(0);
        setPipes([]);
        setScore(0);
        setGameState('waiting');
        setSaveUsed(false);
        setCrashedPipeIdx(-1);
        setBeeAngle(0);
    };

    // ── Couleur du ciel ──
    const bg = skyColor(score);
    const bgTop = skyGradientTop(score);

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
            </View>

            {/* ── Zone de jeu ── */}
            <Pressable onPress={flap} style={[st.canvas, { backgroundColor: bg }]}>
                {/* ── Indicateur de pollution ── */}
                <View style={[st.skyGrad, { backgroundColor: bgTop }]} />

                {/* ── Étoiles / particules (quand ciel bleu) ── */}
                {score >= 10 && (
                    <>
                        <Text style={[st.cloud, { top: 20, left: 40 }]}>☁️</Text>
                        <Text style={[st.cloud, { top: 60, left: 200 }]}>☁️</Text>
                    </>
                )}

                {/* ── Cheminées ── */}
                {pipes.map((pipe, i) => {
                    if (pipe.destroyed) {
                        return (
                            <Text key={i} style={[st.explosion, { left: pipe.x, top: pipe.gapTop + PIPE_GAP / 2 - 15 }]}>
                                💥
                            </Text>
                        );
                    }

                    return (
                        <View key={i}>
                            {/* Cheminée du haut */}
                            <View style={[st.pipeTop, {
                                left: pipe.x,
                                height: pipe.gapTop,
                            }]}>
                                {/* Fumée au sommet du tuyau haut */}
                                <Text style={st.smoke}>
                                    {SMOKE_CHARS[i % SMOKE_CHARS.length]}
                                </Text>
                                {/* Tête de cheminée */}
                                <View style={st.pipeCapTop} />
                            </View>

                            {/* Cheminée du bas */}
                            <View style={[st.pipeBottom, {
                                left: pipe.x,
                                top: pipe.gapTop + PIPE_GAP,
                                height: CANVAS_H - pipe.gapTop - PIPE_GAP,
                            }]}>
                                {/* Tête de cheminée */}
                                <View style={st.pipeCapBottom} />
                                {/* Fumée sortant du haut */}
                                <Text style={st.smokeBottom}>
                                    {SMOKE_CHARS[(i + 2) % SMOKE_CHARS.length]}
                                </Text>
                            </View>
                        </View>
                    );
                })}

                {/* ── Abeille ── */}
                <View style={[st.bee, {
                    top: beeY,
                    left: BEE_X,
                    transform: [{ rotate: `${beeAngle}deg` }],
                }]}>
                    <Text style={st.beeEmoji}>🐝</Text>
                </View>

                {/* ── Sol ── */}
                <View style={st.ground}>
                    <Text style={st.groundPattern}>
                        {'🌱'.repeat(16)}
                    </Text>
                </View>

                {/* ── Overlay d'attente ── */}
                {gameState === 'waiting' && (
                    <View style={st.overlay}>
                        <Text style={st.overlayTitle}>🐝 Eco-Flappy</Text>
                        <Text style={st.overlaySubtitle}>Sauvez l'abeille de la pollution !</Text>
                        <Text style={st.overlayTap}>Touchez ou [Espace] pour voler</Text>
                    </View>
                )}

                {/* ── Overlay Game Over ── */}
                {gameState === 'over' && (
                    <View style={st.overlay}>
                        <View style={st.gameOverBox}>
                            <Text style={st.gameOverTitle}>💨 Pollution !</Text>
                            <Text style={st.gameOverScore}>Score : {score}</Text>

                            {/* ── Save (Rewarded Ad) ── */}
                            <Pressable
                                onPress={handleSave}
                                disabled={saveLoading}
                                style={[st.saveBtn, saveLoading && st.saveBtnLoading]}
                            >
                                <Text style={st.saveBtnText}>
                                    {saveLoading
                                        ? '📺 Chargement…'
                                        : '🛡️ Sauver l\'abeille (Vidéo 30s)'}
                                </Text>
                            </Pressable>

                            <Pressable onPress={handleRestart} style={st.restartBtn}>
                                <Text style={st.restartText}>🔄 Nouvelle partie</Text>
                            </Pressable>
                        </View>
                    </View>
                )}
            </Pressable>

            {/* ── Pollution indicator ── */}
            <View style={st.pollutionBar}>
                <Text style={st.pollutionLabel}>
                    {score < 5 ? '🏭 Air très pollué' : score < 10 ? '😷 Air pollué' : score < 15 ? '🌤️ Air amélioré' : '🌈 Air pur !'}
                </Text>
                <View style={st.pollutionTrack}>
                    <View style={[st.pollutionFill, { width: `${Math.min(score / 20 * 100, 100)}%` }]} />
                </View>
            </View>

            <Text style={st.ecoNote}>Les revenus financent des panneaux solaires 🌱</Text>
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

    // ── Score ──
    scoreRow: { flexDirection: 'row', gap: Spacing.md },
    scorePill: {
        backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingVertical: 3, paddingHorizontal: Spacing.lg,
        alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
    },
    scoreLabel: { fontSize: 8, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
    scoreValue: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.solarGold },

    // ── Canvas ──
    canvas: {
        width: CANVAS_W,
        height: CANVAS_H,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 2,
        borderColor: '#4A4A4A',
        cursor: 'pointer' as any,
    },
    skyGrad: {
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: CANVAS_H * 0.4,
        opacity: 0.5,
    },

    // ── Nuages ──
    cloud: { position: 'absolute', fontSize: 20, opacity: 0.6 },

    // ── Abeille ──
    bee: {
        position: 'absolute',
        width: BEE_SIZE,
        height: BEE_SIZE,
        zIndex: 10,
    },
    beeEmoji: { fontSize: 24, textAlign: 'center' },

    // ── Cheminées (tuyaux) ──
    pipeTop: {
        position: 'absolute',
        top: 0,
        width: PIPE_WIDTH,
        backgroundColor: '#4A4A4A',
        borderLeftWidth: 2, borderRightWidth: 2,
        borderColor: '#6A6A6A',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 5,
    },
    pipeBottom: {
        position: 'absolute',
        width: PIPE_WIDTH,
        backgroundColor: '#4A4A4A',
        borderLeftWidth: 2, borderRightWidth: 2,
        borderColor: '#6A6A6A',
        alignItems: 'center',
        zIndex: 5,
    },
    pipeCapTop: {
        width: PIPE_WIDTH + 8,
        height: 10,
        backgroundColor: '#5C5C5C',
        borderWidth: 1,
        borderColor: '#7A7A7A',
        borderRadius: 2,
        marginLeft: -6,
    },
    pipeCapBottom: {
        width: PIPE_WIDTH + 8,
        height: 10,
        backgroundColor: '#5C5C5C',
        borderWidth: 1,
        borderColor: '#7A7A7A',
        borderRadius: 2,
        marginLeft: -6,
    },
    smoke: {
        fontSize: 18,
        color: '#AAAAAA60',
        position: 'absolute',
        top: -8,
    },
    smokeBottom: {
        fontSize: 12,
        color: '#88888840',
        position: 'absolute',
        top: 12,
    },
    explosion: {
        position: 'absolute',
        fontSize: 28,
        zIndex: 20,
    },

    // ── Sol ──
    ground: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 20,
        backgroundColor: '#1A3A1A',
        borderTopWidth: 2,
        borderTopColor: '#2E5A2E',
        overflow: 'hidden',
        justifyContent: 'center',
    },
    groundPattern: { fontSize: 10, letterSpacing: 2 },

    // ── Overlays ──
    overlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#00000080',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
    },
    overlayTitle: { fontSize: 28, fontWeight: '900', color: Colors.solarGold, textShadowColor: '#000', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    overlaySubtitle: { fontSize: FontSizes.sm, color: '#FFFFFF', fontWeight: '600', marginTop: 4 },
    overlayTap: { fontSize: FontSizes.xs, color: '#FFFFFF90', marginTop: Spacing.md },

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
    gameOverTitle: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.textPrimary },
    gameOverScore: { fontSize: FontSizes.md + 2, fontWeight: '800', color: Colors.solarGold },

    // ── Save (Rewarded Ad) ──
    saveBtn: {
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
        width: '100%',
        alignItems: 'center',
    },
    saveBtnLoading: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    saveBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.ecoGreen },

    // ── Restart ──
    restartBtn: {
        paddingVertical: Spacing.xs + 2,
        paddingHorizontal: Spacing.lg,
        borderRadius: BorderRadius.full,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    restartText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSizes.xs },

    // ── Pollution bar ──
    pollutionBar: { width: CANVAS_W, gap: 3 },
    pollutionLabel: { fontSize: FontSizes.xs, color: Colors.textSecondary },
    pollutionTrack: {
        height: 6, borderRadius: 3,
        backgroundColor: '#333',
        overflow: 'hidden',
    },
    pollutionFill: {
        height: '100%',
        borderRadius: 3,
        backgroundColor: Colors.ecoGreen,
    },

    ecoNote: { fontSize: FontSizes.xs, color: Colors.textMuted, fontStyle: 'italic', textAlign: 'center' },
});
