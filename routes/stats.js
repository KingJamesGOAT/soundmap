import { Router } from 'express';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : STATISTIQUES & AGRÉGATIONS MONGODB
 * ATTRIBUÉ À : Nabil
 * ============================================================================
 * Ce module exploite la puissance du framework d'agrégation de MongoDB
 * pour produire des métriques et tableaux de bord analytiques sur SoundMap.
 */

/**
 * @route   GET /api/zones/stats/overview  (ou /api/stats/overview)
 * @desc    Obtenir une vue d'ensemble statistique : nombre de musiques et score de votes par zone
 * @access  Public
 * @dev     Nabil
 * 
 * Cahier des charges pour Nabil :
 * Réaliser une requête d'agrégation MongoDB multi-étapes (`Music.aggregate([...])`) :
 * 
 * Étape 1 : $group
 *   Regrouper par zone (`_id: "$zone"`),
 *   Compter le nombre total de morceaux (`totalMusics: { $sum: 1 }`),
 *   Calculer la taille des tableaux de votes avec `$size` :
 *   `totalUpvotes: { $sum: { $size: { $ifNull: ["$upvotes", []] } } }`,
 *   `totalDownvotes: { $sum: { $size: { $ifNull: ["$downvotes", []] } } }`.
 * 
 * Étape 2 : $lookup
 *   Joindre les informations de la collection `zones` :
 *   `from: "zones", localField: "_id", foreignField: "_id", as: "zoneInfo"`.
 * 
 * Étape 3 : $unwind
 *   Décomposer le tableau `zoneInfo` généré par le lookup.
 * 
 * Étape 4 : $project
 *   Mettre en forme le résultat final (nom de la zone, coordonnées, totalMusics, upvotes, scoreNet).
 * 
 * Étape 5 : $sort
 *   Trier par popularité (ex: `totalMusics: -1`).
 */
router.get('/overview', (req, res) => {
  res.status(501).json({
    message: "Route d'agrégation statistique MongoDB non implémentée (Attribuée à Nabil).",
    route: "GET /api/zones/stats/overview",
    description: "Pipeline d'agrégation $group, $lookup, $project pour agréger musiques et votes par zone."
  });
});

export default router;
