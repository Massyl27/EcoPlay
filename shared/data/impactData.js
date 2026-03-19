/**
 * 📊 Données d'impact statiques — Play & Save
 *
 * Architecture 100% statique (Client-Side Only) :
 * Zéro base de données, zéro backend, zéro coût d'hébergement.
 *
 * Ces données sont mises à jour manuellement une fois par mois
 * pour garantir que 100% des revenus publicitaires sont reversés
 * à l'installation de panneaux solaires pour les hôpitaux.
 *
 * ➡️ Pour mettre à jour : modifiez simplement les valeurs ci-dessous
 *    puis redéployez l'application.
 */

const impactData = {
    /** Montant total collecté via les revenus publicitaires (en €) */
    totalCollected: 145.50,

    /** Nombre de panneaux solaires entièrement financés et installés */
    panelsFinanced: 0,

    /** Coût d'un panneau solaire (en €) — utilisé pour calculer la jauge */
    panelGoal: 300,

    /** Date de la dernière mise à jour manuelle des données */
    lastUpdated: "Février 2026",
};

export default impactData;
