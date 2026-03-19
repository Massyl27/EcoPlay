import React, { useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../theme';

interface GameCardProps {
    icon: string;
    name: string;
    description: string;
    color: string;
    onPress: () => void;
}

export function GameCard({
    icon,
    name,
    description,
    color,
    onPress,
}: GameCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.timing(scaleAnim, {
            toValue: 0.96,
            duration: 100,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={[styles.card]}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
                    <Text style={styles.icon}>{icon}</Text>
                </View>
                <Text style={styles.name}>{name}</Text>
                <Text style={styles.description}>{description}</Text>
                <View style={[styles.playButton, { backgroundColor: color }]}>
                    <Text style={styles.playButtonText}>Jouer →</Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.surface,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        ...Shadows.card,
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: BorderRadius.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    icon: {
        fontSize: 36,
    },
    name: {
        fontSize: FontSizes.lg,
        fontWeight: '800',
        color: Colors.textPrimary,
        marginBottom: Spacing.xs,
    },
    description: {
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        textAlign: 'center',
        marginBottom: Spacing.md,
        lineHeight: 20,
    },
    playButton: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm + 2,
        borderRadius: BorderRadius.full,
        width: '100%',
        alignItems: 'center',
    },
    playButtonText: {
        fontSize: FontSizes.sm,
        fontWeight: '700',
        color: Colors.background,
    },
});
