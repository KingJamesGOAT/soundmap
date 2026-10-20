import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : ZONES GÉOGRAPHIQUES
 * ATTRIBUÉ À : Luka
 * ============================================================================
 * Ce module gère les opérations CRUD sur les zones géographiques ainsi que
 * la recherche de zones selon les coordonnées GPS fournies par l'application mobile.
 */

/**
 * @route   GET /api/zones
 * @desc    Lister toutes les zones géographiques OU filtrer par proximité GPS
 * @access  Public
 * @dev     Luka
 * 
 * Cahier des charges pour Luka :
 * 1. Vérifier si des paramètres de requête GPS sont fournis (ex: ?lng=6.6412&lat=46.7785).
 * 2. Si des coordonnées sont passées, utiliser l'index 2dsphere de MongoDB avec l'opérateur
 *    `$near` ou `$nearSphere` :
 *    ```javascript
 *    Zone.find({
 *      location: {
 *        $nearSphere: {
 *          $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
 *          $maxDistance: maxDistanceEnMetres
 *        }
 *      }
 *    });
 *    ```
 * 3. Si aucun paramètre n'est passé, renvoyer simplement toutes les zones avec `Zone.find()`.
 * 4. Renvoyer le statut 200 avec le tableau des zones trouvées.
 */
router.get('/', (req, res) => {
  res.status(501).json({
    message: "Route de liste/recherche géospatiale des zones non implémentée (Attribuée à Luka).",
    route: "GET /api/zones"
  });
});

/**
 * @route   GET /api/zones/:id
 * @desc    Obtenir les détails d'une zone par son identifiant
 * @access  Public
 * @dev     Luka
 * 
 * Cahier des charges pour Luka :
 * 1. Chercher la zone via `Zone.findById(req.params.id).populate('createdBy', 'username role')`.
 * 2. Si la zone n'existe pas, renvoyer une 404 (Not Found).
 * 3. Renvoyer la zone avec le statut 200.
 */
router.get('/:id', (req, res) => {
  res.status(501).json({
    message: "Route de consultation d'une zone par ID non implémentée (Attribuée à Luka).",
    route: "GET /api/zones/:id"
  });
});

/**
 * @route   POST /api/zones
 * @desc    Créer une nouvelle zone géographique
 * @access  Privé - Administrateur uniquement (authenticate + requireAdmin)
 * @dev     Luka
 * 
 * Cahier des charges pour Luka :
 * 1. `authenticate` et `requireAdmin` garantissent que seul un admin peut créer une zone.
 * 2. Extraire `name`, `description`, `coordinates` ([longitude, latitude]) et `radius` du body.
 * 3. Valider que les coordonnées forment un tableau de deux nombres valides.
 * 4. Instancier `new Zone({ name, description, location: { type: 'Point', coordinates }, radius, createdBy: req.user.userId })`.
 * 5. Sauvegarder dans MongoDB et retourner la zone créée avec le code 201.
 */
router.post('/', authenticate, requireAdmin, (req, res) => {
  res.status(501).json({
    message: "Route de création de zone non implémentée (Attribuée à Luka).",
    route: "POST /api/zones"
  });
});

/**
 * @route   PATCH /api/zones/:id
 * @desc    Mettre à jour les informations d'une zone
 * @access  Privé - Administrateur uniquement (authenticate + requireAdmin)
 * @dev     Luka
 * 
 * Cahier des charges pour Luka :
 * 1. Protégé par `authenticate` et `requireAdmin`.
 * 2. Mettre à jour les champs autorisés (name, description, radius, location).
 * 3. Utiliser `Zone.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })`.
 * 4. Si la zone n'existe pas, renvoyer 404.
 * 5. Retourner la zone mise à jour avec le code 200.
 */
router.patch('/:id', authenticate, requireAdmin, (req, res) => {
  res.status(501).json({
    message: "Route de mise à jour d'une zone non implémentée (Attribuée à Luka).",
    route: "PATCH /api/zones/:id"
  });
});

/**
 * @route   DELETE /api/zones/:id
 * @desc    Supprimer une zone géographique
 * @access  Privé - Administrateur uniquement (authenticate + requireAdmin)
 * @dev     Luka
 * 
 * Cahier des charges pour Luka :
 * 1. Protégé par `authenticate` et `requireAdmin`.
 * 2. Supprimer la zone via `Zone.findByIdAndDelete(req.params.id)`.
 * 3. Optionnel : Nettoyer ou archiver les musiques associées à cette zone.
 * 4. Si la zone n'existe pas, renvoyer 404.
 * 5. Renvoyer un message de confirmation avec le statut 200 (ou 204 No Content).
 */
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  res.status(501).json({
    message: "Route de suppression d'une zone non implémentée (Attribuée à Luka).",
    route: "DELETE /api/zones/:id"
  });
});

export default router;
