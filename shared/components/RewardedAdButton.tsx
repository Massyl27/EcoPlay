import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
    Animated,
    Alert,
    Platform,
} from 'react-native';
import { Colors, FontSizes, Spacing, BorderRadius, Shadows } from '../theme';

interface RewardedAdButtonProps {
    onRewardEarned?: () => void;
}

export function RewardedAdButton({ onRewardEarned }: RewardedAdButtonProps) {
    const [loading, setLoading] = useState(false);
    const [rewarded, setRewarded] = useState(false);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    // Continuous pulse animation
    React.useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.03,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const handlePress = () => {
        setLoading(true);

        // Simulate watching an ad
        setTimeout(() => {
            setLoading(false);
            setRewarded(true);

            Animated.timing(glowAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: false,
            }).start();

            onRewardEarned?.();

            if (Platform.OS === 'web') {
                // Use a simple timeout message for web
                setTimeout(() => {
                    setRewarded(false);
                    glowAnim.setValue(0);
                }, 3000);
            } else {
                Alert.alert(
                    '🎉 Impact doublé !',
                    'Merci ! Votre contribution a été doublée.',
                    [
                        {
                            text: 'Super !',
                            onPress: () => {
                                setRewarded(false);
                                glowAnim.setValue(0);
                            },
                        },
                    ]
                );
            }
        }, 2000);
    };

    const glowColor = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['rgba(46, 204, 113, 0)', 'rgba(46, 204, 113, 0.3)'],
    });

    return (
        <Animated.View
            style={[
                styles.wrapper,
                { transform: [{ scale: pulseAnim }] },
            ]}
        >
            <Animated.View
                style={[styles.glowLayer, { backgroundColor: glowColor }]}
            />
            <Pressable
                onPress={handlePress}
                disabled={loading || rewarded}
                style={[
                    styles.button,
                    rewarded && styles.buttonRewarded,
                ]}
            >
                <Text style={styles.buttonIcon}>
                    {loading ? '⏳' : rewarded ? '✅' : '🎬'}
                </Text>
                <View style={styles.textContainer}>
                    <Text style={styles.buttonTitle}>
                        {loading
                            ? 'Chargement de la vidéo...'
                            : rewarded
                                ? 'Impact doublé ! Merci !'
                                : 'Regarder une vidéo'}
                    </Text>
                    {!loading && !rewarded && (
                        <Text style={styles.buttonSubtitle}>
                            pour doubler votre impact 🌍
                        </Text>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        position: 'relative',
    },
    glowLayer: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BorderRadius.lg,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.ecoGreen,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.md,
        ...Shadows.card,
    },
    buttonRewarded: {
        backgroundColor: Colors.ecoGreenDark,
    },
    buttonIcon: {
        fontSize: 28,
    },
    textContainer: {
        flex: 1,
    },
    buttonTitle: {
        fontSize: FontSizes.md,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    buttonSubtitle: {
        fontSize: FontSizes.sm,
        color: 'rgba(255,255,255,0.85)',
        marginTop: 2,
    },
});
