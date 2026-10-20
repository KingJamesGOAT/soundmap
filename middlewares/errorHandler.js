/**
 * Middleware centralisé de gestion des erreurs Express.
 * 
 * Rôle :
 * 1. Capture toute erreur passée via `next(err)` depuis les routes et contrôleurs.
 * 2. Formate une réponse JSON standardisée et propre pour le client.
 * 3. Gère spécifiquement les erreurs courantes de Mongoose (validation de schéma, ID invalide, duplication).
 * 4. Évite les plantages du serveur et centralise le code d'erreur au même endroit.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Affichage de l'erreur dans la console du serveur pour faciliter le débogage en développement
  if (process.env.NODE_ENV !== 'test') {
    console.error('❌ Erreur capturée par errorHandler :', err);
  }

  // 1. Gestion des erreurs de validation de schéma Mongoose (ex: champ requis manquant)
  if (err.name === 'ValidationError') {
    const validationErrors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      error: 'Erreur de validation des données.',
      details: validationErrors
    });
  }

  // 2. Gestion des erreurs de conversion d'ID Mongoose (ex: ID MongoDB invalide dans l'URL)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Format d'identifiant invalide pour le champ "${err.path}".`
    });
  }

  // 3. Gestion des erreurs d'unicité MongoDB (code 11000, ex: nom d'utilisateur ou de zone déjà pris)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'champ';
    return res.status(409).json({
      error: `Conflit de données : la valeur pour le champ "${field}" est déjà utilisée.`
    });
  }

  // 4. Gestion des erreurs JSON invalide dans le corps de requête Express
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'Le format du corps de la requête (JSON) est invalide.'
    });
  }

  // 5. Erreurs personnalisées avec code statut défini ou erreur interne par défaut (500)
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Une erreur interne est survenue sur le serveur.';

  return res.status(statusCode).json({
    error: message
  });
}

export default errorHandler;
