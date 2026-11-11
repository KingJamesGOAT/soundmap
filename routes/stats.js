import { Router } from 'express';
import Music from '../models/Music.js';
import User from '../models/User.js';
import Zone from '../models/Zone.js';

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
 *   Mettre en forme le résultat final (zoneId, zoneName, compteurs, averageScore, genres).
 * 
 * Étape 5 : $sort
 *   Trier par popularité (ex: `totalMusics: -1`).
 */
router.get('/overview', async (req, res, next) => {
  try {
    // Nombre de votes d'une musique (tableau vide si le champ est absent)
    const upvotesCount = { $size: { $ifNull: ['$upvotes', []] } };
    const downvotesCount = { $size: { $ifNull: ['$downvotes', []] } };

    const [zonesStats, totalMusics, totalUsers] = await Promise.all([
      Music.aggregate([
        // Étape 1 : regroupement des musiques par zone et calcul des compteurs
        {
          $group: {
            _id: '$zone',
            totalMusics: { $sum: 1 },
            totalUpvotes: { $sum: upvotesCount },
            totalDownvotes: { $sum: downvotesCount },
            averageScore: { $avg: { $subtract: [upvotesCount, downvotesCount] } },
            genres: { $addToSet: '$genre' }
          }
        },
        // Étape 2 : jointure avec la collection des zones pour récupérer leur nom
        {
          $lookup: {
            from: Zone.collection.name,
            localField: '_id',
            foreignField: '_id',
            as: 'zoneInfo'
          }
        },
        // Étape 3 : un seul document zone par groupe (conservé même si la zone a été supprimée)
        { $unwind: { path: '$zoneInfo', preserveNullAndEmptyArrays: true } },
        // Étape 4 : mise en forme de la sortie
        {
          $project: {
            _id: 0,
            zoneId: '$_id',
            zoneName: '$zoneInfo.name',
            totalMusics: 1,
            totalUpvotes: 1,
            totalDownvotes: 1,
            averageScore: { $round: ['$averageScore', 2] },
            genres: 1
          }
        },
        // Étape 5 : zones les plus actives en premier (puis par nom pour un ordre stable)
        { $sort: { totalMusics: -1, zoneName: 1 } }
      ]),
      Music.countDocuments(),
      User.countDocuments()
    ]);

    return res.status(200).json({
      globalStats: { totalMusics, totalUsers },
      zonesStats
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
