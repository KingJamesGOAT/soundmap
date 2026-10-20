import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : UTILISATEURS
 * ATTRIBUÉ À : Steve
 * ============================================================================
 * Ce module gère l'inscription des utilisateurs et la consultation des profils.
 */

/**
 * @route   POST /api/users
 * @desc    Inscription d'un nouvel utilisateur (création de compte)
 * @access  Public
 * @dev     Steve
 * 
 * Cahier des charges pour Steve :
 * 1. Récupérer `username` et `password` dans `req.body`.
 * 2. Vérifier que les deux champs sont bien fournis et respectent les contraintes (ex: taille minimum).
 * 3. Hacher le mot de passe avec `bcrypt.hash(password, 10)` (NE JAMAIS STOCKER EN CLAIR !).
 * 4. Créer un nouvel utilisateur avec `new User({ username, passwordHash, role: 'user' })` et sauvegarder.
 * 5. Retourner l'utilisateur créé avec le statut HTTP 201 (Created).
 */
router.post('/', (req, res) => {
  res.status(501).json({
    message: "Route d'inscription d'utilisateur non implémentée (Attribuée à Steve).",
    route: "POST /api/users"
  });
});

/**
 * @route   GET /api/users
 * @desc    Récupérer la liste des utilisateurs (public ou membres authentifiés)
 * @access  Privé (optionnel : authenticate)
 * @dev     Steve
 * 
 * Cahier des charges pour Steve :
 * 1. Rechercher tous les utilisateurs avec `User.find()`.
 * 2. Grâce à `toJSON` du schéma User, `passwordHash` est automatiquement retiré.
 * 3. Retourner la liste au format JSON avec statut 200.
 */
router.get('/', (req, res) => {
  res.status(501).json({
    message: "Route de liste des utilisateurs non implémentée (Attribuée à Steve).",
    route: "GET /api/users"
  });
});

/**
 * @route   GET /api/users/:id
 * @desc    Récupérer les détails d'un utilisateur par son identifiant MongoDB
 * @access  Privé (authenticate)
 * @dev     Steve
 * 
 * Cahier des charges pour Steve :
 * 1. Récupérer `id` depuis `req.params.id`.
 * 2. Chercher l'utilisateur avec `User.findById(req.params.id)`.
 * 3. Si introuvable, renvoyer une erreur 404 (Not Found).
 * 4. Retourner les données de l'utilisateur avec statut 200.
 */
router.get('/:id', authenticate, (req, res) => {
  res.status(501).json({
    message: "Route de profil utilisateur par ID non implémentée (Attribuée à Steve).",
    route: "GET /api/users/:id"
  });
});

export default router;
