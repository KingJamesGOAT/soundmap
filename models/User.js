import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Schéma Mongoose pour les Utilisateurs de SoundMap.
 * Représente un compte utilisateur (membre classique ou administrateur).
 */
const userSchema = new Schema(
  {
    // Pseudonyme unique de l'utilisateur (nettoyé des espaces superflus)
    username: {
      type: String,
      required: [true, "Le nom d'utilisateur est obligatoire."],
      unique: true,
      trim: true,
      minlength: [3, "Le nom d'utilisateur doit comporter au moins 3 caractères."]
    },

    // ATTENTION DE SÉCURITÉ : On ne stocke JAMAIS de mot de passe en clair !
    // Ce champ contiendra l'empreinte de hachage sécurisée (hash bcrypt) calculée lors de l'inscription.
    passwordHash: {
      type: String,
      required: [true, 'Le mot de passe haché est obligatoire.']
    },

    // Rôle de l'utilisateur pour le contrôle d'accès : 'user' (défaut) ou 'admin'
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
    // Options de schéma
    timestamps: false
  }
);

/**
 * Transformation toJSON :
 * Permet de masquer automatiquement les données sensibles (comme passwordHash)
 * et les champs internes Mongoose (__v) chaque fois qu'un document User est transformé en JSON (ex: res.json(user)).
 */
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  }
});

// Création et exportation du modèle Mongoose
const User = model('User', userSchema);

export default User;
