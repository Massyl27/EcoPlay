import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSizes, Spacing, BorderRadius } from '../shared/theme';
import { GameCard } from '../shared/components/GameCard';

const GAMES = [
    {
        id: 'sudoku',
        icon: '🔢',
        name: 'Sudoku',
        description: 'Remplissez la grille 9×9 avec logique et patience.',
        color: '#3B82F6',
    },
    {
        id: '2048',
        icon: '🎯',
        name: '2048',
        description: 'Combinez les tuiles pour atteindre le nombre 2048 !',
        color: Colors.solarGold,
    },
    {
        id: 'minesweeper',
        icon: '💣',
        name: 'Démineur',
        description: 'Dévoilez les cases sans toucher de mine.',
        color: Colors.ecoGreen,
    },
    {
        id: 'ecowordle',
        icon: '🌿',
        name: 'Eco-Wordle',
        description: 'Devinez le mot écologique du jour en 6 essais.',
        color: '#27AE60',
    },
    {
        id: 'picross',
        icon: '🧩',
        name: 'Picross',
        description: 'Résolvez le puzzle en suivant les indices chiffrés.',
        color: '#E67E22',
    },
    {
        id: 'chess',
        icon: '♟️',
        name: 'Échecs',
        description: 'Le roi des jeux de stratégie, en local 1v1.',
        color: '#95A5A6',
    },
    {
        id: 'blockpuzzle',
        icon: '🧱',
        name: 'Block Puzzle',
        description: 'Placez des pièces et effacez lignes et colonnes.',
        color: '#E74C3C',
    },
    {
        id: 'snake',
        icon: '🐍',
        name: 'Snake',
        description: 'Guidez le serpent et mangez les pommes sans vous mordre.',
        color: '#1ABC9C',
    },
    {
        id: 'ecoflappy',
        icon: '🐝',
        name: 'Eco-Flappy',
        description: 'Aidez l\'abeille à éviter les cheminées polluantes !',
        color: '#F1C40F',
    },
    {
        id: 'solarfarm',
        icon: '☀️',
        name: 'Solar Farm',
        description: 'Construisez votre ferme solaire — idle clicker !',
        color: '#F5A623',
    },
    {
        id: 'ecosort',
        icon: '♻️',
        name: 'Eco-Sort',
        description: 'Triez les déchets dans les bonnes poubelles !',
        color: '#2ECC71',
    },
    {
        id: 'ecomemory',
        icon: '🐼',
        name: 'Eco-Memory',
        description: 'Retrouvez les paires d\'animaux en danger !',
        color: '#9B59B6',
    },
    {
        id: 'oceanmatch',
        icon: '🌊',
        name: 'OceanMatch',
        description: 'Nettoyez l\'océan en alignant les déchets !',
        color: '#0D47A1',
    },
    {
        id: 'windtower',
        icon: '🌬️',
        name: 'WindTower',
        description: 'Empilez les sections d\'éolienne !',
        color: '#0097A7',
    },
    {
        id: 'simonenergy',
        icon: '⚡',
        name: 'SimonEnergy',
        description: 'Mémorisez la séquence d\'énergie !',
        color: '#FF8F00',
    },
    {
        id: 'ecowhack',
        icon: '🔨',
        name: 'EcoWhack',
        description: 'Tapez les déchets, protégez les animaux !',
        color: '#D32F2F',
    },
    {
        id: 'naturemahjong',
        icon: '🀄',
        name: 'NatureMahjong',
        description: 'Associez les tuiles de la biodiversité !',
        color: '#00695C',
    },
];


export default function GamesMenuScreen() {
    const router = useRouter();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Nos jeux open-source 🎮</Text>
                <Text style={styles.subtitle}>
                    Chaque partie génère des revenus pour installer{'\n'}
                    des panneaux solaires. Choisissez votre jeu !
                </Text>
            </View>

            {/* Game Grid */}
            <View style={styles.grid}>
                {GAMES.map((game) => (
                    <View key={game.id} style={styles.gridItem}>
                        <GameCard
                            icon={game.icon}
                            name={game.name}
                            description={game.description}
                            color={game.color}
                            onPress={() => router.push(`/game/${game.id}`)}
                        />
                    </View>
                ))}
            </View>

            {/* Info banner */}
            <View style={styles.infoBanner}>
                <Text style={styles.infoIcon}>💡</Text>
                <Text style={styles.infoText}>
                    Tous nos jeux sont open-source et gratuits.
                    Les revenus proviennent uniquement des publicités volontaires.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
        maxWidth: 700,
        width: '100%',
        alignSelf: 'center',
    },
    header: {
        marginBottom: Spacing.xl,
    },
    title: {
        fontSize: FontSizes.xl,
        fontWeight: '900',
        color: Colors.textPrimary,
        marginBottom: Spacing.sm,
    },
    subtitle: {
        fontSize: FontSizes.md,
        color: Colors.textSecondary,
        lineHeight: 24,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.md,
        marginBottom: Spacing.xl,
    },
    gridItem: {
        flexBasis: '47%',
        flexGrow: 1,
        minWidth: 250,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: Colors.surfaceLight,
        borderRadius: BorderRadius.lg,
        padding: Spacing.lg,
        gap: Spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: Colors.ecoGreen,
    },
    infoIcon: {
        fontSize: 20,
    },
    infoText: {
        flex: 1,
        fontSize: FontSizes.sm,
        color: Colors.textSecondary,
        lineHeight: 22,
    },
});
