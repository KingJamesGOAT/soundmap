import { Router } from 'express';

const router = Router();

/**
 * ============================================================================
 * FICHIER DE ROUTES : AUTHENTIFICATION
 * ATTRIBUÉ À : Steve
 * ============================================================================
 * Ce module gère les routes liées à la session et à l'authentification JWT.
 */

/**
 * @route   POST /api/auth/login
 * @desc    Authentification d'un utilisateur et génération d'un JWT
 * @access  Public
 * @dev     Steve
 * 
 * Cahier des charges pour Steve :
 * 1. Récupérer `username` et `password` dans `req.body`.
 * 2. Chercher l'utilisateur dans la collection `User` via `User.findOne({ username })`.
 * 3. Si introuvable ou si `bcrypt.compare(password, user.passwordHash)` échoue,
 *    renvoyer une erreur 401 avec un message générique ("Identifiants invalides").
 * 4. Si valide, générer un jeton JWT avec `jwt.sign({ userId: user._id, role: user.role, username: user.username }, config.jwtSecret, { expiresIn: '7d' })`.
 * 5. Retourner le jeton et les informations publiques de l'utilisateur.
 */
router.post('/login', (req, res) => {
  res.status(501).json({
    message: "Route de connexion non implémentée (Attribuée à Steve).",
    route: "POST /api/auth/login"
  });
});

export default router;
