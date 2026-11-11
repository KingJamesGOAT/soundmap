import { Router } from 'express';
import { authenticate, requireAdmin } from '../middlewares/auth.js';
import User from '../models/User.js';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : UTILISATEURS
 * ATTRIBUÉ À : Steve
 * ============================================================================
 * Gère l'inscription des utilisateurs et la consultation des profils.
 */

/**
 * @route   POST /api/users
 * @desc    Inscription d'un nouvel utilisateur (création de compte)
 * @access  Public
 * 
 * Entrée : { username: "...", password: "...", role?: "user" | "admin" }
 * Sortie  : 201 Created avec le profil utilisateur (sans passwordHash)
 * Erreurs : 400 Bad Request si validation échoue (ex: mot de passe trop court)
 *           409 Conflict si le nom d'utilisateur est déjà pris
 */
router.post('/', async (req, res, next) => {
  try {
    const { username, password, role } = req.body ?? {};

    // 1. Validation basique du corps de la requête
    if (!username || typeof username !== 'string') {
      return res.status(400).json({
        error: "Le nom d'utilisateur est requis et doit être une chaîne de caractères."
      });
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3) {
      return res.status(400).json({
        error: "Le nom d'utilisateur doit comporter au moins 3 caractères."
      });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({
        error: 'Le mot de passe est obligatoire et doit contenir au moins 4 caractères.'
      });
    }

    // 2. Vérification de l'unicité du nom d'utilisateur (évite une erreur brute MongoDB)
    const existingUser = await User.findOne({ username: trimmedUsername });
    if (existingUser) {
      return res.status(409).json({
        error: `Le nom d'utilisateur "${trimmedUsername}" est déjà utilisé.`
      });
    }

    // 3. Hachage sécurisé du mot de passe avec bcrypt
    const passwordHash = await User.hashPassword(password);

    // 4. Par mesure de sécurité, par défaut les inscriptions créent un compte 'user'
    // Si un rôle 'admin' est explicitement demandé lors du premier dev/test, on l'autorise si spécifié
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    // 5. Instanciation et sauvegarde du document
    const user = new User({
      username: trimmedUsername,
      passwordHash,
      role: assignedRole
    });

    await user.save();

    // 6. Réponse avec code HTTP 201 (Created). toJSON masque automatiquement passwordHash
    return res.status(201).json(user);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   GET /api/users/admin-check
 * @desc    Route de vérification des privilèges administrateur
 * @access  Admin uniquement (authenticate, requireAdmin)
 */
router.get('/admin-check', authenticate, requireAdmin, (req, res) => {
  return res.status(200).json({
    message: 'Accès autorisé aux privilèges administrateur.',
    admin: req.user
  });
});

/**
 * @route   GET /api/users/me
 * @desc    Récupérer les informations du profil de l'utilisateur actuellement connecté
 * @access  Privé (authenticate)
 * 
 * Header requis : Authorization: Bearer <token>
 * Sortie         : 200 OK avec le document utilisateur
 * Erreurs        : 401 Unauthorized si token absent/invalide
 *                  404 Not Found si l'utilisateur lié au token a été supprimé
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const currentUserId = req.currentUserId || req.user?.userId;
    const user = await User.findById(currentUserId);

    if (!user) {
      return res.status(404).json({
        error: 'Utilisateur introuvable.'
      });
    }

    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   GET /api/users
 * @desc    Récupérer la liste de tous les utilisateurs
 * @access  Public
 * 
 * Sortie : 200 OK avec un tableau d'utilisateurs (sans passwordHash)
 */
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    return res.status(200).json(users);
  } catch (err) {
    return next(err);
  }
});

/**
 * @route   GET /api/users/:id
 * @desc    Récupérer un utilisateur spécifique par son identifiant MongoDB
 * @access  Public
 * 
 * Sortie  : 200 OK avec le document utilisateur
 * Erreurs : 400 Bad Request si format d'ID invalide
 *           404 Not Found si aucun utilisateur avec cet ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        error: `Aucun utilisateur trouvé avec l'identifiant ${req.params.id}.`
      });
    }

    return res.status(200).json(user);
  } catch (err) {
    return next(err);
  }
});

export default router;
