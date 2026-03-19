import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme';

export function AdBanner() {
    return (
        <View style={styles.container}>
            <View style={styles.badge}>
                <Text style={styles.badgeText}>AD</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.adText}>Espace publicitaire</Text>
                <Text style={styles.subText}>
                    Les revenus financent des panneaux solaires 🌱
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.md,
        padding: Spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
        borderStyle: 'dashed',
        gap: Spacing.md,
    },
    badge: {
        backgroundColor: Colors.solarGold + '30',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: BorderRadius.sm,
    },
    badgeText: {
        fontSize: FontSizes.xs,
        fontWeight: '800',
        color: Colors.solarGold,
        letterSpacing: 1,
    },
    content: {
        flex: 1,
    },
    adText: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        fontWeight: '600',
    },
    subText: {
        fontSize: FontSizes.xs,
        color: Colors.textMuted,
        marginTop: 2,
    },
});
