import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🐼 EcoMemory — Jeu de mémoire (animaux en voie de disparition)
// ══════════════════════════════════════════════════════════════
//
// • Grille 4×4 (16 cartes, 8 paires)
// • Emojis d'animaux en voie de disparition
// • Retourner 2 cartes : si paire → restent visibles
// • Sinon → se retournent après 1s
// • Compteur de coups
// • Rewarded Ad : révèle toutes les cartes 1.5s
//

// ── ANIMAUX EN VOIE DE DISPARITION ───────────────────────────

const ANIMALS = ['🐼', '🐅', '🐋', '🦧', '🐘', '🦍', '🐢', '🦏'];

const ANIMAL_NAMES: Record<string, string> = {
    '🐼': 'Panda',
    '🐅': 'Tigre',
    '🐋': 'Baleine',
    '🦧': 'Orang-outan',
    '🐘': 'Éléphant',
    '🦍': 'Gorille',
    '🐢': 'Tortue',
    '🦏': 'Rhinocéros',
};

// ── TYPES ────────────────────────────────────────────────────

interface Card {
    id: number;
    emoji: string;
    flipped: boolean;
    matched: boolean;
}

// ── MÉLANGE FISHER-YATES ─────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ── CRÉER LE JEU ─────────────────────────────────────────────

function createCards(): Card[] {
    // Créer les paires
    const emojis = [...ANIMALS, ...ANIMALS];
    const shuffled = shuffle(emojis);

    return shuffled.map((emoji, i) => ({
        id: i,
        emoji,
        flipped: false,
        matched: false,
    }));
}

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════

interface EcoMemoryProps {
    onGameEnd?: () => void;
}

