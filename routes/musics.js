import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middlewares/auth.js';
import Music from '../models/Music.js';
import Zone from '../models/Zone.js';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : MUSIQUES & VOTES
 * ATTRIBUÉ À : Ryad (Création, modification, suppression, votes, validation GPS)
 *              & Nabil (Consultation paginée et filtres)
 * ============================================================================
 */

/**
 * Calcule la distance géodésique en mètres entre deux coordonnées géographiques [lng, lat]
 * en utilisant la formule standard de Haversine.
 * 
 * ⚠️ RAPPEL GÉOSPATIAL : L'ordre des coordonnées est toujours [LONGITUDE, LATITUDE] !
 * 
 * @param {[number, number]} coord1 - [lng1, lat1]
 * @param {[number, number]} coord2 - [lng2, lat2]
 * @returns {number} Distance en mètres
 */
function calculateDistanceInMeters(coord1, coord2) {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const EARTH_RADIUS_METERS = 6371000;
  const toRadians = (degrees) => (degrees * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * @route   GET /api/musics/:id
 * @desc    Récupérer les détails complets d'un morceau musical
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const music = await Music.findById(req.params.id)
      .populate('postedBy', 'username role')
      .populate('zone', 'name location radius');

    if (!music) {
      return res.status(404).json({
        error: `Aucune musique trouvée avec l'identifiant ${req.params.id}.`
      });
    }

    return res.status(200).json(music);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   POST /api/musics
 * @desc    Déposer une nouvelle recommandation musicale dans une zone avec contrôle GPS strict
 * @access  Privé (authenticate)
 * @dev     Ryad
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, artist, genre, url, links, zoneId, userCoordinates } = req.body ?? {};

    // 1. Validation des champs textuels obligatoires
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Le titre de la musique est obligatoire.' });
    }
    if (!artist || typeof artist !== 'string' || artist.trim().length === 0) {
      return res.status(400).json({ error: "L'artiste de la musique est obligatoire." });
    }
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({ error: "L'URL de la musique est obligatoire." });
    }
    if (!zoneId) {
      return res.status(400).json({ error: "L'identifiant de la zone (zoneId) est obligatoire." });
    }

    // 2. Vérification obligatoire de l'existence de la Zone liée (Exigence officielle Simon & Loris)
    const targetZone = await Zone.findById(zoneId);
    if (!targetZone) {
      return res.status(404).json({
        error: `La zone spécifiée avec l'identifiant "${zoneId}" n'existe pas.`
      });
    }

    // 3. Validation de la géolocalisation de l'utilisateur
    if (
      !Array.isArray(userCoordinates) ||
      userCoordinates.length !== 2 ||
      typeof userCoordinates[0] !== 'number' ||
      typeof userCoordinates[1] !== 'number'
    ) {
      return res.status(400).json({
        error: 'Les coordonnées GPS de l’utilisateur sont requises sous la forme [longitude, latitude].'
      });
    }

    const [userLng, userLat] = userCoordinates;
    if (userLng < -180 || userLng > 180 || userLat < -90 || userLat > 90) {
      return res.status(400).json({
        error: 'Coordonnées GPS hors limites valides (-180 <= lng <= 180, -90 <= lat <= 90).'
      });
    }

    // Calcul de la distance entre l'utilisateur et le centre de la zone
    const zoneCenterCoords = targetZone.location.coordinates;
    const distanceMeters = calculateDistanceInMeters([userLng, userLat], zoneCenterCoords);
    const maxRadius = targetZone.radius || 500;

    if (distanceMeters > maxRadius) {
      return res.status(400).json({
        error: `Dépôt refusé : vous êtes situé à environ ${Math.round(distanceMeters)}m du centre de la zone, ce qui dépasse son rayon autorisé de ${maxRadius}m.`,
        distanceInMeters: Math.round(distanceMeters),
        maxRadiusAllowed: maxRadius
      });
    }

    // 4. Création de la ressource musicale
    const authorId = req.currentUserId || req.user?.userId;
    const music = new Music({
      title: title.trim(),
      artist: artist.trim(),
      genre: genre ? genre.trim() : 'Autre',
      url: url.trim(),
      links: links || {},
      zone: targetZone._id,
      postedBy: authorId,
      upvotes: [],
      downvotes: []
    });

    await music.save();

    return res.status(201).json(music);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   PATCH /api/musics/:id
 * @desc    Mettre à jour les informations d'un morceau musical
 * @access  Privé - Auteur du morceau ou Administrateur (authenticate)
 * @dev     Ryad
 */
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const music = await Music.findById(req.params.id);
    if (!music) {
      return res.status(404).json({
        error: `Aucune musique trouvée avec l'identifiant ${req.params.id}.`
      });
    }

    // Vérification stricte des autorisations : Seul l'auteur ou un admin peut modifier
    const currentUserId = req.currentUserId || req.user?.userId;
    const isOwner = music.postedBy.toString() === currentUserId;
    const isAdmin =
      req.user?.role === 'admin' ||
      req.currentUserPermissions?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Accès interdit. Vous ne pouvez modifier que les musiques que vous avez publiées.'
      });
    }

    const { title, artist, genre, url, links } = req.body ?? {};

    if (title && typeof title === 'string') music.title = title.trim();
    if (artist && typeof artist === 'string') music.artist = artist.trim();
    if (genre && typeof genre === 'string') music.genre = genre.trim();
    if (url && typeof url === 'string') music.url = url.trim();
    if (links && typeof links === 'object') {
      music.links = { ...music.links, ...links };
    }

    await music.save();

    return res.status(200).json(music);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   DELETE /api/musics/:id
 * @desc    Supprimer un morceau musical
 * @access  Privé - Auteur du morceau ou Administrateur (authenticate)
 * @dev     Ryad
 */
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const music = await Music.findById(req.params.id);
    if (!music) {
      return res.status(404).json({
        error: `Aucune musique trouvée avec l'identifiant ${req.params.id}.`
      });
    }

    const currentUserId = req.currentUserId || req.user?.userId;
    const isOwner = music.postedBy.toString() === currentUserId;
    const isAdmin =
      req.user?.role === 'admin' ||
      req.currentUserPermissions?.includes('admin');

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: 'Accès interdit. Vous ne pouvez supprimer que les musiques que vous avez publiées.'
      });
    }

    await Music.findByIdAndDelete(req.params.id);

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   POST /api/musics/:id/vote
 * @desc    Système de vote interactif (upvote / downvote)
 * @access  Privé (authenticate)
 * @dev     Ryad
 */
