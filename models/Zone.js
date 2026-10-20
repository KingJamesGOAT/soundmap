import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Schéma Mongoose pour les Zones géographiques de SoundMap.
 * Représente un périmètre géographique circulaire autour d'un point GPS (Point GeoJSON).
 * Les utilisateurs peuvent déposer ou écouter de la musique lorsqu'ils se trouvent dans ce rayon.
 */
const zoneSchema = new Schema(
  {
    // Nom unique de la zone (ex: "HEIG-VD Cheseaux", "Place Chauderon", etc.)
    name: {
      type: String,
      required: [true, 'Le nom de la zone est obligatoire.'],
      unique: true,
      trim: true
    },

    // Description textuelle optionnelle pour donner du contexte au lieu
    description: {
      type: String,
      trim: true,
      default: ''
    },

    /**
     * Localisation géographique au format GeoJSON standard.
     * 
     * ⚠️ RÈGLE FONDAMENTALE GÉOSPATIALE MONGODB :
     * Dans les spécifications GeoJSON et dans MongoDB, l'ordre des coordonnées est TOUJOURS :
     * [LONGITUDE, LATITUDE]
     * (et NON PAS [latitude, longitude] comme sur Google Maps !)
     * - Longitude : valeur entre -180 et +180 (axe X, Est-Ouest)
     * - Latitude  : valeur entre -90 et +90 (axe Y, Nord-Sud)
     * Exemple pour Yverdon-les-Bains : [6.6412, 46.7785]
     */
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
        default: 'Point'
      },
      coordinates: {
        type: [Number], // Tableau de deux nombres : [longitude, latitude]
        required: [true, 'Les coordonnées [longitude, latitude] sont obligatoires.']
      }
    },

    // Rayon de couverture de la zone en mètres (par défaut 500 mètres, minimum 10 mètres)
    radius: {
      type: Number,
      required: [true, 'Le rayon de la zone est obligatoire.'],
      default: 500,
      min: [10, 'Le rayon minimum d’une zone est de 10 mètres.']
    },

    // Référence vers l'utilisateur (généralement un administrateur) ayant créé la zone
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "L'identifiant du créateur est obligatoire."]
    },

    // Date de création de la zone
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
 * 🌍 INDEX GÉOSPATIAL 2DSPHERE :
 * Cet index est indispensable pour exécuter des requêtes géospatiales optimisées dans MongoDB,
 * comme $near, $geoWithin, ou le calcul de distances sur une sphère terrestre ($nearSphere).
 */
zoneSchema.index({ location: '2dsphere' });

// Nettoyage de la propriété __v lors de la conversion en JSON
zoneSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

// Création et exportation du modèle Mongoose
const Zone = model('Zone', zoneSchema);

export default Zone;
