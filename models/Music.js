import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Schéma Mongoose pour les Musiques de SoundMap.
 * Représente un titre musical partagé par un utilisateur au sein d'une zone géographique spécifique.
 * Inclut des liens d'écoute streaming et un système de votes communautaires (upvotes / downvotes).
 */
const musicSchema = new Schema(
  {
    // Titre du morceau musical (ex: "Get Lucky", "Bohemian Rhapsody")
    title: {
      type: String,
      required: [true, 'Le titre de la musique est obligatoire.'],
      trim: true
    },

    // Nom de l'artiste ou du groupe (ex: "Daft Punk", "Queen")
    artist: {
      type: String,
      required: [true, "L'artiste de la musique est obligatoire."],
      trim: true
    },

    // Genre musical (ex: "Electro", "Rock", "Hip-Hop", "Jazz", etc.)
    genre: {
      type: String,
      required: [true, 'Le genre musical est obligatoire.'],
      trim: true
    },

    // Liens vers les plateformes de streaming pour écouter le morceau
    links: {
      spotify: {
        type: String,
        trim: true,
        default: ''
      },
      appleMusic: {
        type: String,
        trim: true,
        default: ''
      },
      youtubeMusic: {
        type: String,
        trim: true,
        default: ''
      }
    },

    // Référence vers la zone géographique dans laquelle la musique est déposée
    zone: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'La zone de rattachement est obligatoire.']
    },

    // Référence vers l'utilisateur qui a partagé cette musique
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'auteur du partage est obligatoire."]
    },

    // Tableau des identifiants d'utilisateurs ayant voté positivement (pouce haut)
    upvotes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: []
    },

    // Tableau des identifiants d'utilisateurs ayant voté négativement (pouce bas)
    downvotes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: []
    },

    // Horodatage du dépôt de la musique
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Nettoyage de la propriété interne __v lors de la conversion en JSON
musicSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

// Création et exportation du modèle Mongoose
const Music = model('Music', musicSchema);

export default Music;
