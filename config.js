import dotenv from 'dotenv';

// Charge les variables définies dans le fichier .env dans process.env
dotenv.config();

/**
 * Module centralisé de configuration de l'application SoundMap.
 * Permet de récupérer proprement les variables d'environnement avec des valeurs par défaut adaptées.
 */
export const config = {
  // Port d'écoute du serveur HTTP (3000 par défaut si non spécifié)
  port: process.env.PORT || 3000,

  // URL de connexion à MongoDB (Atlas en ligne ou MongoDB local)
  databaseUrl: process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/soundmap',

  // Clé secrète pour chiffrer/déchiffrer les JSON Web Tokens (JWT)
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_key_change_in_production'
};

export default config;
