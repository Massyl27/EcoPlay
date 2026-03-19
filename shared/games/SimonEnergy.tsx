import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// ⚡ SimonEnergy — Jeu de mémoire de séquence (Simon Says)
// ══════════════════════════════════════════════════════════════
//
// • 4 boutons énergie : ☀️ Solaire, 💧 Hydro, 🌬️ Éolien, 🌱 Biomasse
// • Le jeu joue une séquence qui s'allonge à chaque tour
// • Le joueur reproduit la séquence
// • Erreur → possibilité de revoir la séquence via pub
//

// ── CONFIG DES BOUTONS ÉNERGIE ───────────────────────────────

interface EnergyButton {
    id: number;
    label: string;
    emoji: string;
    color: string;
    activeColor: string;
}

const ENERGY_BUTTONS: EnergyButton[] = [
    { id: 0, label: 'Solaire', emoji: '☀️', color: '#D4A017', activeColor: '#F1C40F' },
    { id: 1, label: 'Hydro', emoji: '💧', color: '#1A5276', activeColor: '#3498DB' },
    { id: 2, label: 'Éolien', emoji: '🌬️', color: '#4A5568', activeColor: '#90A4AE' },
    { id: 3, label: 'Biomasse', emoji: '🌱', color: '#1B5E20', activeColor: '#4CAF50' },
];

const FLASH_DURATION = 400;   // Durée d'allumage d'un bouton (ms)
const PAUSE_BETWEEN = 250;    // Pause entre chaque flash
const PLAYER_FLASH = 200;     // Durée du flash quand le joueur appuie

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface SimonEnergyProps {
    onGameEnd?: () => void;
}

