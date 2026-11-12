import http from 'http';
import mongoose from 'mongoose';
import app from '../app.js';
import { config } from '../config.js';

/**
 * ============================================================================
 * POINT D'ENTRÉE DU SERVEUR SOUNDMAP (bin/start.js)
 * ============================================================================
 * Rôle :
 * 1. Établit la connexion à MongoDB (Atlas ou local).
 *    Si aucun MongoDB local n'est détecté en mode développement,
 *    démarre automatiquement une instance en mémoire (MongoMemoryServer)
 *    pour permettre de tester immédiatement l'API et Swagger UI sans friction !
 * 2. Crée un serveur HTTP natif Node.js basé sur la configuration Express.
 * 3. Démarre l'écoute réseau sur le port configuré (PORT dans .env).
 * 4. Intercepte les signaux d'arrêt pour une fermeture propre.
 */

let memoryServerInstance = null;

async function connectDatabase() {
  console.log('🔄 Connexion à MongoDB en cours...');
  console.log(`📍 URL cible : ${config.databaseUrl}`);

  try {
    // Tentative de connexion avec un timeout court (3s)
    await mongoose.connect(config.databaseUrl, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('✅ Connexion à MongoDB établie avec succès.');
  } catch (err) {
    // Si la base locale 127.0.0.1 échoue et qu'on n'est pas en production
    const isLocalhost =
      config.databaseUrl.includes('127.0.0.1') ||
      config.databaseUrl.includes('localhost');

    if (isLocalhost && process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Aucun serveur MongoDB local détecté en écoute sur le port 27017.');
      console.log('💡 Démarrage automatique d’une instance MongoDB en mémoire pour le développement...');
      
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create({
        instance: { dbName: 'soundmap' }
      });
      const inMemoryUri = memoryServerInstance.getUri();
      
      await mongoose.connect(inMemoryUri);
      console.log('✅ Connecté avec succès à MongoDB en mémoire :');
      console.log(`📦 URI active : ${inMemoryUri}`);
    } else {
      throw err;
    }
  }
}

async function startServer() {
  try {
    await connectDatabase();

    // Création du serveur HTTP basé sur notre application Express
    const server = http.createServer(app);

    // Démarrage de l'écoute sur le port défini
    server.listen(config.port, () => {
      console.log('----------------------------------------------------');
      console.log(`🚀 Serveur SoundMap démarré avec succès !`);
      console.log(`📡 URL d'accès local  : http://localhost:${config.port}/api`);
      console.log(`📖 Documentation Swagger : http://localhost:${config.port}/api-docs`);
      console.log(`🌍 Environnement      : ${process.env.NODE_ENV || 'development'}`);
      console.log('----------------------------------------------------');
    });

    // Gestion de l'arrêt gracieux
    const gracefulShutdown = async (signal) => {
      console.log(`\n🛑 Signal ${signal} reçu. Fermeture gracieuse du serveur...`);
      server.close(async () => {
        console.log('🔌 Serveur HTTP arrêté.');
        await mongoose.connection.close(false);
        if (memoryServerInstance) {
          await memoryServerInstance.stop();
        }
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

startServer();