export function EcoMemory({ onGameEnd }: EcoMemoryProps) {
    // ── État du jeu ──
    const [cards, setCards] = useState<Card[]>(() => createCards());
    const [flippedIds, setFlippedIds] = useState<number[]>([]);
    const [moves, setMoves] = useState(0);
    const [matchedPairs, setMatchedPairs] = useState(0);
    const [gameState, setGameState] = useState<'playing' | 'won'>('playing');
    const [isLocked, setIsLocked] = useState(false); // Empêche les clics pendant la vérification
    const [lastMatchedEmoji, setLastMatchedEmoji] = useState<string | null>(null);

    // ── Rewarded Ad ──
    const [adLoading, setAdLoading] = useState(false);
    const [peeking, setPeeking] = useState(false);

    // ── Record (meilleur score) ──
    const [bestScore, setBestScore] = useState<number | null>(null);

    // Timer ref pour le nettoyage
    const flipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Nombre total de paires ──
    const TOTAL_PAIRS = ANIMALS.length; // 8

    // ── Nettoyage des timers ──
    useEffect(() => {
        return () => {
            if (flipTimer.current) clearTimeout(flipTimer.current);
        };
    }, []);

    // ── Clic sur une carte ──
    const handleCardPress = useCallback((cardId: number) => {
        // Ignorer si le jeu est verrouillé, gagné, ou carte déjà retournée/matchée
        if (isLocked || gameState !== 'playing' || peeking) return;

        const card = cards.find(c => c.id === cardId);
        if (!card || card.flipped || card.matched) return;

        // Ne pas permettre plus de 2 cartes retournées
        if (flippedIds.length >= 2) return;

        // Retourner la carte
        const newCards = cards.map(c =>
            c.id === cardId ? { ...c, flipped: true } : c
        );
        setCards(newCards);

        const newFlipped = [...flippedIds, cardId];
        setFlippedIds(newFlipped);

        // Si 2 cartes retournées → vérifier la paire
        if (newFlipped.length === 2) {
            setMoves(m => m + 1);
            setIsLocked(true);

            const [firstId, secondId] = newFlipped;
            const first = newCards.find(c => c.id === firstId)!;
            const second = newCards.find(c => c.id === secondId)!;

            if (first.emoji === second.emoji) {
                // ── PAIRE TROUVÉE ──
                const matchedCards = newCards.map(c =>
                    c.id === firstId || c.id === secondId
                        ? { ...c, matched: true }
                        : c
                );
                setCards(matchedCards);
                setFlippedIds([]);
                setIsLocked(false);
                setLastMatchedEmoji(first.emoji);

                const newPairs = matchedPairs + 1;
                setMatchedPairs(newPairs);

                // Effacer le feedback après 1.5s
                setTimeout(() => setLastMatchedEmoji(null), 1500);

                // Vérifier victoire
                if (newPairs >= TOTAL_PAIRS) {
                    setGameState('won');
                    const finalMoves = moves + 1;
                    if (bestScore === null || finalMoves < bestScore) {
                        setBestScore(finalMoves);
                    }
                    onGameEnd?.();
                }
            } else {
                // ── PAS DE PAIRE → retourner après 1 seconde ──
                flipTimer.current = setTimeout(() => {
                    setCards(prev =>
                        prev.map(c =>
                            c.id === firstId || c.id === secondId
                                ? { ...c, flipped: false }
                                : c
                        )
                    );
                    setFlippedIds([]);
                    setIsLocked(false);
                }, 1000);
            }
        }
    }, [cards, flippedIds, isLocked, gameState, peeking, matchedPairs, moves, bestScore, onGameEnd, TOTAL_PAIRS]);

    // ── Rewarded Ad : révéler toutes les cartes 1.5s ──
    const handleAdWatch = useCallback(() => {
        if (adLoading || peeking || gameState !== 'playing') return;
        setAdLoading(true);

        // Simuler 2s de pub
        setTimeout(() => {
            setAdLoading(false);
            setPeeking(true);

            // Retourner toutes les cartes non matchées
            setCards(prev => prev.map(c => ({ ...c, flipped: true })));

            // Les cacher à nouveau après 1.5s
            setTimeout(() => {
                setCards(prev =>
                    prev.map(c => (c.matched ? c : { ...c, flipped: false }))
                );
                setPeeking(false);
            }, 1500);
        }, 2000);
    }, [adLoading, peeking, gameState]);

    // ── Nouvelle partie ──
    const handleRestart = useCallback(() => {
        setCards(createCards());
        setFlippedIds([]);
        setMoves(0);
        setMatchedPairs(0);
        setGameState('playing');
        setIsLocked(false);
        setPeeking(false);
        setLastMatchedEmoji(null);
    }, []);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── En-tête ── */}
            <View style={st.header}>
                <Text style={st.title}>🐼 Mémoire des Espèces</Text>
                <Text style={st.subtitle}>Retrouvez les paires d'animaux en danger</Text>
            </View>

            {/* ── Stats ── */}
            <View style={st.statsRow}>
                <View style={st.statPill}>
                    <Text style={st.statText}>🔄 {moves} coups</Text>
                </View>
                <View style={st.statPill}>
                    <Text style={st.statText}>✅ {matchedPairs}/{TOTAL_PAIRS} paires</Text>
                </View>
                {bestScore !== null && (
                    <View style={[st.statPill, st.statPillBest]}>
                        <Text style={[st.statText, st.statTextBest]}>🏆 Record : {bestScore}</Text>
                    </View>
                )}
            </View>

            {/* ── Feedback de paire trouvée ── */}
            {lastMatchedEmoji && (
                <View style={st.matchFeedback}>
                    <Text style={st.matchFeedbackText}>
                        {lastMatchedEmoji} {ANIMAL_NAMES[lastMatchedEmoji]} trouvé ! {lastMatchedEmoji}
                    </Text>
                </View>
            )}

            {/* ── Grille 4×4 ── */}
            <View style={st.grid}>
                {cards.map(card => {
                    const isVisible = card.flipped || card.matched;

                    return (
                        <Pressable
                            key={card.id}
                            onPress={() => handleCardPress(card.id)}
                            disabled={isVisible || isLocked || peeking}
                            style={[
                                st.card,
                                isVisible && st.cardFlipped,
                                card.matched && st.cardMatched,
                            ]}
                        >
                            {isVisible ? (
                                <Text style={st.cardEmoji}>{card.emoji}</Text>
                            ) : (
                                <View style={st.cardBack}>
                                    <Text style={st.cardBackIcon}>🌿</Text>
                                </View>
                            )}
                        </Pressable>
                    );
                })}
            </View>

            {/* ── Bouton indice (Rewarded Ad) ── */}
            {gameState === 'playing' && (
                <Pressable
                    onPress={handleAdWatch}
                    disabled={adLoading || peeking}
                    style={[st.adBtn, (adLoading || peeking) && st.adBtnDisabled]}
                >
                    <Text style={st.adBtnText}>
                        {adLoading
                            ? '📺 Chargement de la pub…'
                            : peeking
                                ? '👀 Mémorisez bien !'
                                : '👁️ Voir toutes les cartes (Vidéo 30s)'}
                    </Text>
                </Pressable>
            )}

            {/* ── Écran de victoire ── */}
            {gameState === 'won' && (
                <View style={st.winOverlay}>
                    <Text style={st.winEmoji}>🎉🐼🎉</Text>
                    <Text style={st.winTitle}>Toutes les espèces sauvées !</Text>
                    <Text style={st.winSubtitle}>
                        Terminé en {moves} coups
                        {bestScore === moves ? ' — Nouveau record ! 🏆' : ''}
                    </Text>

                    {/* ── Espèces sauvées ── */}
                    <View style={st.savedRow}>
                        {ANIMALS.map((a, i) => (
                            <View key={i} style={st.savedAnimal}>
                                <Text style={st.savedEmoji}>{a}</Text>
                                <Text style={st.savedName}>{ANIMAL_NAMES[a]}</Text>
                            </View>
                        ))}
                    </View>

                    <Pressable onPress={handleRestart} style={st.restartBtn}>
                        <Text style={st.restartText}>🔄 Nouvelle partie</Text>
                    </Pressable>
                </View>
            )}

            {/* ── Bouton restart pendant le jeu ── */}
            {gameState === 'playing' && (
                <Pressable onPress={handleRestart} style={st.restartBtnSmall}>
                    <Text style={st.restartSmallText}>🔄 Recommencer</Text>
                </Pressable>
            )}

            <Text style={st.ecoNote}>
                Chaque partie sensibilise à la protection des espèces menacées 🌍
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const CARD_SIZE = 72;
const GRID_GAP = 8;

