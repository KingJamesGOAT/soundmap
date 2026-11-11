import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Schéma Mongoose pour les Musiques de SoundMap.
 * Conforme aux exigences du projet ArchiOWeb (HEIG-VD).
 * 
 * Représente une recommandation musicale ancrée dans une Zone géographique.
 * Possède un système de votes communautaires (upvotes / downvotes) garantissant
 * qu'un utilisateur ne vote qu'une seule fois.
 */
const musicSchema = new Schema(
  {
    // Titre du morceau musical (ex: "Around the World", "Get Lucky")
    title: {
      type: String,
      required: [true, 'Le titre de la musique est obligatoire.'],
      trim: true,
      minlength: [1, 'Le titre doit comporter au moins 1 caractère.']
    },

    // Nom de l'artiste ou du groupe musical (ex: "Daft Punk")
    artist: {
      type: String,
      required: [true, "L'artiste de la musique est obligatoire."],
      trim: true,
      minlength: [1, "Le nom de l'artiste doit comporter au moins 1 caractère."]
    },

    // Genre musical (ex: "Electro", "Rock", "Hip-hop", "Jazz", etc.)
    genre: {
      type: String,
      required: [true, 'Le genre musical est obligatoire.'],
      trim: true,
      default: 'Autre'
    },

    // Lien ou URL vers la source d'écoute (ex: Spotify, YouTube, SoundCloud)
    url: {
      type: String,
      required: [true, "L'URL de la musique est obligatoire."],
      trim: true
    },

    // Liens optionnels vers d'autres plateformes de streaming
    links: {
      spotify: { type: String, trim: true, default: '' },
      appleMusic: { type: String, trim: true, default: '' },
      youtubeMusic: { type: String, trim: true, default: '' }
    },

    // Référence vers la zone géographique dans laquelle la musique est ancrée
    zone: {
      type: Schema.Types.ObjectId,
      ref: 'Zone',
      required: [true, 'La zone de rattachement est obligatoire.']
    },

    // Référence vers l'utilisateur ayant déposé ce morceau
    postedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'auteur du partage est obligatoire."]
    },

    // Tableau des identifiants d'utilisateurs ayant voté positivement
    upvotes: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: []
    },

    // Tableau des identifiants d'utilisateurs ayant voté négativement
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    timestamps: false
  }
);

/**
 * Propriété virtuelle calculant dynamiquement le score net de la musique :
 * score = nombre d'upvotes - nombre de downvotes
 */
musicSchema.virtual('score').get(function () {
  const ups = Array.isArray(this.upvotes) ? this.upvotes.length : 0;
  const downs = Array.isArray(this.downvotes) ? this.downvotes.length : 0;
  return ups - downs;
});

/**
 * Transformation toJSON :
 * Nettoie la propriété interne __v lors de la sérialisation en JSON.
 */
musicSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

const Music = model('Music', musicSchema);

export default Music;