router.post('/:id/vote', authenticate, async (req, res, next) => {
  try {
    const { type } = req.body ?? {};

    const normalizedType =
      type === 'up' || type === 'upvote'
        ? 'up'
        : type === 'down' || type === 'downvote'
        ? 'down'
        : null;

    if (!normalizedType) {
      return res.status(400).json({
        error: 'Type de vote invalide. Les valeurs acceptées sont "up" (ou "upvote") et "down" (ou "downvote").'
      });
    }

    const music = await Music.findById(req.params.id);
    if (!music) {
      return res.status(404).json({
        error: `Aucune musique trouvée avec l'identifiant ${req.params.id}.`
      });
    }

    const currentUserId = req.currentUserId || req.user?.userId;

    const upvotesList = (music.upvotes || []).map((id) => id.toString());
    const downvotesList = (music.downvotes || []).map((id) => id.toString());

    const hasUpvoted = upvotesList.includes(currentUserId);
    const hasDownvoted = downvotesList.includes(currentUserId);

    if (normalizedType === 'up') {
      if (hasUpvoted) {
        music.upvotes = music.upvotes.filter((id) => id.toString() !== currentUserId);
      } else {
        music.upvotes.push(currentUserId);
        if (hasDownvoted) {
          music.downvotes = music.downvotes.filter((id) => id.toString() !== currentUserId);
        }
      }
    } else {
      if (hasDownvoted) {
        music.downvotes = music.downvotes.filter((id) => id.toString() !== currentUserId);
      } else {
        music.downvotes.push(currentUserId);
        if (hasUpvoted) {
          music.upvotes = music.upvotes.filter((id) => id.toString() !== currentUserId);
        }
      }
    }

    await music.save();

    return res.status(200).json({
      message: 'Vote enregistré avec succès.',
      musicId: music._id,
      score: music.score,
      upvotesCount: music.upvotes.length,
      downvotesCount: music.downvotes.length
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * Échappe les caractères spéciaux d'une chaîne pour l'utiliser dans une expression régulière.
 * Évite qu'une saisie comme "a.b" ou "(" soit interprétée comme une regex (ou fasse planter la requête).
 *
 * @param {string} text - Texte saisi par le client
 * @returns {string} Texte échappé
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lit un paramètre de pagination : renvoie la valeur par défaut s'il est absent,
 * sinon un entier >= 1, ou null si la valeur est invalide.
 */
function parsePositiveInt(value, defaultValue) {
  if (value === undefined || value === '') return defaultValue;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? number : null;
}

// Limite maximale d'éléments par page pour éviter des réponses trop lourdes
const MAX_PAGE_SIZE = 50;

/**
 * @route   GET /api/musics
 * @desc    Lister les musiques avec pagination, filtres (zone, genre, recherche) et tri
 * @access  Public
 * @dev     Nabil
 *
 * Paramètres de requête :
 *   - page             : numéro de page (défaut 1)
 *   - limit / pageSize : éléments par page (défaut 10, plafonné à 50)
 *   - zone             : identifiant MongoDB de la zone
 *   - genre            : genre exact, insensible à la casse
 *   - search           : recherche dans le titre OU l'artiste, insensible à la casse
 *   - sort             : "recent" (défaut, plus récentes d'abord) ou "popular" (meilleur score d'abord)
 */
router.get('/', async (req, res, next) => {
  try {
    const { zone, genre, search, sort = 'recent' } = req.query;

    // 1. Validation de la pagination
    const page = parsePositiveInt(req.query.page, 1);
    const requestedLimit = parsePositiveInt(req.query.limit ?? req.query.pageSize, 10);

    if (page === null || requestedLimit === null) {
      return res.status(400).json({
        error: 'Les paramètres "page" et "limit" (ou "pageSize") doivent être des entiers supérieurs ou égaux à 1.'
      });
    }
    const limit = Math.min(requestedLimit, MAX_PAGE_SIZE);

    if (sort !== 'recent' && sort !== 'popular') {
      return res.status(400).json({
        error: 'Le paramètre "sort" doit valoir "recent" ou "popular".'
      });
    }

    // Un paramètre répété (ex: ?genre=a&genre=b) arrive sous forme de tableau : on le refuse
    if ([genre, search].some((value) => value !== undefined && typeof value !== 'string')) {
      return res.status(400).json({ error: 'Les paramètres "genre" et "search" doivent être des textes simples.' });
    }

    // 2. Construction des filtres
    const query = {};

    if (zone !== undefined) {
      if (!mongoose.isValidObjectId(zone)) {
        return res.status(400).json({ error: `L'identifiant de zone "${zone}" est invalide.` });
      }
      // Conversion explicite : le pipeline d'agrégation ne convertit pas les chaînes en ObjectId
      query.zone = new mongoose.Types.ObjectId(zone);
    }

    if (genre) {
      query.genre = { $regex: `^${escapeRegex(genre)}$`, $options: 'i' };
    }

    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: 'i' };
      query.$or = [{ title: pattern }, { artist: pattern }];
    }

    // 3. Tri : le score (upvotes - downvotes) n'existe pas en base,
    //    on le calcule donc dans un pipeline d'agrégation avant de trier.
    const sortStage =
      sort === 'popular'
        ? { sortScore: -1, createdAt: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };

    const [rawMusics, totalItems] = await Promise.all([
      Music.aggregate([
        { $match: query },
        {
          $addFields: {
            sortScore: {
              $subtract: [
                { $size: { $ifNull: ['$upvotes', []] } },
                { $size: { $ifNull: ['$downvotes', []] } }
              ]
            }
          }
        },
        { $sort: sortStage },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $unset: 'sortScore' }
      ]),
      Music.countDocuments(query)
    ]);

    // 4. Reconversion en documents Mongoose (pour le score virtuel et toJSON), puis peuplement
    const musics = await Music.populate(
      rawMusics.map((doc) => Music.hydrate(doc)),
      [
        { path: 'postedBy', select: 'username role' },
        { path: 'zone', select: 'name location radius' }
      ]
    );

    return res.status(200).json({
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data: musics
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
