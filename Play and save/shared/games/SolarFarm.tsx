import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { Colors, BorderRadius, Spacing, FontSizes } from '../theme';

// ══════════════════════════════════════════════════════════════
// ☀️ SolarFarm — Idle Game / Clicker écologique complet
// ══════════════════════════════════════════════════════════════
//
// • Clic sur le panneau solaire = +N Watts
// • Boutique d'améliorations avec auto-génération
// • Rewarded Ad : double les watts actuels
// • Design solar/eco Dark Mode
// • Stratégie : garder le joueur actif longtemps
//

// ── AMÉLIORATIONS ────────────────────────────────────────────

interface Upgrade {
    id: string;
    name: string;
    icon: string;
    description: string;
    baseCost: number;
    effect: string;
}

const UPGRADES: Upgrade[] = [
    {
        id: 'battery',
        name: 'Batterie de secours',
        icon: '🔋',
        description: '+1 Watt/s automatiquement',
        baseCost: 50,
        effect: 'autoWps',
    },
    {
        id: 'highPerf',
        name: 'Panneau Haute Performance',
        icon: '⚡',
        description: 'Le clic rapporte +5 Watts',
        baseCost: 200,
        effect: 'clickPower',
    },
    {
        id: 'turbine',
        name: 'Mini Éolienne',
        icon: '🌬️',
        description: '+3 Watts/s automatiquement',
        baseCost: 500,
        effect: 'autoWps3',
    },
    {
        id: 'network',
        name: 'Réseau de panneaux',
        icon: '🔗',
        description: 'Le clic rapporte +25 Watts',
        baseCost: 1500,
        effect: 'clickPower25',
    },
    {
        id: 'megabattery',
        name: 'Méga-Batterie',
        icon: '🏭',
        description: '+10 Watts/s automatiquement',
        baseCost: 5000,
        effect: 'autoWps10',
    },
];

// Coût avec scaling (×1.5 par niveau)
function upgradeCost(base: number, level: number): number {
    return Math.floor(base * Math.pow(1.5, level));
}

// ── MILESTONES ───────────────────────────────────────────────

const MILESTONES = [
    { watts: 100, label: '💡 Premier lampadaire alimenté' },
    { watts: 500, label: '🏠 Première maison éclairée' },
    { watts: 2000, label: '🏥 Hôpital connecté au réseau' },
    { watts: 10000, label: '🏘️ Quartier alimenté' },
    { watts: 50000, label: '🌆 Ville entière en solaire' },
    { watts: 200000, label: '🌍 Impact mondial !' },
];

// ══════════════════════════════════════════════════════════════
// COMPOSANT
// ══════════════════════════════════════════════════════════════

interface SolarFarmProps {
    onGameEnd?: () => void;
}

