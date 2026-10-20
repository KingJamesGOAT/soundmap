import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : MUSIQUES & VOTES
 * ATTRIBUÉ À : Ryad & Nabil
 * ============================================================================
 * Ce module gère la liste, le dépôt, la modification, la suppression et les votes
 * sur les morceaux de musique partagés dans les différentes zones.
 */

/**
 * @route   GET /api/musics
 * @desc    Récupérer les musiques avec pagination et filtres
 * @access  Public
 * @dev     Nabil
 * 
 * Cahier des charges pour Nabil :
 * 1. Extraire les paramètres de requête :
 *    - Pagination : `page` (défaut 1), `limit` (défaut 10).
 *    - Filtres : `zone` (ID de zone) et `genre` (ex: "Rock", "Electro").
 * 2. Construire un filtre Mongoose dynamique :
 *    const query = {};
 *    if (req.query.zone) query.zone = req.query.zone;
 *    if (req.query.genre) query.genre = new RegExp(`^${req.query.genre}$`, 'i');
 * 3. Appliquer `.skip((page - 1) * limit).limit(Number(limit))` avec un tri `.sort({ createdAt: -1 })`.
 * 4. Peupler les références utiles : `.populate('postedBy', 'username').populate('zone', 'name')`.
 * 5. Retourner les données avec le décompte total des éléments pour la pagination (statut 200).
 */
router.get('/', (req, res) => {
  res.status(501).json({
    message: "Route de liste paginée des musiques non implémentée (Attribuée à Nabil).",
    route: "GET /api/musics"
  });
});

/**
 * @route   GET /api/musics/:id
 * @desc    Récupérer les détails d'un morceau musical spécifique
 * @access  Public
 * @dev     Ryad & Nabil
 */
router.get('/:id', (req, res) => {
  res.status(501).json({
    message: "Route de détail d'une musique non implémentée (Attribuée à Ryad & Nabil).",
    route: "GET /api/musics/:id"
  });
});

/**
 * @route   POST /api/musics
 * @desc    Déposer une nouvelle musique dans une zone avec validation GPS
 * @access  Privé (authenticate)
 * @dev     Ryad
 * 
 * Cahier des charges pour Ryad :
 * 1. Protégé par `authenticate` (l'auteur est `req.user.userId`).
 * 2. Récupérer dans `req.body` : `title`, `artist`, `genre`, `links`, `zoneId`, et les coordonnées GPS
 *    actuelles de l'utilisateur mobile : `userLng` et `userLat`.
 * 3. ⚠️ VÉRIFICATION GÉOGRAPHIQUE CRITIQUE :
 *    - Charger la zone cible via `Zone.findById(zoneId)`.
 *    - Vérifier que la position GPS fournie par le smartphone se situe bien à l'intérieur
 *      du rayon géographique de la zone (calcul de distance sphérique type formule de Haversine
 *      ou requête géospatiale MongoDB).
 *    - Si l'utilisateur est trop éloigné, renvoyer un code 403 Forbidden ("Vous devez être physiquement dans la zone pour y poster une musique").
 * 4. Si la condition GPS est respectée, sauvegarder la musique avec `postedBy: req.user.userId`.
 * 5. Retourner la musique créée avec le statut 201.
 */
router.post('/', authenticate, (req, res) => {
  res.status(501).json({
    message: "Route de dépôt d'une musique avec vérification GPS non implémentée (Attribuée à Ryad).",
    route: "POST /api/musics"
  });
});

/**
 * @route   PATCH /api/musics/:id
 * @desc    Modifier les informations d'un morceau (titre, liens, genre)
 * @access  Privé - Auteur du post ou Administrateur (authenticate)
 * @dev     Ryad
 * 
 * Cahier des charges pour Ryad :
 * 1. Charger la musique par son ID.
 * 2. Vérifier que l'utilisateur connecté (`req.user.userId`) est bien le propriétaire (`music.postedBy`)
 *    OU que l'utilisateur est un admin (`req.user.role === 'admin'`).
 * 3. Si non autorisé, renvoyer 403 Forbidden.
 * 4. Mettre à jour les champs autorisés et sauvegarder.
 * 5. Renvoyer la musique modifiée avec le code 200.
 */
router.patch('/:id', authenticate, (req, res) => {
  res.status(501).json({
    message: "Route de mise à jour d'une musique non implémentée (Attribuée à Ryad).",
    route: "PATCH /api/musics/:id"
  });
});

/**
 * @route   DELETE /api/musics/:id
 * @desc    Supprimer un morceau musical
 * @access  Privé - Auteur du post ou Administrateur (authenticate)
 * @dev     Ryad
 * 
 * Cahier des charges pour Ryad :
 * 1. Charger la musique avec `Music.findById(req.params.id)`.
 * 2. Vérifier l'autorisation : seul l'auteur du dépôt (`music.postedBy.toString() === req.user.userId`)
 *    ou un administrateur (`req.user.role === 'admin'`) a le droit de supprimer.
 * 3. Supprimer le document et renvoyer une confirmation avec le statut 200 (ou 204).
 */
router.delete('/:id', authenticate, (req, res) => {
  res.status(501).json({
    message: "Route de suppression d'une musique non implémentée (Attribuée à Ryad).",
    route: "DELETE /api/musics/:id"
  });
});

/**
 * @route   POST /api/musics/:id/vote
 * @desc    Voter pour une musique (pouce haut ou pouce bas)
 * @access  Privé (authenticate)
 * @dev     Ryad
 * 
 * Cahier des charges pour Ryad :
 * 1. Récupérer le type de vote dans `req.body.type` : 'up' ou 'down'.
 * 2. Récupérer l'identifiant de l'utilisateur : `const userId = req.user.userId`.
 * 3. Logique de bascule (toggle) :
 *    - Si type === 'up' : ajouter `userId` à `upvotes` (avec $addToSet) et le retirer de `downvotes` ($pull).
 *    - Si type === 'down' : ajouter `userId` à `downvotes` (avec $addToSet) et le retirer de `upvotes` ($pull).
 *    - Gérer le cas où l'utilisateur reclique sur le même vote pour l'annuler.
 * 4. Renvoyer le score de votes mis à jour avec le statut 200.
 */
router.post('/:id/vote', authenticate, (req, res) => {
  res.status(501).json({
    message: "Route de vote (upvote / downvote) non implémentée (Attribuée à Ryad).",
    route: "POST /api/musics/:id/vote"
  });
});

export default router;
