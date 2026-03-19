import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme';

interface ImpactCounterProps {
    label: string;
    value: number;
    suffix?: string;
    icon: string;
    color?: string;
}

export function ImpactCounter({
    label,
    value,
    suffix = '',
    icon,
    color = Colors.solarGold,
}: ImpactCounterProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 1.08,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start();
    }, [Math.floor(value)]);

    const formatValue = (val: number) => {
        if (suffix === '€') {
            return val.toFixed(2);
        }
        return val.toLocaleString('fr-FR');
    };

    return (
        <Animated.View
            style={[styles.container, { transform: [{ scale: scaleAnim }] }]}
        >
            <Text style={styles.icon}>{icon}</Text>
            <Text style={[styles.value, { color }]}>
                {formatValue(value)}
                {suffix}
            </Text>
            <Text style={styles.label}>{label}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        minWidth: 140,
    },
    icon: {
        fontSize: 32,
        marginBottom: Spacing.sm,
    },
    value: {
        fontSize: FontSizes.xl,
        fontWeight: '800',
        marginBottom: Spacing.xs,
    },
    label: {
        fontSize: FontSizes.xs,
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
    },
});
