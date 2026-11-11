import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import User from '../models/User.js';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : AUTHENTIFICATION
 * ATTRIBUÉ À : Steve
 * ============================================================================
 * Gère l'authentification des utilisateurs et la génération des jetons JWT.
 */

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur et génération d'un jeton JWT valide
 * @access  Public
 * 
 * Entrée : { username: "...", password: "..." }
 * Sortie  : 200 OK avec { token: "...", user: { id, username, role, createdAt } }
 * Erreurs : 400 Bad Request si champs manquants
 *           401 Unauthorized si identifiants invalides
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body ?? {};

    // Validation de la présence des identifiants dans le corps de requête
    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Nom d’utilisateur et mot de passe requis sous forme de chaînes de caractères.'
      });
    }

    const trimmedUsername = username.trim();

    // Recherche de l'utilisateur par son nom d'utilisateur
    const user = await User.findOne({ username: trimmedUsername });
    if (!user) {
      // Message générique pour ne pas divulguer si l'utilisateur existe ou non
      return res.status(401).json({
        error: 'Nom d’utilisateur ou mot de passe incorrect.'
      });
    }

    // Vérification du mot de passe avec bcrypt
    const isPasswordValid = await user.validatePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Nom d’utilisateur ou mot de passe incorrect.'
      });
    }

    // Construction du payload JWT conforme aux standards du cours ArchiOWeb :
    // - sub : identifiant du sujet (userId sous forme de string)
    // - scope : rôle sous forme de chaîne ('user' ou 'admin')
    // - userId, role, username pour faciliter l'accès direct côté client ou middleware
    const payload = {
      sub: String(user._id),
      userId: String(user._id),
      username: user.username,
      role: user.role,
      scope: user.role
    };

    // Signature du jeton avec expiration fixée à 7 jours
    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    // Réponse au client : on renvoie le jeton ainsi que le profil public
    return res.status(200).json({
      token,
      user: user.toJSON()
    });
  } catch (err) {
    // Propagation sécurisée vers le middleware centralisé errorHandler
    return next(err);
  }
});

export default router;
