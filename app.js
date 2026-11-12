import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { load } from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

// Importation des fichiers de routes
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import zonesRouter from './routes/zones.js';
import musicsRouter from './routes/musics.js';
import statsRouter from './routes/stats.js';

// Importation du middleware centralisé de gestion des erreurs
import { errorHandler } from './middlewares/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initialisation de l'application Express.
 * Note académique : Ce fichier configure les middlewares et les routes mais n'appelle
 * PAS app.listen(), afin de faciliter les tests d'intégration avec Supertest
 * et de séparer la configuration du démarrage du serveur HTTP.
 */
const app = express();

// ============================================================================
// DOCUMENTATION INTERACTIVE OPENAPI / SWAGGER UI
// Conforme au guide officiel du cours comem-archioweb/guides/api-documentation.md
// ============================================================================
try {
  const openApiPath = path.join(__dirname, 'openapi.yml');
  if (fs.existsSync(openApiPath)) {
    const openApiDocument = load(fs.readFileSync(openApiPath, 'utf8'));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }
} catch (e) {
  console.warn('⚠️ Impossible de charger la documentation Swagger :', e.message);
}

// ============================================================================
// MIDDLEWARES GLOBAUX
// ============================================================================

// Active le partage de ressources cross-origin (CORS) pour les clients mobiles et Web
app.use(cors());

// Parse automatiquement les corps de requêtes entrants au format JSON
app.use(express.json());

// ============================================================================
// ROUTE DE SANTÉ / ACCUEIL DE L'API
// ============================================================================

/**
 * @route   GET /api
 * @desc    Vérification de la santé et du statut de l'API SoundMap
 * @access  Public
 */
app.get('/api', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: "Bienvenue sur l'API SoundMap",
    version: '1.0.0',
    documentation: {
      swagger: '/api-docs',
      auth: '/api/auth',
      users: '/api/users',
      zones: '/api/zones',
      musics: '/api/musics',
      stats: '/api/zones/stats/overview'
    }
  });
});

// ============================================================================
// BRANCHEMENT DES ROUTEURS MODULAIRES
// ============================================================================

// Routes d'authentification (Login JWT) - Attribué à Steve
app.use('/api/auth', authRouter);

// Routes utilisateurs (Inscription et profils) - Attribué à Steve
app.use('/api/users', usersRouter);

// Routes statistiques et agrégation MongoDB - Attribué à Nabil
// Accessible via /api/zones/stats et /api/stats pour commodité
app.use('/api/zones/stats', statsRouter);
app.use('/api/stats', statsRouter);

// Routes des zones géographiques (CRUD & filtres GPS) - Attribué à Luka
app.use('/api/zones', zonesRouter);

// Routes des musiques et votes - Attribué à Ryad & Nabil
app.use('/api/musics', musicsRouter);

// ============================================================================
// GESTION DES ROUTES INCONNUES (404)
// ============================================================================
app.use((req, res) => {
  res.status(404).json({
    error: `La route demandée (${req.method} ${req.originalUrl}) n'existe pas sur le serveur SoundMap.`
  });
});

// ============================================================================
// MIDDLEWARE DE GESTION D'ERREURS CENTRALISÉ
// Doit toujours être placé après tous les routeurs
// ============================================================================
app.use(errorHandler);

export default app;
