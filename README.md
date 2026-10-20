# 🎵 SoundMap - Backend API

> **Projet académique - Architecture Web (ArchiOWeb) - HEIG-VD**  
> Application mobile et web de cartographie musicale géolocalisée.

---

## 👥 Équipe de développement

* **Steve**
* **Nabil**
* **Luka**
* **Ryad**

---

## 📖 Présentation du projet

**SoundMap** est une plateforme permettant aux utilisateurs de découvrir, écouter et partager de la musique ancrée dans des lieux géographiques spécifiques (campus universitaire, parcs, places publiques, etc.).

L'application repose sur :
- **Node.js** & **Express** pour l'API RESTful (architecture moderne en ES Modules).
- **MongoDB** & **Mongoose** avec indexation géospatiale (`2dsphere`, formats GeoJSON).
- **JWT (JSON Web Tokens)** & **Bcrypt** pour l'authentification et la sécurité.
- **Jest** & **Supertest** pour la suite de tests automatisés.

---

## 📂 Architecture du projet

```text
soundmap/
├── bin/
│   └── start.js            # Point d'entrée : connexion MongoDB et lancement serveur HTTP
├── models/
│   ├── User.js             # Schéma Mongoose Utilisateur (hachage, rôles 'user'/'admin')
│   ├── Zone.js             # Schéma Mongoose Zone (GeoJSON Point, rayon, index 2dsphere)
│   └── Music.js            # Schéma Mongoose Musique (liens streaming, votes up/down)
├── middlewares/
│   ├── auth.js             # Middlewares JWT (authenticate et requireAdmin)
│   └── errorHandler.js     # Middleware centralisé de capture et formatage des erreurs
├── routes/
│   ├── auth.js             # Connexion / Login JWT (Attribué à Steve)
│   ├── users.js            # Inscription et gestion profils (Attribué à Steve)
│   ├── zones.js            # CRUD des zones géographiques et filtre GPS (Attribué à Luka)
│   ├── musics.js           # CRUD musiques, votes et vérification GPS (Attribué à Ryad & Nabil)
│   └── stats.js            # Agrégation MongoDB avancée (Attribué à Nabil)
├── tests/
│   └── api.test.js         # Tests fonctionnels d'intégration (Jest + Supertest)
├── .env.example            # Gabarit des variables d'environnement requises
├── .gitignore              # Fichiers et dossiers exclus du suivi Git
├── app.js                  # Configuration Express, middlewares et routage
├── config.js               # Chargement propre des variables avec dotenv
├── package.json            # Scripts npm et dépendances
└── README.md               # Guide d'installation et organisation
```

---

## 📋 Répartition des tâches (Zéro conflit Git)

Pour garantir un travail collaboratif fluide sans conflits de fusion sur Git, chaque membre est responsable de ses propres fichiers et endpoints :

| Développeur | Fichiers attribués | Endpoints & Responsabilités |
| :--- | :--- | :--- |
| **Steve** | `routes/auth.js`<br>`routes/users.js`<br>`models/User.js` | • `POST /api/users` : Inscription d'un utilisateur avec hash bcrypt.<br>• `POST /api/auth/login` : Authentification et émission du token JWT.<br>• `GET /api/users` : Consultation de la liste des membres.<br>• `GET /api/users/:id` : Consultation du profil utilisateur. |
| **Luka** | `routes/zones.js`<br>`models/Zone.js` | • `GET /api/zones` : Liste globale et recherche géospatiale (`$nearSphere` / coord. GPS).<br>• `GET /api/zones/:id` : Consultation d'une zone.<br>• `POST /api/zones` : Création de zone (admin uniquement).<br>• `PATCH /api/zones/:id` : Mise à jour de zone (admin uniquement).<br>• `DELETE /api/zones/:id` : Suppression de zone (admin uniquement). |
| **Ryad** | `routes/musics.js` *(partie création / modif / votes)*<br>`models/Music.js` | • `POST /api/musics` : Dépôt d'un morceau avec **vérification GPS stricte** (l'utilisateur doit être dans le rayon de la zone).<br>• `PATCH /api/musics/:id` : Édition (auteur ou admin).<br>• `DELETE /api/musics/:id` : Suppression (auteur ou admin).<br>• `POST /api/musics/:id/vote` : Système de vote interactif upvote / downvote. |
| **Nabil** | `routes/musics.js` *(partie consultation)*<br>`routes/stats.js` | • `GET /api/musics` : Récupération des musiques avec **pagination** (`?page=1&limit=10`) et **filtres** (`?zone=...&genre=...`).<br>• `GET /api/zones/stats/overview` : Pipeline d'**agrégation MongoDB** (`$group`, `$lookup`, `$project`) calculant les musiques et votes par zone. |

---

## 🚀 Installation et Démarrage rapide

### 1. Cloner le dépôt et installer les dépendances
```bash
npm install
```

### 2. Configurer les variables d'environnement
Copiez le fichier d'exemple pour créer votre fichier `.env` local :
```bash
cp .env.example .env
```
*(Sur Windows PowerShell : `Copy-Item .env.example .env`)*

Éditez le fichier `.env` avec votre chaîne de connexion MongoDB (ex: MongoDB Atlas ou MongoDB local) :
```env
PORT=3000
DATABASE_URL=mongodb://127.0.0.1:27017/soundmap
JWT_SECRET=votre_cle_secrete_ultra_robuste
```

### 3. Démarrer le serveur en mode développement
Grâce à `nodemon`, le serveur redémarre automatiquement à chaque sauvegarde :
```bash
npm run dev
```
Le serveur sera accessible sur : `http://localhost:3000/api`

### 4. Lancer les tests automatisés
Pour valider le bon fonctionnement de l'API et vérifier la couverture :
```bash
npm test
```

---

## 🛠️ Bonnes pratiques Git pour le groupe

1. **Ne travaillez jamais directement sur `main`** :
   Chaque membre crée une branche dédiée à sa fonctionnalité :
   ```bash
   git checkout -b feature/steve-auth
   git checkout -b feature/luka-zones
   git checkout -b feature/ryad-musics-gps
   git checkout -b feature/nabil-stats-aggregation
   ```
2. **Faites des commits réguliers et explicites** :
   ```bash
   git commit -m "feat(auth): ajout de la méthode login avec JWT"
   ```
3. **Mettez à jour votre branche par rapport à main avant d'ouvrir une Pull Request** :
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/votre-nom
   git merge main
   ```
4. **Ouvrez une Pull Request sur GitHub** pour validation croisée par au moins un autre membre de l'équipe avant la fusion dans `main`.
