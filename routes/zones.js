import { Router } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import Zone, { isValidCoordinates } from '../models/Zone.js';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : ZONES GÉOGRAPHIQUES
 * ATTRIBUÉ À : Luka
 * ============================================================================
 * Ce module gère les opérations CRUD sur les zones géographiques ainsi que
 * la recherche de zones selon les coordonnées GPS fournies par l'application mobile.
 *
 * ⚠️ RAPPEL GÉOSPATIAL : l'ordre des coordonnées est toujours [LONGITUDE, LATITUDE].
 */

// Champs du créateur exposés lors du peuplement (jamais le hash du mot de passe)
const CREATOR_FIELDS = 'username role';

/**
 * Convertit une valeur reçue (nombre ou chaîne numérique) en nombre.
 * Renvoie NaN si la valeur n'est pas exploitable.
 *
 * @param {unknown} value
 * @returns {number}
 */
function toNumber(value) {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value);
  }
  return NaN;
}

/**
 * Extrait les coordonnées [lng, lat] du corps de la requête.
 * Trois formats sont acceptés (par ordre de priorité) :
 * 1. GeoJSON standard : { location: { type: "Point", coordinates: [lng, lat] } }
 * 2. Raccourci        : { coordinates: [lng, lat] }
 * 3. Champs séparés   : { lng, lat }
 *
 * @param {object} body - Corps de la requête
 * @returns {{ provided: boolean, coordinates?: number[], error?: string }}
 */
function extractCoordinates(body) {
  let raw;

  if (body.location !== undefined) {
    const { location } = body;
    if (!location || typeof location !== 'object' || Array.isArray(location)) {
      return { provided: true, error: 'Le champ "location" doit être un objet GeoJSON { type: "Point", coordinates: [lng, lat] }.' };
    }
    if (location.type !== undefined && location.type !== 'Point') {
      return { provided: true, error: 'Le type de géométrie doit être "Point".' };
    }
    raw = location.coordinates;
  } else if (body.coordinates !== undefined) {
    raw = body.coordinates;
  } else if (body.lng !== undefined || body.lat !== undefined) {
    raw = [body.lng, body.lat];
  } else {
    // Aucune coordonnée fournie
    return { provided: false };
  }

  const coordinates = Array.isArray(raw) ? raw.map(toNumber) : raw;
  if (!isValidCoordinates(coordinates)) {
    return {
      provided: true,
      error:
        'Coordonnées invalides : format attendu [longitude, latitude] avec -180 <= longitude <= 180 et -90 <= latitude <= 90.'
    };
  }

  return { provided: true, coordinates };
}

/**
 * Vérifie qu'aucune autre zone ne porte déjà ce nom.
 *
 * @param {string} name - Nom à vérifier (déjà nettoyé)
 * @param {string} [excludeId] - Identifiant de la zone à ignorer (cas d'une mise à jour)
 * @returns {Promise<boolean>} - true si le nom est déjà pris
 */
async function isNameTaken(name, excludeId) {
  const filter = { name };
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }
  return Boolean(await Zone.exists(filter));
}

/**
 * Middleware : valide le format de l'identifiant MongoDB passé dans l'URL.
 * Renvoie 400 si l'identifiant est mal formé.
 */
function validateZoneId(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ error: "Format d'identifiant de zone invalide." });
  }
  next();
}

/**
 * @route   GET /api/zones
 * @desc    Lister toutes les zones géographiques OU les trier par proximité GPS
 * @access  Public
 * @dev     Luka
 *
 * Paramètres de requête optionnels :
 * - near=lng,lat       : renvoie les zones de la plus proche à la plus éloignée ($nearSphere)
 * - maxDistance=mètres : distance maximale (uniquement avec "near")
 *
 * Note : avec $nearSphere et une géométrie GeoJSON ($geometry), MongoDB attend
 * $maxDistance directement en MÈTRES. La conversion en radians (distance / 6378137)
 * ne serait nécessaire qu'avec des coordonnées "legacy" [lng, lat] sans GeoJSON.
 */