export function SolarFarm({ onGameEnd }: SolarFarmProps) {
    // ── État du jeu ──
    const [watts, setWatts] = useState(0);
    const [totalWatts, setTotalWatts] = useState(0); // Production totale cumulée
    const [clickPower, setClickPower] = useState(1);
    const [autoWps, setAutoWps] = useState(0); // Watts par seconde
    const [upgradeLevels, setUpgradeLevels] = useState<Record<string, number>>({});

    // ── Animations ──
    const clickScale = useRef(new Animated.Value(1)).current;
    const [clickFeedbacks, setClickFeedbacks] = useState<{ id: number; x: number; y: number }[]>([]);
    const feedbackId = useRef(0);

    // ── Rewarded Ad ──
    const [adLoading, setAdLoading] = useState(false);

    // ── Milestone atteint ──
    const [lastMilestone, setLastMilestone] = useState<string | null>(null);

    // ──────────────────────────────────────────────────────────
    // Auto-génération (Idle)
    // ──────────────────────────────────────────────────────────

    useEffect(() => {
        if (autoWps <= 0) return;

        const interval = setInterval(() => {
            setWatts(w => w + autoWps);
            setTotalWatts(t => t + autoWps);
        }, 1000);

        return () => clearInterval(interval);
    }, [autoWps]);

    // ──────────────────────────────────────────────────────────
    // Milestones
    // ──────────────────────────────────────────────────────────

    useEffect(() => {
        const reached = MILESTONES.filter(m => totalWatts >= m.watts);
        if (reached.length > 0) {
            const latest = reached[reached.length - 1];
            if (latest.label !== lastMilestone) {
                setLastMilestone(latest.label);
            }
        }
    }, [totalWatts, lastMilestone]);

    // ──────────────────────────────────────────────────────────
    // Clic sur le panneau
    // ──────────────────────────────────────────────────────────

    const handleClick = useCallback(() => {
        setWatts(w => w + clickPower);
        setTotalWatts(t => t + clickPower);

        // Animation de rebond
        Animated.sequence([
            Animated.timing(clickScale, { toValue: 0.9, duration: 60, useNativeDriver: true }),
            Animated.timing(clickScale, { toValue: 1.05, duration: 80, useNativeDriver: true }),
            Animated.timing(clickScale, { toValue: 1, duration: 60, useNativeDriver: true }),
        ]).start();

        // Feedback visuel "+N"
        const id = feedbackId.current++;
        setClickFeedbacks(prev => [...prev, { id, x: -20 + Math.random() * 40, y: 0 }]);
        setTimeout(() => {
            setClickFeedbacks(prev => prev.filter(f => f.id !== id));
        }, 800);
    }, [clickPower, clickScale]);

    // ──────────────────────────────────────────────────────────
    // Acheter une amélioration
    // ──────────────────────────────────────────────────────────

    const handleUpgrade = useCallback((upgrade: Upgrade) => {
        const level = upgradeLevels[upgrade.id] || 0;
        const cost = upgradeCost(upgrade.baseCost, level);
        if (watts < cost) return;

        setWatts(w => w - cost);
        setUpgradeLevels(prev => ({ ...prev, [upgrade.id]: level + 1 }));

        // Appliquer l'effet
        switch (upgrade.effect) {
            case 'autoWps':
                setAutoWps(a => a + 1);
                break;
            case 'clickPower':
                setClickPower(p => p + 5);
                break;
            case 'autoWps3':
                setAutoWps(a => a + 3);
                break;
            case 'clickPower25':
                setClickPower(p => p + 25);
                break;
            case 'autoWps10':
                setAutoWps(a => a + 10);
                break;
        }
    }, [watts, upgradeLevels]);

    // ──────────────────────────────────────────────────────────
    // Rewarded Ad : doubler les watts
    // ──────────────────────────────────────────────────────────

    const handleAdWatch = useCallback(() => {
        if (adLoading) return;
        setAdLoading(true);

        setTimeout(() => {
            setAdLoading(false);
            setWatts(w => w * 2);
        }, 2000);
    }, [adLoading]);

    // ──────────────────────────────────────────────────────────
    // Formatage des nombres
    // ──────────────────────────────────────────────────────────

    const formatNum = (n: number): string => {
        if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
        if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
        return Math.floor(n).toString();
    };

    // Milestone atteint (index)
    const milestoneIdx = MILESTONES.filter(m => totalWatts >= m.watts).length;
    const nextMilestone = MILESTONES[milestoneIdx];
    const milestoneProgress = nextMilestone
        ? Math.min(100, ((totalWatts - (milestoneIdx > 0 ? MILESTONES[milestoneIdx - 1].watts : 0)) /
            (nextMilestone.watts - (milestoneIdx > 0 ? MILESTONES[milestoneIdx - 1].watts : 0))) * 100)
        : 100;

    // ══════════════════════════════════════════════════════════
    // RENDU
    // ══════════════════════════════════════════════════════════

    return (
        <View style={st.container}>
            {/* ── Score principal ── */}
            <View style={st.scoreSection}>
                <Text style={st.wattsValue}>{formatNum(watts)}</Text>
                <Text style={st.wattsLabel}>⚡ Watts</Text>
                <View style={st.statsRow}>
                    <View style={st.statPill}>
                        <Text style={st.statIcon}>👆</Text>
                        <Text style={st.statText}>+{formatNum(clickPower)}/clic</Text>
                    </View>
                    <View style={st.statPill}>
                        <Text style={st.statIcon}>⏱️</Text>
                        <Text style={st.statText}>+{formatNum(autoWps)}/s</Text>
                    </View>
                    <View style={st.statPill}>
                        <Text style={st.statIcon}>📊</Text>
                        <Text style={st.statText}>{formatNum(totalWatts)} total</Text>
                    </View>
                </View>
            </View>

            {/* ── Bouton panneau solaire (Clicker) ── */}
            <View style={st.clickerSection}>
                <Animated.View style={[st.solarBtnOuter, { transform: [{ scale: clickScale }] }]}>
                    <Pressable onPress={handleClick} style={st.solarBtn}>
                        {/* Grille solaire */}
                        <View style={st.solarGrid}>
                            {Array.from({ length: 9 }).map((_, i) => (
                                <View key={i} style={st.solarCell} />
                            ))}
                        </View>
                        <Text style={st.solarEmoji}>☀️</Text>
                    </Pressable>

                    {/* Feedbacks "+N" flottants */}
                    {clickFeedbacks.map(fb => (
                        <Text key={fb.id} style={[st.clickFeedback, { left: 50 + fb.x }]}>
                            +{clickPower}
                        </Text>
                    ))}
                </Animated.View>
                <Text style={st.clickHint}>Touchez le panneau pour générer de l'énergie !</Text>
            </View>

            {/* ── Milestone / Progression ── */}
            <View style={st.milestoneSection}>
                {lastMilestone && (
                    <Text style={st.milestoneAchieved}>{lastMilestone}</Text>
                )}
                {nextMilestone && (
                    <View style={st.milestoneNextRow}>
                        <Text style={st.milestoneNext}>
                            Prochain : {nextMilestone.label} ({formatNum(nextMilestone.watts)} W)
                        </Text>
                        <View style={st.milestoneBar}>
                            <View style={[st.milestoneFill, { width: `${milestoneProgress}%` }]} />
                        </View>
                    </View>
                )}
            </View>

            {/* ── Bouton Rewarded Ad : doubler les watts ── */}
            <Pressable
                onPress={handleAdWatch}
                disabled={adLoading}
                style={[st.adBtn, adLoading && st.adBtnDisabled]}
            >
                <Text style={st.adBtnText}>
                    {adLoading
                        ? '📺 Chargement de la pub…'
                        : '⚡ Doubler mes Watts (Vidéo 30s)'}
                </Text>
            </Pressable>

            {/* ── Boutique d'améliorations ── */}
            <View style={st.shopSection}>
                <Text style={st.shopTitle}>🏪 Améliorations</Text>
                {UPGRADES.map(upgrade => {
                    const level = upgradeLevels[upgrade.id] || 0;
                    const cost = upgradeCost(upgrade.baseCost, level);
                    const canAfford = watts >= cost;

                    return (
                        <Pressable
                            key={upgrade.id}
                            onPress={() => handleUpgrade(upgrade)}
                            disabled={!canAfford}
                            style={[st.upgradeCard, !canAfford && st.upgradeCardLocked]}
                        >
                            <View style={st.upgradeLeft}>
                                <Text style={st.upgradeIcon}>{upgrade.icon}</Text>
                                <View style={st.upgradeInfo}>
                                    <Text style={st.upgradeName}>
                                        {upgrade.name}
                                        {level > 0 && <Text style={st.upgradeLevel}> (Niv.{level})</Text>}
                                    </Text>
                                    <Text style={st.upgradeDesc}>{upgrade.description}</Text>
                                </View>
                            </View>
                            <View style={[st.upgradeCost, canAfford && st.upgradeCostAfford]}>
                                <Text style={[st.upgradeCostText, canAfford && st.upgradeCostTextAfford]}>
                                    {formatNum(cost)} W
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>

            <Text style={st.ecoNote}>Chaque watt généré finance de vrais panneaux solaires 🌱</Text>
        </View>
    );
}

// ══════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════

const SOLAR_BLUE = '#1A2744';
const SOLAR_BORDER = '#4A6FA5';
const GOLD = Colors.solarGold;

const st = StyleSheet.create({
    container: {
        alignItems: 'center',
        gap: Spacing.md,
        width: '100%',
    },

    // ── Score ──
    scoreSection: { alignItems: 'center', gap: 4 },
    wattsValue: {
        fontSize: 44,
        fontWeight: '900',
        color: GOLD,
        letterSpacing: -1,
    },
    wattsLabel: {
        fontSize: FontSizes.md,
        fontWeight: '700',
        color: Colors.textSecondary,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    statsRow: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.full,
        paddingVertical: 3,
        paddingHorizontal: Spacing.sm + 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    statIcon: { fontSize: 10 },
    statText: { fontSize: 10, fontWeight: '700', color: Colors.textSecondary },

    // ── Clicker ──
    clickerSection: {
        alignItems: 'center',
        gap: Spacing.sm,
        marginVertical: Spacing.sm,
    },
    solarBtnOuter: {
        width: 130,
        height: 130,
        position: 'relative',
    },
    solarBtn: {
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: SOLAR_BLUE,
        borderWidth: 3,
        borderColor: SOLAR_BORDER,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: GOLD,
        shadowOpacity: 0.3,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
        overflow: 'hidden',
    },
    solarGrid: {
        position: 'absolute',
        width: 90,
        height: 90,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 2,
        opacity: 0.3,
    },
    solarCell: {
        width: 28,
        height: 28,
        backgroundColor: '#2D4F7A',
        borderWidth: 1,
        borderColor: '#4A6FA540',
        borderRadius: 2,
    },
    solarEmoji: { fontSize: 48, zIndex: 2 },
    clickFeedback: {
        position: 'absolute',
        top: -10,
        fontSize: 18,
        fontWeight: '900',
        color: GOLD,
        zIndex: 10,
    },
    clickHint: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
    },

    // ── Milestones ──
    milestoneSection: {
        width: '100%',
        gap: 4,
    },
    milestoneAchieved: {
        fontSize: FontSizes.xs + 1,
        fontWeight: '700',
        color: Colors.ecoGreen,
        textAlign: 'center',
    },
    milestoneNextRow: { gap: 4 },
    milestoneNext: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        textAlign: 'center',
    },
    milestoneBar: {
        height: 6,
        backgroundColor: Colors.surface,
        borderRadius: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    milestoneFill: {
        height: '100%',
        backgroundColor: Colors.ecoGreen,
        borderRadius: 3,
    },

    // ── Ad Button ──
    adBtn: {
        backgroundColor: GOLD + '20',
        borderRadius: BorderRadius.lg,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.lg,
        borderWidth: 1,
        borderColor: GOLD + '50',
        width: '100%',
        alignItems: 'center',
    },
    adBtnDisabled: { opacity: 0.5, backgroundColor: Colors.surface, borderColor: Colors.border },
    adBtnText: { fontSize: FontSizes.sm, fontWeight: '700', color: GOLD, textAlign: 'center' },

    // ── Shop ──
    shopSection: {
        width: '100%',
        gap: Spacing.sm,
    },
    shopTitle: {
        fontSize: FontSizes.md,
        fontWeight: '800',
        color: Colors.textPrimary,
    },
    upgradeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    upgradeCardLocked: {
        opacity: 0.45,
    },
    upgradeLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    upgradeIcon: { fontSize: 28 },
    upgradeInfo: { flex: 1 },
    upgradeName: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.textPrimary },
    upgradeLevel: { color: Colors.ecoGreen, fontWeight: '800' },
    upgradeDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 1 },
    upgradeCost: {
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.md,
        paddingVertical: 4,
        paddingHorizontal: Spacing.sm + 2,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    upgradeCostAfford: {
        backgroundColor: GOLD + '20',
        borderColor: GOLD + '50',
    },
    upgradeCostText: { fontSize: FontSizes.xs, fontWeight: '800', color: Colors.textMuted },
    upgradeCostTextAfford: { color: GOLD },

    ecoNote: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: Spacing.xs,
    },
});
