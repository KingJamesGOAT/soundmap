import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { config } from '../config.js';

/**
 * ============================================================================
 * POINT D'ENTRÉE DU SERVEUR SOUNDMAP (bin/start.js)
 * ============================================================================
 * Rôle :
 * 1. Établit la connexion à la base de données MongoDB via Mongoose.
 * 2. Crée un serveur HTTP natif Node.js basé sur la configuration Express.
 *    (Ce choix prépare le terrain pour le cours de DevMobil afin d'y brancher
 *     ultérieurement des WebSockets avec Socket.io ou le module 'ws').
 * 3. Démarre l'écoute réseau sur le port configuré (PORT dans .env).
 * 4. Intercepte les signaux d'arrêt (SIGINT/SIGTERM) pour une fermeture propre.
 */

async function startServer() {
  try {
    console.log('🔄 Connexion à MongoDB en cours...');
    console.log(`📍 URL cible : ${config.databaseUrl}`);

    // Connexion à la base de données MongoDB
    await mongoose.connect(config.databaseUrl);
    console.log('✅ Connexion à MongoDB établie avec succès.');

    // Création du serveur HTTP basé sur notre application Express
    const server = http.createServer(app);

    // Démarrage de l'écoute sur le port défini
    server.listen(config.port, () => {
      console.log('----------------------------------------------------');
      console.log(`🚀 Serveur SoundMap démarré avec succès !`);
      console.log(`📡 URL d'accès local : http://localhost:${config.port}/api`);
      console.log(`🌍 Environnement     : ${process.env.NODE_ENV || 'development'}`);
      console.log('----------------------------------------------------');
    });

    // Gestion de l'arrêt gracieux (Ctrl+C ou arrêt conteneur)
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Signal ${signal} reçu. Fermeture gracieuse du serveur...`);
      server.close(async () => {
        console.log('🔌 Serveur HTTP arrêté.');
        await mongoose.connection.close(false);
        console.log('📦 Connexion MongoDB fermée proprement.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    console.error('❌ Échec critique lors du démarrage du serveur :', error.message);
    process.exit(1);
  }
}

// Lancement de la procédure de démarrage
startServer();
