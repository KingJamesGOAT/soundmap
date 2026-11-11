import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Vérifie qu'un tableau de coordonnées GeoJSON est valide.
 * Format attendu : [longitude, latitude]
 * - exactement deux nombres finis
 * - longitude comprise entre -180 et 180
 * - latitude comprise entre -90 et 90
 *
 * Exportée pour être réutilisée par les routes (validation avant enregistrement).
 *
 * @param {unknown} coordinates - Valeur à valider
 * @returns {boolean} - true si les coordonnées sont valides
 */
export function isValidCoordinates(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 2) {
    return false;
  }

  const [lng, lat] = coordinates;
  if (typeof lng !== 'number' || typeof lat !== 'number') {
    return false;
  }
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return false;
  }

  return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

/**
 * Sous-schéma GeoJSON "Point" (standard du cours ArchiOWeb, guide store-geospatial-data).
 *
 * ⚠️ RÈGLE FONDAMENTALE GÉOSPATIALE MONGODB :
 * Dans les spécifications GeoJSON et dans MongoDB, l'ordre des coordonnées est TOUJOURS :
 * [LONGITUDE, LATITUDE]
 * (et NON PAS [latitude, longitude] comme sur Google Maps !)
 * Exemple pour Yverdon-les-Bains : [6.6412, 46.7785]
 *
 * L'option { _id: false } évite que Mongoose ajoute un _id inutile au sous-document.
 */
const pointSchema = new Schema(
  {
    type: {
      type: String,
      enum: {
        values: ['Point'],
        message: 'Le type de géométrie doit être "Point".'
      },
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Les coordonnées [longitude, latitude] sont obligatoires.'],
      validate: {
        validator: isValidCoordinates,
        message:
          'Coordonnées invalides : format attendu [longitude, latitude] avec -180 <= longitude <= 180 et -90 <= latitude <= 90.'
      }
    }
  },
  { _id: false }
);

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
      trim: true,
      minlength: [2, 'Le nom de la zone doit comporter au moins 2 caractères.']
    },

    // Description textuelle optionnelle pour donner du contexte au lieu
    description: {
      type: String,
      trim: true,
      default: ''
    },

    // Localisation géographique au format GeoJSON standard (Point)
    location: {
      type: pointSchema,
      required: [true, 'La localisation GeoJSON de la zone est obligatoire.']
    },

    // Rayon de couverture de la zone en mètres (par défaut 500 mètres, minimum 10 mètres)
    radius: {
      type: Number,
      required: [true, 'Le rayon de la zone est obligatoire.'],
      default: 500,
      min: [10, 'Le rayon minimum d’une zone est de 10 mètres.']
    },

    // Référence vers l'administrateur ayant créé la zone
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

// Nettoyage de la propriété interne __v lors de la conversion en JSON
zoneSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

// Création et exportation du modèle Mongoose
const Zone = model('Zone', zoneSchema);

export default Zone;
