import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// 🌿 Eco-Wordle — Clone Wordle/Motus écologique complet
// ══════════════════════════════════════════════════════════════
//
// • Dictionnaire de mots français de 5 lettres liés à la nature/climat
// • Un mot par jour (basé sur Date locale)
// • 6 tentatives, grille 6×5, clavier AZERTY
// • Bouton « Regarder une vidéo pour un indice » (Rewarded Ad simulée)
// • Design Dark Mode avec verts/jaunes/gris
//

// ── 1. DICTIONNAIRE ÉCOLOGIQUE ────────────────────────────────
// Mots de 5 lettres strictement liés à la nature, au climat,
// à l'énergie et à l'environnement.
const ECO_WORDS: string[] = [
    // Nature & végétation
    'ARBRE', 'FLORE', 'HERBE', 'FORET', 'FEUIL',
    'SAULE', 'LILAS', 'HUMUS', 'MOUZE', 'TRONC',
    'GLAND', 'ALGUE', 'SABLE', 'DUNES', 'LIMON',
    // Eau & océans
    'OCEAN', 'PLUIE', 'ETANG', 'MAREE', 'VAGUE',
    'CORAL', 'DELTA', 'NAPPE', 'TORNT', 'GIVRE',
    // Climat & atmosphère
    'TERRE', 'MONDE', 'OZONE', 'NUAGE', 'BRUME',
    'ALIZE', 'BIOME', 'FONDU', 'METEO', 'ARIDE',
    // Faune
    'FAUNE', 'AIGLE', 'CERF0', 'LAPIN', 'LEZAR',
    'MERLE', 'BICHE', 'GRIVE', 'PERCH', 'LOTTE',
    // Énergie & écologie
    'SOLAR', 'EOLEI', 'CYCLE', 'DURAB', 'SOBRI',
    'RECYC', 'VERTU', 'SOBRE', 'ECOLO', 'FRUIT',
    // Paysages
    'PLAGE', 'ROCHE', 'FALAI', 'RAVIN', 'GROTT',
    'OMBRE', 'OASIS', 'PLEIN', 'NATUR', 'VERDE',
];

// Mots "propres" gardés pour la sélection quotidienne
// (mots courants facilement devinables)
const DAILY_WORDS: string[] = [
    'ARBRE', 'OCEAN', 'TERRE', 'FLORE', 'FAUNE',
    'PLUIE', 'OZONE', 'NUAGE', 'PLAGE', 'HERBE',
    'FORET', 'MONDE', 'GIVRE', 'CORAL', 'SABLE',
    'ALGUE', 'SAULE', 'DELTA', 'AIGLE', 'BIOME',
    'BRUME', 'MAREE', 'HUMUS', 'DUNES', 'MERLE',
    'SOBRE', 'OASIS', 'BICHE', 'FRUIT', 'ALIZE',
    'VAGUE', 'ETANG', 'CYCLE', 'GLAND', 'ROCHE',
    'METEO', 'OMBRE', 'LAPIN', 'TRONC', 'LIMON',
];

// ── 2. MOT DU JOUR ───────────────────────────────────────────
// Le même mot toute la journée pour tous les joueurs locaux.
function getWordOfDay(): string {
    const now = new Date();
    // Epoch de référence : 1er janvier 2025
    const epoch = new Date(2025, 0, 1).getTime();
    const dayIndex = Math.floor((now.getTime() - epoch) / 86_400_000);
    return DAILY_WORDS[((dayIndex % DAILY_WORDS.length) + DAILY_WORDS.length) % DAILY_WORDS.length];
}

// ── 3. ÉVALUATION D'UN ESSAI ─────────────────────────────────
type LetterStatus = 'correct' | 'present' | 'absent';

function evaluateGuess(guess: string, target: string): LetterStatus[] {
    const result: LetterStatus[] = Array(5).fill('absent');
    const targetArr = target.split('');
    const guessArr = guess.split('');
    const used = Array(5).fill(false);

    // Pass 1 — lettres bien placées (vert)
    for (let i = 0; i < 5; i++) {
        if (guessArr[i] === targetArr[i]) {
            result[i] = 'correct';
            used[i] = true;
        }
    }

    // Pass 2 — lettres mal placées (jaune)
    for (let i = 0; i < 5; i++) {
        if (result[i] === 'correct') continue;
        for (let j = 0; j < 5; j++) {
            if (!used[j] && guessArr[i] === targetArr[j]) {
                result[i] = 'present';
                used[j] = true;
                break;
            }
        }
    }

    return result;
}

