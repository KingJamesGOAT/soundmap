import jwt from 'jsonwebtoken';
import { config } from '../config.js';

/**
 * Middleware d'authentification par JSON Web Token (JWT).
 * Conforme aux standards enseignés par le cours COMEM+ ArchiOWeb.
 * 
 * Rôle :
 * 1. Vérifie la présence du header HTTP "Authorization" sous la forme "Bearer <token>".
 * 2. Vérifie la signature cryptographique et l'expiration du jeton avec config.jwtSecret.
 * 3. En cas de succès, injecte les informations dans la requête :
 *    - req.user (payload complet du JWT : userId, username, role)
 *    - req.currentUserId (identifiant standardisé string pour les comparaisons directes)
 *    - req.currentUserPermissions (tableau des permissions/rôles, ex: ['user'] ou ['admin'])
 * 4. En cas d'échec (token manquant, malformé ou expiré), renvoie une réponse 401 Unauthorized
 *    avec l'en-tête standard "WWW-Authenticate: Bearer".
 */
export function authenticate(req, res, next) {
  // Récupération de l'en-tête Authorization
  const authorization = req.get('Authorization') || req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .set('WWW-Authenticate', 'Bearer')
      .json({
        error: "Accès refusé. Un jeton d'authentification est requis (Authorization: Bearer <token>)."
      });
  }

  // Vérification de la structure "Bearer <token>" via expression régulière
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res
      .status(401)
      .set('WWW-Authenticate', 'Bearer')
      .json({
        error: 'Format du jeton invalide. Le format attendu est "Bearer <token>".'
      });
  }

  const token = match[1];

  try {
    // Décodage et vérification de la signature du JWT
    const payload = jwt.verify(token, config.jwtSecret);

    // Extraction et normalisation de l'identifiant utilisateur (sub ou userId)
    const userId = payload.sub || payload.userId;
    const role = payload.role || payload.scope || 'user';

    // Injection dans req pour une compatibilité maximale dans toute l'application
    req.user = {
      userId,
      username: payload.username,
      role
    };

    // Identifiant string direct (recommandé par le cours des profs Simon & Loris)
    req.currentUserId = userId ? String(userId) : undefined;

    // Tableau de permissions (pour vérification rapide dans les autres routes)
    req.currentUserPermissions = role === 'admin' ? ['admin', 'user'] : ['user'];

    next();
  } catch (err) {
    return res
      .status(401)
      .set('WWW-Authenticate', 'Bearer')
      .json({
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
 * 1. Vérifie que la requête est authentifiée et que l'utilisateur possède le rôle 'admin'.
 * 2. Si ce n'est pas le cas, interrompt la requête avec un code HTTP 403 (Forbidden).
 */
export function requireAdmin(req, res, next) {
  const isAdmin =
    req.user?.role === 'admin' ||
    req.currentUserPermissions?.includes('admin');

  if (!isAdmin) {
    return res.status(403).json({
      error: 'Accès interdit. Cette action nécessite des privilèges administrateur.'
    });
  }

  next();
}

export default { authenticate, requireAdmin };