const st = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.md,
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
    statsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
    statPill: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        paddingVertical: 4,
        paddingHorizontal: Spacing.sm + 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statPillBest: { borderColor: Colors.solarGold + '60', backgroundColor: Colors.solarGold + '10' },
    statText: { fontSize: FontSizes.xs, fontWeight: '700', color: Colors.textSecondary },
    statTextBest: { color: Colors.solarGold },

    // ── Match feedback ──
    matchFeedback: {
        backgroundColor: Colors.ecoGreen + '20',
        borderRadius: BorderRadius.md,
        paddingVertical: 6,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
    },
    matchFeedbackText: {
        fontSize: FontSizes.sm,
        fontWeight: '800',
        color: Colors.ecoGreen,
        textAlign: 'center',
    },

    // ── Grille 4×4 ──
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: GRID_GAP,
        maxWidth: CARD_SIZE * 4 + GRID_GAP * 3,
    },

    // ── Carte ──
    card: {
        width: CARD_SIZE,
        height: CARD_SIZE,
        borderRadius: BorderRadius.lg,
        backgroundColor: Colors.surface,
        borderWidth: 2,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cardFlipped: {
        backgroundColor: '#1A2744',
        borderColor: Colors.solarGold + '60',
    },
    cardMatched: {
        backgroundColor: Colors.ecoGreen + '15',
        borderColor: Colors.ecoGreen + '70',
    },
    cardEmoji: {
        fontSize: 32,
    },
    cardBack: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.lg - 2,
    },
    cardBackIcon: {
        fontSize: 24,
        opacity: 0.4,
    },

    // ── Ad button ──
    adBtn: {
        backgroundColor: Colors.solarGold + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        maxWidth: CARD_SIZE * 4 + GRID_GAP * 3,
        alignItems: 'center',
    },
    adBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.solarGold, textAlign: 'center' },

    // ── Win overlay ──
    winOverlay: {
        backgroundColor: Colors.ecoGreen + '12',
        borderRadius: BorderRadius.lg,
        padding: Spacing.xl,
        alignItems: 'center',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.ecoGreen + '50',
        width: '100%',
    },
    winEmoji: { fontSize: 36 },
    winTitle: { fontSize: FontSizes.lg, fontWeight: '900', color: Colors.ecoGreen },
    winSubtitle: { fontSize: FontSizes.sm, color: Colors.textSecondary, textAlign: 'center' },
    savedRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.sm,
    },
    savedAnimal: {
        alignItems: 'center',
        gap: 2,
    },
    savedEmoji: { fontSize: 22 },
    savedName: { fontSize: 8, color: Colors.textMuted, fontWeight: '700' },
    restartBtn: {
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.xl,
        marginTop: Spacing.sm,
    },
    restartText: { fontSize: FontSizes.sm, fontWeight: '800', color: '#FFFFFF' },

    // ── Restart small ──
    restartBtnSmall: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    restartSmallText: { fontSize: FontSizes.xs + 1, fontWeight: '700', color: Colors.textSecondary },

    ecoNote: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