// ── 4. CLAVIER AZERTY ────────────────────────────────────────
const KEYBOARD_ROWS = [
    ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'],
    ['ENTER', 'W', 'X', 'C', 'V', 'B', 'N', 'DEL'],
];

// ── 5. COULEURS DES STATUTS ──────────────────────────────────
const STATUS_BG: Record<LetterStatus, string> = {
    correct: '#27AE60',  // Vert vif — bien placée
    present: '#F5A623',  // Jaune/Or — mal placée
    absent: '#3A3A3C',   // Gris foncé — absente
};

// ══════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════

interface EcoWordleProps {
    onGameEnd?: () => void;
}

export function EcoWordle({ onGameEnd }: EcoWordleProps) {
    // ── État du jeu ──
    const [target] = useState<string>(getWordOfDay);
    const [guesses, setGuesses] = useState<string[]>([]);
    const [currentGuess, setCurrentGuess] = useState<string>('');
    const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing');
    const [shakeRow, setShakeRow] = useState<number | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // ── État du clavier coloré ──
    const [letterStatuses, setLetterStatuses] = useState<Record<string, LetterStatus>>({});

    // ── État du bouton indice (Rewarded Ad) ──
    const [hintLoading, setHintLoading] = useState(false);
    const [hintUsed, setHintUsed] = useState(false);
    const [revealedHint, setRevealedHint] = useState<number | null>(null);

    const MAX_GUESSES = 6;
    const WORD_LENGTH = 5;

    // ── Afficher un message temporaire ──
    const showMessage = useCallback((msg: string, duration = 2000) => {
        setMessage(msg);
        setTimeout(() => setMessage(null), duration);
    }, []);

    // ── Déterminer la première lettre non trouvée ──
    const getHintIndex = useCallback((): number | null => {
        const found = new Set<number>();

        // Parcourir tous les essais passés pour trouver les lettres correctes
        for (const guess of guesses) {
            const eval_ = evaluateGuess(guess, target);
            eval_.forEach((status, i) => {
                if (status === 'correct') found.add(i);
            });
        }

        // Retourner le premier index non trouvé
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (!found.has(i)) return i;
        }
        return null;
    }, [guesses, target]);

    // ── Rewarded Ad : simulation ──
    const handleHintPress = useCallback(() => {
        if (gameStatus !== 'playing' || hintLoading) return;

        setHintLoading(true);
        showMessage('📺 Chargement de la vidéo publicitaire…', 2500);

        // Simuler 2 secondes de chargement pub
        setTimeout(() => {
            setHintLoading(false);

            const idx = getHintIndex();
            if (idx !== null) {
                setRevealedHint(idx);
                showMessage(`💡 Indice : la lettre ${idx + 1} est « ${target[idx]} »`, 4000);
            } else {
                showMessage('🎉 Vous avez déjà trouvé toutes les lettres !', 2000);
            }
        }, 2000);
    }, [gameStatus, hintLoading, getHintIndex, target, showMessage]);

    // ── Mettre à jour les statuts du clavier ──
    const updateKeyboardStatuses = useCallback(
        (guess: string, evaluation: LetterStatus[]) => {
            setLetterStatuses((prev) => {
                const next = { ...prev };
                guess.split('').forEach((letter, i) => {
                    const newStatus = evaluation[i];
                    const current = next[letter];
                    // Hiérarchie : correct > present > absent
                    if (!current || newStatus === 'correct' ||
                        (newStatus === 'present' && current === 'absent')) {
                        next[letter] = newStatus;
                    }
                });
                return next;
            });
        },
        []
    );

    // ── Gestion des touches ──
    const handleKeyPress = useCallback(
        (key: string) => {
            if (gameStatus !== 'playing') return;

            // ── SUPPRIMER ──
            if (key === 'DEL') {
                setCurrentGuess((prev) => prev.slice(0, -1));
                return;
            }

            // ── VALIDER ──
            if (key === 'ENTER') {
                if (currentGuess.length !== WORD_LENGTH) {
                    setShakeRow(guesses.length);
                    showMessage('⚠️ Le mot doit faire 5 lettres');
                    setTimeout(() => setShakeRow(null), 500);
                    return;
                }

                // Évaluer l'essai
                const evaluation = evaluateGuess(currentGuess, target);
                const newGuesses = [...guesses, currentGuess];
                setGuesses(newGuesses);
                updateKeyboardStatuses(currentGuess, evaluation);

                // Victoire ?
                if (currentGuess === target) {
                    setGameStatus('won');
                    showMessage('🌿 Bravo ! Mot trouvé !', 5000);
                    onGameEnd?.();
                }
                // Défaite ?
                else if (newGuesses.length >= MAX_GUESSES) {
                    setGameStatus('lost');
                    showMessage(`Le mot était : ${target}`, 5000);
                }

                setCurrentGuess('');
                return;
            }

            // ── SAISIR UNE LETTRE ──
            if (currentGuess.length < WORD_LENGTH && /^[A-Z]$/.test(key)) {
                setCurrentGuess((prev) => prev + key);
            }
        },
        [currentGuess, guesses, target, gameStatus, updateKeyboardStatuses, showMessage, onGameEnd]
    );

    // ── Clavier physique (Web) ──
    useEffect(() => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') return;

        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                handleKeyPress('ENTER');
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                handleKeyPress('DEL');
            } else {
                const letter = e.key.toUpperCase();
                if (/^[A-Z]$/.test(letter)) {
                    e.preventDefault();
                    handleKeyPress(letter);
                }
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleKeyPress]);

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    // ── Rendu d'une ligne de la grille ──
    const renderGridRow = (rowIndex: number) => {
        const isGuessed = rowIndex < guesses.length;
        const isCurrent = rowIndex === guesses.length && gameStatus === 'playing';
        const guess = isGuessed ? guesses[rowIndex] : isCurrent ? currentGuess : '';
        const evaluation = isGuessed ? evaluateGuess(guess, target) : null;
        const isShaking = shakeRow === rowIndex;

        return (
            <View
                key={rowIndex}
                style={[styles.gridRow, isShaking && styles.gridRowShake]}
            >
                {Array.from({ length: WORD_LENGTH }).map((_, colIndex) => {
                    const letter = guess[colIndex] || '';
                    const status = evaluation?.[colIndex];

                    // Indice révélé (bordure spéciale)
                    const isHint = revealedHint === colIndex && !isGuessed;

                    return (
                        <View
                            key={colIndex}
                            style={[
                                styles.cell,
                                // État évalué → couleur de fond
                                status && { backgroundColor: STATUS_BG[status], borderColor: STATUS_BG[status] },
                                // Cellule remplie mais pas encore évaluée
                                !status && letter && styles.cellFilled,
                                // Indice révélé
                                isHint && styles.cellHint,
                            ]}
                        >
                            <Text
                                style={[
                                    styles.cellText,
                                    status && styles.cellTextEvaluated,
                                ]}
                            >
                                {letter}
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* ── Tag écologique ── */}
            <View style={styles.ecoTagRow}>
                <Text style={styles.ecoTag}>🌿 MOT ÉCOLOGIQUE DU JOUR</Text>
                {gameStatus === 'playing' && (
                    <Text style={styles.attemptCounter}>
                        {guesses.length}/{MAX_GUESSES}
                    </Text>
                )}
            </View>

            {/* ── Message contextuel ── */}
            {message && (
                <View style={styles.messageBanner}>
                    <Text style={styles.messageText}>{message}</Text>
                </View>
            )}

            {/* ── Grille 6×5 ── */}
            <View style={styles.grid}>
                {Array.from({ length: MAX_GUESSES }).map((_, i) => renderGridRow(i))}
            </View>

            {/* ── Bannière de fin ── */}
            {gameStatus !== 'playing' && (
                <View style={[
                    styles.endBanner,
                    gameStatus === 'won' ? styles.endBannerWon : styles.endBannerLost,
                ]}>
                    <Text style={styles.endEmoji}>
                        {gameStatus === 'won' ? '🌿' : '🍂'}
                    </Text>
                    <View style={styles.endTextContainer}>
                        <Text style={styles.endTitle}>
                            {gameStatus === 'won'
                                ? `Bravo ! Trouvé en ${guesses.length} essai${guesses.length > 1 ? 's' : ''} !`
                                : 'Dommage…'}
                        </Text>
                        <Text style={styles.endSubtitle}>
                            {gameStatus === 'won'
                                ? 'Revenez demain pour un nouveau mot 🌱'
                                : `Le mot était : ${target}`}
                        </Text>
                    </View>
                </View>
            )}

            {/* ── Bouton Indice — Rewarded Ad simulée ── */}
            {gameStatus === 'playing' && (
                <Pressable
                    onPress={handleHintPress}
                    disabled={hintLoading}
                    style={[
                        styles.hintButton,
                        hintLoading && styles.hintButtonDisabled,
                    ]}
                >
                    {hintLoading ? (
                        <Text style={styles.hintButtonText}>
                            📺 Chargement de la pub…
                        </Text>
                    ) : (
                        <Text style={styles.hintButtonText}>
                            💡 Bloqué ? Regarder une vidéo (30s) pour un indice
                        </Text>
                    )}
                </Pressable>
            )}

            {/* ── Clavier AZERTY virtuel ── */}
            <View style={styles.keyboard}>
                {KEYBOARD_ROWS.map((row, rowIndex) => (
                    <View key={rowIndex} style={styles.keyboardRow}>
                        {row.map((key) => {
                            const isSpecial = key === 'ENTER' || key === 'DEL';
                            const status = letterStatuses[key];

                            return (
                                <Pressable
                                    key={key}
                                    onPress={() => handleKeyPress(key)}
                                    style={({ pressed }) => [
                                        styles.key,
                                        isSpecial && styles.keyWide,
                                        status && { backgroundColor: STATUS_BG[status] },
                                        pressed && styles.keyPressed,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.keyText,
                                            isSpecial && styles.keyTextSpecial,
                                            status === 'correct' && { color: '#FFFFFF' },
                                            status === 'present' && { color: '#FFFFFF' },
                                        ]}
                                    >
                                        {key === 'ENTER' ? '⏎' : key === 'DEL' ? '⌫' : key}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* ── Note écologique ── */}
            <Text style={styles.ecoNote}>
                Les revenus financent des panneaux solaires 🌱
            </Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const CELL_SIZE = 52;
const CELL_GAP = 5;

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.md,
        width: '100%',
    },

    // ── Eco tag ──
    ecoTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    ecoTag: {
        fontSize: FontSizes.xs,
        color: Colors.ecoGreen,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    attemptCounter: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontWeight: '700',
    },

    // ── Message banner ──
    messageBanner: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    messageText: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
        textAlign: 'center',
    },

    // ── Grille ──
    grid: {
        gap: CELL_GAP,
    },
    gridRow: {
        flexDirection: 'row',
        gap: CELL_GAP,
    },
    gridRowShake: {
        // L'animation shake serait idéalement en Animated,
        // mais le décalage visuel suffit pour le feedback
        transform: [{ translateX: 4 }],
    },

    // ── Cellules ──
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        borderRadius: BorderRadius.sm,
        borderWidth: 2,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellFilled: {
        borderColor: Colors.textSecondary,
    },
    cellHint: {
        borderColor: Colors.ecoGreen,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    cellText: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.textPrimary,
    },
    cellTextEvaluated: {
        color: '#FFFFFF',
    },

    // ── Fin de partie ──
    endBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: BorderRadius.lg,
        padding: Spacing.md,
        gap: Spacing.md,
        borderWidth: 1,
    },
    endBannerWon: {
        backgroundColor: Colors.ecoGreen + '18',
        borderColor: Colors.ecoGreen + '60',
    },
    endBannerLost: {
        backgroundColor: Colors.error + '18',
        borderColor: Colors.error + '60',
    },
    endEmoji: {
        fontSize: 28,
    },
    endTextContainer: {
        flex: 1,
    },
    endTitle: {
        fontSize: FontSizes.sm,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: 2,
    },
    endSubtitle: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
    },

    // ── Bouton indice (Rewarded Ad) ──
    hintButton: {
        backgroundColor: Colors.solarGold + '18',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.solarGold + '50',
        width: '100%',
        maxWidth: CELL_SIZE * 5 + CELL_GAP * 4,
        alignItems: 'center',
    },
    hintButtonDisabled: {
        opacity: 0.6,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    hintButtonText: {
        fontSize: FontSizes.xs + 1,
        fontWeight: '700',
        color: Colors.solarGold,
        textAlign: 'center',
    },

    // ── Clavier AZERTY ──
    keyboard: {
        gap: 4,
        alignItems: 'center',
        width: '100%',
    },
    keyboardRow: {
        flexDirection: 'row',
        gap: 4,
        justifyContent: 'center',
    },
    key: {
        minWidth: 30,
        height: 42,
        borderRadius: BorderRadius.sm,
        backgroundColor: Colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    keyWide: {
        minWidth: 46,
        paddingHorizontal: 10,
    },
    keyPressed: {
        opacity: 0.7,
    },
    keyText: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    keyTextSpecial: {
        fontSize: 18,
    },

    // ── Note éco ──
    ecoNote: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
