import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme';

interface ProgressGaugeProps {
    current: number;
    goal: number;
    panelsInstalled: number;
}

export function ProgressGauge({
    current,
    goal,
    panelsInstalled,
}: ProgressGaugeProps) {
    const progress = Math.min(current / goal, 1);
    const widthAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: progress,
            duration: 800,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    const animatedWidth = widthAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Text style={styles.icon}>☀️</Text>
                    <Text style={styles.title}>Prochain panneau solaire</Text>
                </View>
                <Text style={styles.panelCount}>
                    {panelsInstalled} installé{panelsInstalled > 1 ? 's' : ''}
                </Text>
            </View>

            <View style={styles.barBackground}>
                <Animated.View
                    style={[
                        styles.barFill,
                        { width: animatedWidth },
                    ]}
                />
                <View style={styles.barShine} />
            </View>

            <View style={styles.footer}>
                <Text style={styles.currentValue}>
                    {current.toFixed(2)}€
                </Text>
                <Text style={styles.goalValue}>
                    Objectif : {goal}€
                </Text>
            </View>

            <Text style={styles.percentage}>
                {(progress * 100).toFixed(1)}%
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    icon: {
        fontSize: 22,
    },
    title: {
        fontSize: FontSizes.md,
        fontWeight: '700',
        color: Colors.textPrimary,
    },
    panelCount: {
        fontSize: FontSizes.xs,
        color: Colors.ecoGreen,
        fontWeight: '600',
        backgroundColor: Colors.surfaceLight,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
    },
    barBackground: {
        height: 20,
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.full,
        overflow: 'hidden',
        position: 'relative',
    },
    barFill: {
        height: '100%',
        borderRadius: BorderRadius.full,
        background: 'linear-gradient(90deg, #F5A623, #FFD580)',
        backgroundColor: Colors.solarGold,
    },
    barShine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderTopLeftRadius: BorderRadius.full,
        borderTopRightRadius: BorderRadius.full,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
    },
    currentValue: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.solarGold,
    },
    goalValue: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
    },
    percentage: {
        textAlign: 'center',
        fontSize: FontSizes.lg,
        fontWeight: '800',
        color: Colors.solarGoldLight,
        marginTop: Spacing.sm,
    },
});