router.get('/', async (req, res, next) => {
  try {
    const { near, maxDistance } = req.query;

    // Refus des paramètres répétés (ex: ?near=a&near=b) qui arrivent sous forme de tableau
    if (Array.isArray(near) || Array.isArray(maxDistance)) {
      return res.status(400).json({ error: 'Les paramètres "near" et "maxDistance" ne peuvent être fournis qu’une seule fois.' });
    }

    // Sans filtre de proximité : toutes les zones, les plus récentes d'abord
    if (near === undefined) {
      if (maxDistance !== undefined) {
        return res.status(400).json({ error: 'Le paramètre "maxDistance" nécessite le paramètre "near=lng,lat".' });
      }

      const zones = await Zone.find()
        .sort({ createdAt: -1 })
        .populate('createdBy', CREATOR_FIELDS);
      return res.status(200).json(zones);
    }

    // Analyse du paramètre near=lng,lat
    const parts = String(near).split(',');
    const coordinates = parts.length === 2 ? parts.map(toNumber) : null;
    if (!isValidCoordinates(coordinates)) {
      return res.status(400).json({
        error: 'Paramètre "near" invalide. Format attendu : near=longitude,latitude (ex: near=6.6412,46.7785).'
      });
    }

    const nearSphere = {
      $geometry: { type: 'Point', coordinates }
    };

    // Analyse du paramètre maxDistance (en mètres)
    if (maxDistance !== undefined) {
      const distance = toNumber(maxDistance);
      if (!Number.isFinite(distance) || distance < 0) {
        return res.status(400).json({ error: 'Le paramètre "maxDistance" doit être un nombre positif (en mètres).' });
      }
      nearSphere.$maxDistance = distance;
    }

    // $nearSphere trie déjà les résultats du plus proche au plus éloigné (index 2dsphere requis)
    const zones = await Zone.find({ location: { $nearSphere: nearSphere } })
      .populate('createdBy', CREATOR_FIELDS);

    return res.status(200).json(zones);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   GET /api/zones/:id
 * @desc    Obtenir les détails d'une zone par son identifiant
 * @access  Public
 * @dev     Luka
 */
router.get('/:id', validateZoneId, async (req, res, next) => {
  try {
    const zone = await Zone.findById(req.params.id).populate('createdBy', CREATOR_FIELDS);

    if (!zone) {
      return res.status(404).json({ error: 'Zone introuvable.' });
    }

    return res.status(200).json(zone);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   POST /api/zones
 * @desc    Créer une nouvelle zone géographique
 * @access  Privé - Administrateur uniquement (authenticate + requireAdmin)
 * @dev     Luka
 */
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
  try {
    const body = req.body || {};
    const { description, radius } = body;
    const name = typeof body.name === 'string' ? body.name.trim() : body.name;

    // 1. Validation des coordonnées (obligatoires à la création)
    const location = extractCoordinates(body);
    if (!location.provided) {
      return res.status(400).json({
        error: 'Les coordonnées sont obligatoires : location: { type: "Point", coordinates: [lng, lat] }.'
      });
    }
    if (location.error) {
      return res.status(400).json({ error: location.error });
    }

    // 2. Vérification de l'unicité du nom (409 Conflict si doublon)
    if (typeof name === 'string' && name !== '' && (await isNameTaken(name))) {
      return res.status(409).json({ error: `Une zone nommée "${name}" existe déjà.` });
    }

    // 3. Création : les autres validations (nom, rayon, ...) sont assurées par le schéma
    //    Mongoose et transformées en 400 par le middleware errorHandler.
    const zone = new Zone({
      name,
      description,
      location: { type: 'Point', coordinates: location.coordinates },
      radius,
      createdBy: req.currentUserId || req.user.userId
    });

    await zone.save();
    await zone.populate('createdBy', CREATOR_FIELDS);

    return res.status(201).json(zone);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   PATCH /api/zones/:id
 * @desc    Mettre à jour partiellement une zone (name, description, radius, location)
 * @access  Privé - Administrateur uniquement (authenticate + requireAdmin)
 * @dev     Luka
 */
router.patch('/:id', authenticate, requireAdmin, validateZoneId, async (req, res, next) => {
  try {
    const body = req.body || {};

    const zone = await Zone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ error: 'Zone introuvable.' });
    }

    // Mise à jour des coordonnées si elles sont fournies
    const location = extractCoordinates(body);
    if (location.error) {
      return res.status(400).json({ error: location.error });
    }
    if (location.provided) {
      zone.location = { type: 'Point', coordinates: location.coordinates };
    }

    // Mise à jour du nom avec vérification d'unicité
    if (body.name !== undefined) {
      const name = typeof body.name === 'string' ? body.name.trim() : body.name;
      if (typeof name === 'string' && name !== '' && (await isNameTaken(name, zone._id))) {
        return res.status(409).json({ error: `Une zone nommée "${name}" existe déjà.` });
      }
      zone.name = name;
    }

    // Mise à jour des champs simples (validés par le schéma lors du save)
    if (body.description !== undefined) {
      zone.description = body.description;
    }
    if (body.radius !== undefined) {
      zone.radius = body.radius;
    }

    // Les champs createdBy et createdAt ne sont volontairement jamais modifiables
    await zone.save();
    await zone.populate('createdBy', CREATOR_FIELDS);

    return res.status(200).json(zone);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   DELETE /api/zones/:id
 * @desc    Supprimer une zone géographique
 * @access  Privé - Administrateur uniquement (authenticate + requireAdmin)
 * @dev     Luka
 *
 * Note : les musiques rattachées sont volontairement conservées (les statistiques
 * de Nabil gèrent déjà le cas des musiques dont la zone a été supprimée).
 */
router.delete('/:id', authenticate, requireAdmin, validateZoneId, async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);

    if (!zone) {
      return res.status(404).json({ error: 'Zone introuvable.' });
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
});

export default router;