export function SimonEnergy({ onGameEnd }: SimonEnergyProps) {
    // ── État du jeu ──
    const [gameState, setGameState] = useState<'idle' | 'showing' | 'input' | 'mistake' | 'gameover'>('idle');
    const [sequence, setSequence] = useState<number[]>([]);
    const [playerIndex, setPlayerIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [bestScore, setBestScore] = useState(0);
    const [activeButton, setActiveButton] = useState<number | null>(null);
    const [playerFlash, setPlayerFlash] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    // Rewarded Ad
    const [adLoading, setAdLoading] = useState(false);
    const [canRevive, setCanRevive] = useState(true);

    // Refs pour les timeouts
    const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Cleanup tous les timeouts
    const clearAllTimeouts = useCallback(() => {
        timeoutsRef.current.forEach(t => clearTimeout(t));
        timeoutsRef.current = [];
    }, []);

    useEffect(() => {
        return () => clearAllTimeouts();
    }, [clearAllTimeouts]);

    // ── Ajouter un timeout tracké ──
    const addTimeout = useCallback((fn: () => void, delay: number) => {
        const t = setTimeout(fn, delay);
        timeoutsRef.current.push(t);
        return t;
    }, []);

    // ── Jouer la séquence lumineuse ──
    const playSequence = useCallback((seq: number[]) => {
        setGameState('showing');
        setActiveButton(null);
        setFeedback(null);

        seq.forEach((btnId, i) => {
            // Allumer
            addTimeout(() => {
                setActiveButton(btnId);
            }, i * (FLASH_DURATION + PAUSE_BETWEEN));

            // Éteindre
            addTimeout(() => {
                setActiveButton(null);
            }, i * (FLASH_DURATION + PAUSE_BETWEEN) + FLASH_DURATION);
        });

        // Après toute la séquence → passer en mode input
        const totalDuration = seq.length * (FLASH_DURATION + PAUSE_BETWEEN);
        addTimeout(() => {
            setGameState('input');
            setPlayerIndex(0);
            setFeedback('🎯 À vous !');
            addTimeout(() => setFeedback(null), 1000);
        }, totalDuration);
    }, [addTimeout]);

    // ── Démarrer une nouvelle partie ──
    const handleStart = useCallback(() => {
        clearAllTimeouts();
        const firstBtn = Math.floor(Math.random() * 4);
        const newSeq = [firstBtn];
        setSequence(newSeq);
        setScore(0);
        setPlayerIndex(0);
        setCanRevive(true);
        setFeedback(null);

        // Petit délai puis jouer la séquence
        addTimeout(() => playSequence(newSeq), 500);
    }, [clearAllTimeouts, addTimeout, playSequence]);

    // ── Passer au niveau suivant ──
    const nextRound = useCallback(() => {
        const nextBtn = Math.floor(Math.random() * 4);
        const newSeq = [...sequence, nextBtn];
        setSequence(newSeq);
        setPlayerIndex(0);

        // Petit délai puis jouer
        addTimeout(() => playSequence(newSeq), 800);
    }, [sequence, addTimeout, playSequence]);

    // ── Le joueur appuie sur un bouton ──
    const handleButtonPress = useCallback((btnId: number) => {
        if (gameState !== 'input') return;

        // Flash visuel du bouton pressé
        setPlayerFlash(btnId);
        addTimeout(() => setPlayerFlash(null), PLAYER_FLASH);

        const expected = sequence[playerIndex];

        if (btnId !== expected) {
            // ── ERREUR ──
            clearAllTimeouts();
            setFeedback('❌ Mauvais bouton !');

            if (canRevive) {
                setGameState('mistake');
            } else {
                setGameState('gameover');
                const finalScore = score;
                if (finalScore > bestScore) setBestScore(finalScore);
                onGameEnd?.();
            }
            return;
        }

        // ── Bon bouton ──
        const nextIdx = playerIndex + 1;

        if (nextIdx >= sequence.length) {
            // ── Séquence complète → prochain tour ──
            const newScore = score + 1;
            setScore(newScore);
            setPlayerIndex(0);
            setGameState('showing');

            // Feedback
            if (newScore % 5 === 0) {
                setFeedback(`🔥 Niveau ${newScore} !`);
            } else {
                setFeedback('✅ Bravo !');
            }
            addTimeout(() => setFeedback(null), 800);

            // Prochain round
            nextRound();
        } else {
            setPlayerIndex(nextIdx);
        }
    }, [gameState, sequence, playerIndex, score, bestScore, canRevive, clearAllTimeouts, addTimeout, nextRound, onGameEnd]);

    // ── Rewarded Ad : revoir la séquence ──
    const handleAdWatch = useCallback(() => {
        if (adLoading) return;
        setAdLoading(true);

        addTimeout(() => {
            setAdLoading(false);
            setCanRevive(false);
            setFeedback('🔄 Séquence rejouée !');

            // Rejouer la séquence actuelle
            playSequence(sequence);
        }, 2000);
    }, [adLoading, addTimeout, playSequence, sequence]);

    // Niveau actuel
    const level = sequence.length;

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── En-tête ── */}
            <View style={st.header}>
                <Text style={st.title}>⚡ SimonEnergy</Text>
                <Text style={st.subtitle}>Mémorisez la séquence d'énergie !</Text>
            </View>

            {/* ── Stats ── */}
            <View style={st.statsRow}>
                <View style={[st.statPill, st.scorePill]}>
                    <Text style={[st.statText, st.scoreText]}>⚡ Score : {score}</Text>
                </View>
                {bestScore > 0 && (
                    <View style={st.statPill}>
                        <Text style={st.statText}>🏆 Record : {bestScore}</Text>
                    </View>
                )}
                {gameState !== 'idle' && gameState !== 'gameover' && (
                    <View style={st.statPill}>
                        <Text style={st.statText}>📶 Niveau {level}</Text>
                    </View>
                )}
            </View>

            {/* ── Feedback ── */}
            {feedback && (
                <View style={st.feedbackBar}>
                    <Text style={st.feedbackText}>{feedback}</Text>
                </View>
            )}

            {/* ── Phase indicator ── */}
            {gameState === 'showing' && (
                <View style={st.phaseBar}>
                    <Text style={st.phaseText}>👀 Observez la séquence…</Text>
                </View>
            )}
            {gameState === 'input' && (
                <View style={[st.phaseBar, st.phaseBarInput]}>
                    <Text style={[st.phaseText, st.phaseTextInput]}>
                        👆 Reproduisez ! ({playerIndex + 1}/{sequence.length})
                    </Text>
                </View>
            )}

            {/* ── Grille 2×2 des boutons énergie ── */}
            <View style={st.buttonsGrid}>
                {ENERGY_BUTTONS.map(btn => {
                    const isActive = activeButton === btn.id;
                    const isPlayerFlash = playerFlash === btn.id;
                    const isLit = isActive || isPlayerFlash;
                    const canPress = gameState === 'input';

                    return (
                        <Pressable
                            key={btn.id}
                            onPress={() => handleButtonPress(btn.id)}
                            disabled={!canPress}
                            style={[
                                st.energyBtn,
                                { backgroundColor: isLit ? btn.activeColor : btn.color },
                                isLit && st.energyBtnLit,
                                !canPress && gameState !== 'showing' && st.energyBtnDisabled,
                            ]}
                        >
                            <Text style={[st.energyEmoji, isLit && st.energyEmojiLit]}>
                                {btn.emoji}
                            </Text>
                            <Text style={[st.energyLabel, isLit && st.energyLabelLit]}>
                                {btn.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Écran de démarrage ── */}
            {gameState === 'idle' && (
                <Pressable onPress={handleStart} style={st.startBtn}>
                    <Text style={st.startBtnText}>▶️ Commencer</Text>
                </Pressable>
            )}

            {/* ── Erreur → seconde chance ── */}
            {gameState === 'mistake' && (
                <View style={st.mistakeOverlay}>
                    <Text style={st.mistakeEmoji}>😰</Text>
                    <Text style={st.mistakeTitle}>Mauvais bouton !</Text>
                    <Text style={st.mistakeSubtitle}>
                        Vous étiez au niveau {level} — Score : {score}
                    </Text>

                    <Pressable
                        onPress={handleAdWatch}
                        disabled={adLoading}
                        style={[st.reviveBtn, adLoading && st.reviveBtnDisabled]}
                    >
                        <Text style={st.reviveBtnText}>
                            {adLoading
                                ? '📺 Chargement…'
                                : '🔄 Revoir la séquence (Vidéo 30s)'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => {
                            setGameState('gameover');
                            if (score > bestScore) setBestScore(score);
                            onGameEnd?.();
                        }}
                        style={st.giveUpBtn}
                    >
                        <Text style={st.giveUpText}>Abandonner</Text>
                    </Pressable>
                </View>
            )}

            {/* ── Game Over ── */}
            {gameState === 'gameover' && (
                <View style={st.gameOverOverlay}>
                    <Text style={st.gameOverEmoji}>💡</Text>
                    <Text style={st.gameOverTitle}>Énergie épuisée !</Text>
                    <Text style={st.gameOverSubtitle}>
                        Score final : {score} • Niveau atteint : {level}
                    </Text>
                    {score === bestScore && score > 0 && (
                        <Text style={st.newRecord}>🏆 Nouveau record !</Text>
                    )}

                    <Pressable onPress={handleStart} style={st.newGameBtn}>
                        <Text style={st.newGameText}>🔄 Rejouer</Text>
                    </Pressable>
                </View>
            )}

            {/* ── Rewarded Ad pendant le jeu ── */}
            {(gameState === 'input' || gameState === 'showing') && (
                <Pressable
                    onPress={handleAdWatch}
                    disabled={adLoading || !canRevive || gameState === 'showing'}
                    style={[
                        st.adBtn,
                        (adLoading || !canRevive || gameState === 'showing') && st.adBtnDisabled,
                    ]}
                >
                    <Text style={st.adBtnText}>
                        {adLoading
                            ? '📺 Chargement…'
                            : !canRevive
                                ? '🔒 Seconde chance utilisée'
                                : '🔄 Revoir la séquence (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            <Text style={st.ecoNote}>
                Chaque niveau maîtrisé contribue à la transition énergétique ⚡
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const BTN_SIZE = 120;

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

    // ── Feedback ──
    feedbackBar: {
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.md,
        paddingVertical: 5,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
    },
    feedbackText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.ecoGreen, textAlign: 'center' },

    // ── Phase ──
    phaseBar: {
        backgroundColor: Colors.solarGold + '15',
        borderRadius: BorderRadius.md,
        paddingVertical: 4,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.solarGold + '40',
    },
    phaseBarInput: {
        backgroundColor: '#3498DB20',
        borderColor: '#3498DB50',
    },
    phaseText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.solarGold },
    phaseTextInput: { color: '#3498DB' },

    // ── Grille 2×2 ──
    buttonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.sm,
        maxWidth: BTN_SIZE * 2 + Spacing.sm,
    },
    energyBtn: {
        width: BTN_SIZE,
        height: BTN_SIZE,
        borderRadius: BorderRadius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: 'rgba(0,0,0,0.3)',
        gap: 4,
    },
    energyBtnLit: {
        borderColor: 'rgba(255,255,255,0.6)',
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.5,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
        transform: [{ scale: 1.05 }],
    },
    energyBtnDisabled: {
        opacity: 0.6,
    },
    energyEmoji: {
        fontSize: 32,
        opacity: 0.7,
    },
    energyEmojiLit: {
        opacity: 1,
        fontSize: 36,
    },
    energyLabel: {
        fontSize: FontSizes.xs,
        fontWeight: '800',
        color: 'rgba(255,255,255,0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    energyLabelLit: {
        color: 'rgba(255,255,255,0.9)',
    },

    // ── Start ──
    startBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.xl + Spacing.md,
    },
    startBtnText: { fontSize: FontSizes.md, fontWeight: '900', color: '#FFFFFF' },

    // ── Mistake ──
    mistakeOverlay: {
        backgroundColor: '#E74C3C12',
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: '#E74C3C50',
        width: '100%',
    },
    mistakeEmoji: { fontSize: 32 },
    mistakeTitle: { fontSize: FontSizes.md, fontWeight: '900', color: '#E74C3C' },
    mistakeSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    reviveBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
    },
    reviveBtnDisabled: { opacity: 0.5 },
    reviveBtnText: { fontSize: FontSizes.sm, fontWeight: '800', color: '#FFFFFF' },
    giveUpBtn: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    giveUpText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.textMuted },

    // ── Game Over ──
    gameOverOverlay: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        width: '100%',
    },
    gameOverEmoji: { fontSize: 36 },
    gameOverTitle: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.textPrimary },
    gameOverSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    newRecord: { fontSize: FontSizes.sm, fontWeight: '900', color: Colors.solarGold },
    newGameBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.xs,
    },
    newGameText: { fontSize: FontSizes.sm, fontWeight: '800', color: '#FFFFFF' },

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
    adBtnDisabled: { opacity: 0.4, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    ecoNote: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
