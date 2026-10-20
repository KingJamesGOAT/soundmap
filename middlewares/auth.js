import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Middleware d'authentification par JSON Web Token (JWT).
 * 
 * Rôle :
 * 1. Vérifie la présence du header HTTP "Authorization" sous la forme "Bearer <token>".
 * 2. Vérifie la validité cryptographique et l'expiration du token avec la clé secrète.
 * 3. Si valide, extrait les données du payload (ex: userId, role) et les injecte dans `req.user`.
 * 4. Si manquant ou invalide, interrompt la requête avec un code HTTP 401 (Unauthorized).
 */
export function authenticate(req, res, next) {
  // Récupération de l'en-tête Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Accès refusé. Aucun en-tête d’autorisation fourni (format requis: Authorization: Bearer <token>).'
    });
  }

  // Vérification de la structure "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Format du jeton invalide. Le format attendu est "Bearer <token>".'
    });
  }

  const token = parts[1];

  try {
    // Décodage et vérification de la signature du JWT
    const decoded = jwt.verify(token, config.jwtSecret);

    // On attache les informations du payload à l'objet requête pour les middlewares/routes suivants
    // Par exemple : req.user = { userId: "...", username: "...", role: "admin" }
    req.user = decoded;

    // Passage au middleware ou contrôleur suivant
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Jeton JWT invalide ou expiré. Veuillez vous reconnecter.',
      details: err.message
    });
  }
}

/**
 * Middleware de contrôle d'accès administrateur.
 * 
 * ⚠️ ATTENTION : Doit impérativement être placé APRÈS le middleware `authenticate` dans la chaîne Express.
 * 
 * Rôle :
 * 1. Vérifie que `req.user` existe et que son rôle est bien 'admin'.
 * 2. Si ce n'est pas le cas, interrompt la requête avec un code HTTP 403 (Forbidden).
 */
export function requireAdmin(req, res, next) {
  // Si authenticate n'a pas été appelé ou si le rôle n'est pas admin
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Accès interdit. Cette action nécessite des privilèges administrateur.'
    });
  }

  // L'utilisateur est bien un administrateur authentifié, on poursuit
  next();
}
