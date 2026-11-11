import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Nombre de passes (salt rounds) pour l'algorithme de hachage bcrypt.
 * 10 est la valeur standard recommandée pour équilibrer sécurité et performances.
 */
const BCRYPT_SALT_ROUNDS = 10;

/**
 * Schéma Mongoose pour les Utilisateurs de SoundMap.
 * Représente un compte utilisateur (membre classique ou administrateur).
 */
const userSchema = new Schema(
  {
    // Pseudonyme unique de l'utilisateur
    username: {
      type: String,
      required: [true, "Le nom d'utilisateur est obligatoire."],
      unique: true,
      trim: true,
      minlength: [3, "Le nom d'utilisateur doit comporter au moins 3 caractères."],
      maxlength: [30, "Le nom d'utilisateur ne peut pas dépasser 30 caractères."]
    },

    // Empreinte de hachage sécurisée du mot de passe (générée par bcrypt).
    // On ne stocke jamais de mot de passe en clair en base de données.
    passwordHash: {
      type: String,
      required: [true, 'Le mot de passe haché est obligatoire.']
    },

    // Rôle de l'utilisateur pour le contrôle d'accès : 'user' (par défaut) ou 'admin'
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Le rôle doit être soit "user", soit "admin".'
      },
      default: 'user'
    },

    // Date de création du compte
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

/**
 * Méthode d'instance pour vérifier un mot de passe en clair contre l'empreinte hachée bcrypt.
 * 
 * @param {string} candidatePassword - Le mot de passe saisi par l'utilisateur lors du login
 * @returns {Promise<boolean>} - true si le mot de passe correspond, false sinon
 */
userSchema.methods.validatePassword = async function (candidatePassword) {
  if (typeof candidatePassword !== 'string' || candidatePassword.length === 0) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Méthode statique utilitaire pour hacher un mot de passe de façon sécurisée avec bcrypt.
 * 
 * @param {string} plainPassword - Le mot de passe en clair
 * @returns {Promise<string>} - Le hash bcrypt prêt à être stocké
 */
userSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
};

/**
 * Transformation toJSON :
 * Masque automatiquement les informations sensibles (`passwordHash`) et les métadonnées internes Mongoose (`__v`)
 * à chaque fois qu'un document User est sérialisé en JSON (ex: dans `res.json(user)`).
 */
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

const User = model('User', userSchema);

export default User;
