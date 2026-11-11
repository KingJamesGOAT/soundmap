import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/User.js';
import Zone from '../models/Zone.js';
import Music from '../models/Music.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 30000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
}, 30000);

afterEach(async () => {
  await Music.deleteMany({});
  await Zone.deleteMany({});
  await User.deleteMany({});
});

describe('API SoundMap - Tests Authentification & Utilisateurs (Steve)', () => {

  it('GET /api devrait répondre avec un code 200 et un statut "ok"', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
  });

  it('GET /api/route-inconnue devrait répondre avec un code 404', async () => {
    const response = await request(app).get('/api/route-inconnue');
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  describe('POST /api/users (Inscription)', () => {
    it('devrait créer un nouvel utilisateur avec succès (201) et masquer son mot de passe', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'alice', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('username', 'alice');
      expect(response.body).toHaveProperty('role', 'user');
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('password');

      const userInDb = await User.findOne({ username: 'alice' });
      expect(userInDb).not.toBeNull();
      expect(userInDb.passwordHash).not.toBe('password123');
      expect(userInDb.passwordHash).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('devrait rejeter une inscription si le nom d’utilisateur est manquant ou trop court (400)', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'al', password: 'password123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait rejeter une inscription si le mot de passe est manquant ou trop court (400)', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({ username: 'alice', password: '12' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait refuser les doublons d’utilisateurs avec un code 409 (Conflict)', async () => {
      await request(app)
        .post('/api/users')
        .send({ username: 'bob', password: 'password123' });

      const duplicateResponse = await request(app)
        .post('/api/users')
        .send({ username: 'bob', password: 'anotherPassword' });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login (Connexion)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/users')
        .send({ username: 'charlie', password: 'securePassword123' });
    });

    it('devrait générer un jeton JWT valide en cas d’identifiants corrects (200)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'charlie', password: 'securePassword123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'charlie');
      expect(response.body.user).not.toHaveProperty('passwordHash');
    });

    it('devrait renvoyer 400 si le nom d’utilisateur ou le mot de passe est manquant', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'charlie' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait renvoyer 401 si le nom d’utilisateur n’existe pas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'utilisateurInconnu', password: 'securePassword123' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait renvoyer 401 si le mot de passe est erroné', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'charlie', password: 'mauvaisPassword' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/me & Middlewares (authenticate & requireAdmin)', () => {
    let userToken;
    let adminToken;

    beforeEach(async () => {
      await request(app)
        .post('/api/users')
        .send({ username: 'userTest', password: 'password123' });

      const loginUser = await request(app)
        .post('/api/auth/login')
        .send({ username: 'userTest', password: 'password123' });
      userToken = loginUser.body.token;

      await request(app)
        .post('/api/users')
        .send({ username: 'adminTest', password: 'adminPassword123', role: 'admin' });

      const loginAdmin = await request(app)
        .post('/api/auth/login')
        .send({ username: 'adminTest', password: 'adminPassword123' });
      adminToken = loginAdmin.body.token;
    });

    it('GET /api/users/me devrait refuser l’accès sans jeton (401)', async () => {
      const response = await request(app).get('/api/users/me');
      expect(response.status).toBe(401);
      expect(response.headers['www-authenticate']).toContain('Bearer');
    });

    it('GET /api/users/me devrait renvoyer le profil de l’utilisateur connecté avec son jeton (200)', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'userTest');
      expect(response.body).toHaveProperty('role', 'user');
    });

    it('GET /api/users devrait renvoyer la liste des utilisateurs sans mot de passe haché (200)', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).not.toHaveProperty('passwordHash');
    });

    it('GET /api/users/:id devrait renvoyer un utilisateur par son identifiant (200)', async () => {
      const listResponse = await request(app).get('/api/users');
      const targetUser = listResponse.body[0];

      const response = await request(app).get(`/api/users/${targetUser._id}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', targetUser.username);
    });

    it('GET /api/users/:id devrait renvoyer 404 pour un identifiant inexistant', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/users/${fakeId}`);
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait refuser l’accès avec 403 Forbidden via requireAdmin si l’utilisateur n’est pas admin', async () => {
      const forbiddenRes = await request(app)
        .get('/api/users/admin-check')
        .set('Authorization', `Bearer ${userToken}`);
      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body).toHaveProperty('error');

      const okRes = await request(app)
        .get('/api/users/admin-check')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(okRes.status).toBe(200);
      expect(okRes.body).toHaveProperty('message');
    });

    it('devrait refuser un token malformé avec 401', async () => {
      const badTokenRes = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer token_completement_invalide');
      expect(badTokenRes.status).toBe(401);
      expect(badTokenRes.body).toHaveProperty('error');
    });
  });

});

describe('API SoundMap - Tests Musiques, Dépôt GPS & Votes (Ryad)', () => {
  let userToken;
  let otherUserToken;
  let adminToken;
  let userProfile;
  let testZone;

  beforeEach(async () => {
    const resUser = await request(app)
      .post('/api/users')
      .send({ username: 'ryadUser', password: 'password123' });
    userProfile = resUser.body;

    const resLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ryadUser', password: 'password123' });
    userToken = resLogin.body.token;

    await request(app)
      .post('/api/users')
      .send({ username: 'intruderUser', password: 'password123' });

    const resLoginOther = await request(app)
      .post('/api/auth/login')
      .send({ username: 'intruderUser', password: 'password123' });
    otherUserToken = resLoginOther.body.token;

    await request(app)
      .post('/api/users')
      .send({ username: 'superAdmin', password: 'adminPassword123', role: 'admin' });

    const resLoginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ username: 'superAdmin', password: 'adminPassword123' });
    adminToken = resLoginAdmin.body.token;

    testZone = await Zone.create({
      name: 'HEIG-VD Campus Yverdon',
      description: 'Site de Cheseaux',
      location: {
        type: 'Point',
        coordinates: [6.6412, 46.7785]
      },
      radius: 500,
      createdBy: userProfile._id
    });
  });

  describe('POST /api/musics (Dépôt avec vérification GPS)', () => {
    it('devrait accepter le dépôt si l’utilisateur est physiquement dans la zone (201)', async () => {
      const validCoords = [6.6413, 46.7786];

      const response = await request(app)
        .post('/api/musics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Get Lucky',
          artist: 'Daft Punk',
          genre: 'Electro',
          url: 'https://open.spotify.com/track/getlucky',
          zoneId: testZone._id,
          userCoordinates: validCoords
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'Get Lucky');
      expect(response.body).toHaveProperty('artist', 'Daft Punk');
      expect(response.body).toHaveProperty('postedBy', userProfile._id);
      expect(response.body).toHaveProperty('score', 0);
    });

    it('devrait refuser le dépôt si l’utilisateur est hors du rayon de la zone (400)', async () => {
      const lausanneCoords = [6.6323, 46.5197];

      const response = await request(app)
        .post('/api/musics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Around the World',
          artist: 'Daft Punk',
          genre: 'Electro',
          url: 'https://open.spotify.com/track/aroundtheworld',
          zoneId: testZone._id,
          userCoordinates: lausanneCoords
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Dépôt refusé');
    });

    it('devrait refuser le dépôt si la zone spécifiée n’existe pas (404)', async () => {
      const nonExistentZoneId = new mongoose.Types.ObjectId();

      const response = await request(app)
        .post('/api/musics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'One More Time',
          artist: 'Daft Punk',
          genre: 'Electro',
          url: 'https://open.spotify.com/track/onemoretime',
          zoneId: nonExistentZoneId,
          userCoordinates: [6.6412, 46.7785]
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait refuser le dépôt sans authentification (401)', async () => {
      const response = await request(app)
        .post('/api/musics')
        .send({
          title: 'One More Time',
          artist: 'Daft Punk',
          url: 'https://spotify.com/track',
          zoneId: testZone._id,
          userCoordinates: [6.6412, 46.7785]
        });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH & DELETE /api/musics/:id (Autorisations)', () => {
    let createdMusic;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/musics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Harder, Better, Faster, Stronger',
          artist: 'Daft Punk',
          genre: 'Electro',
          url: 'https://spotify.com/track/harder',
          zoneId: testZone._id,
          userCoordinates: [6.6412, 46.7785]
        });
      createdMusic = res.body;
    });

    it('devrait permettre à l’auteur de modifier son morceau (200)', async () => {
      const response = await request(app)
        .patch(`/api/musics/${createdMusic._id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ title: 'Harder Better Faster Stronger (Remix)' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Harder Better Faster Stronger (Remix)');
    });

    it('devrait interdire à un autre utilisateur de modifier la musique (403 Forbidden)', async () => {
      const response = await request(app)
        .patch(`/api/musics/${createdMusic._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Titre piraté' });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait autoriser un administrateur à modifier n’importe quel morceau (200)', async () => {
      const response = await request(app)
        .patch(`/api/musics/${createdMusic._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ genre: 'French Touch' });

      expect(response.status).toBe(200);
      expect(response.body.genre).toBe('French Touch');
    });

    it('devrait interdire la suppression à un tiers non-auteur (403)', async () => {
      const response = await request(app)
        .delete(`/api/musics/${createdMusic._id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
    });

    it('devrait permettre à l’auteur de supprimer sa musique (204 No Content)', async () => {
      const response = await request(app)
        .delete(`/api/musics/${createdMusic._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(204);

      const getRes = await request(app).get(`/api/musics/${createdMusic._id}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe('POST /api/musics/:id/vote (Système de votes interactif)', () => {
    let musicToVote;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/musics')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Instant Crush',
          artist: 'Daft Punk ft. Julian Casablancas',
          genre: 'Synthpop',
          url: 'https://spotify.com/track/instantcrush',
          zoneId: testZone._id,
          userCoordinates: [6.6412, 46.7785]
        });
      musicToVote = res.body;
    });

    it('devrait enregistrer un upvote avec succès et incrémenter le score (200)', async () => {
      const response = await request(app)
        .post(`/api/musics/${musicToVote._id}/vote`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'up' });

      expect(response.status).toBe(200);
      expect(response.body.score).toBe(1);
      expect(response.body.upvotesCount).toBe(1);
      expect(response.body.downvotesCount).toBe(0);
    });

    it('devrait annuler le vote si l’utilisateur reclique sur le même choix (toggle)', async () => {
      await request(app)
        .post(`/api/musics/${musicToVote._id}/vote`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'up' });

      const response = await request(app)
        .post(`/api/musics/${musicToVote._id}/vote`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'up' });

      expect(response.status).toBe(200);
      expect(response.body.score).toBe(0);
      expect(response.body.upvotesCount).toBe(0);
    });

    it('devrait basculer automatiquement de downvote vers upvote sans doublon', async () => {
      await request(app)
        .post(`/api/musics/${musicToVote._id}/vote`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'down' });

      const response = await request(app)
        .post(`/api/musics/${musicToVote._id}/vote`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'up' });

      expect(response.status).toBe(200);
      expect(response.body.score).toBe(1);
      expect(response.body.upvotesCount).toBe(1);
      expect(response.body.downvotesCount).toBe(0);
    });
  });

});

describe('API SoundMap - Tests Consultation Paginée & Statistiques (Nabil)', () => {
  let alice;
  let bob;
  let zoneYverdon;
  let zoneLausanne;

  /**
   * Jeu de données inséré directement en base (sans passer par POST /api/musics)
   * afin de maîtriser les votes et les dates de création :
   *
   * | Titre                   | Artiste     | Genre   | Zone     | Up | Down | Score |
   * |-------------------------|-------------|---------|----------|----|------|-------|
   * | Around the World        | Daft Punk   | Electro | Yverdon  | 2  | 0    | 2     |
   * | Get Lucky               | Daft Punk   | electro | Yverdon  | 1  | 1    | 0     |
   * | Bohemian Rhapsody       | Queen       | Rock    | Lausanne | 0  | 1    | -1    |
   * | Smells Like Teen Spirit | Nirvana     | Rock    | Yverdon  | 1  | 0    | 1     |
   * | So What                 | Miles Davis | Jazz    | Lausanne | 0  | 0    | 0     |
   *
   * Les musiques sont listées de la plus ancienne à la plus récente.
   */
  beforeEach(async () => {
    alice = await User.create({ username: 'alice', passwordHash: 'hash-inutile-pour-ces-tests' });
    bob = await User.create({ username: 'bob', passwordHash: 'hash-inutile-pour-ces-tests' });

    zoneYverdon = await Zone.create({
      name: 'HEIG-VD Yverdon',
      location: { type: 'Point', coordinates: [6.6412, 46.7785] },
      radius: 500,
      createdBy: alice._id
    });
    zoneLausanne = await Zone.create({
      name: 'Place Chauderon',
      location: { type: 'Point', coordinates: [6.6243, 46.5225] },
      radius: 300,
      createdBy: alice._id
    });

    const musics = [
      { title: 'Around the World', artist: 'Daft Punk', genre: 'Electro', zone: zoneYverdon, upvotes: [alice, bob], downvotes: [] },
      { title: 'Get Lucky', artist: 'Daft Punk', genre: 'electro', zone: zoneYverdon, upvotes: [alice], downvotes: [bob] },
      { title: 'Bohemian Rhapsody', artist: 'Queen', genre: 'Rock', zone: zoneLausanne, upvotes: [], downvotes: [alice] },
      { title: 'Smells Like Teen Spirit', artist: 'Nirvana', genre: 'Rock', zone: zoneYverdon, upvotes: [bob], downvotes: [] },
      { title: 'So What', artist: 'Miles Davis', genre: 'Jazz', zone: zoneLausanne, upvotes: [], downvotes: [] }
    ];

    // Dates espacées d'une minute pour que le tri "recent" soit déterministe
    const baseDate = new Date('2026-01-01T12:00:00Z').getTime();
    await Music.insertMany(
      musics.map((music, index) => ({
        ...music,
        url: 'https://example.com/ecouter',
        zone: music.zone._id,
        postedBy: alice._id,
        upvotes: music.upvotes.map((user) => user._id),
        downvotes: music.downvotes.map((user) => user._id),
        createdAt: new Date(baseDate + index * 60000)
      }))
    );
  });

  // Raccourci : liste des titres d'une réponse paginée
  const titles = (response) => response.body.data.map((music) => music.title);

  describe('GET /api/musics (Liste paginée et filtrable)', () => {
    it('devrait paginer les résultats (page 1, limit 2) avec les métadonnées exactes (200)', async () => {
      const response = await request(app).get('/api/musics?page=1&limit=2');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ page: 1, limit: 2, totalItems: 5, totalPages: 3 });
      // Tri par défaut "recent" : les deux dernières musiques insérées
      expect(titles(response)).toEqual(['So What', 'Smells Like Teen Spirit']);
    });

    it('devrait renvoyer la dernière page partiellement remplie', async () => {
      const response = await request(app).get('/api/musics?page=3&limit=2');

      expect(response.status).toBe(200);
      expect(titles(response)).toEqual(['Around the World']);
    });

    it('devrait renvoyer un tableau vide au-delà de la dernière page', async () => {
      const response = await request(app).get('/api/musics?page=10&limit=2');

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.totalItems).toBe(5);
    });

    it('devrait appliquer les valeurs par défaut (page 1, limit 10)', async () => {
      const response = await request(app).get('/api/musics');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ page: 1, limit: 10, totalItems: 5, totalPages: 1 });
      expect(response.body.data).toHaveLength(5);
    });

    it('devrait accepter "pageSize" comme alias de "limit"', async () => {
      const response = await request(app).get('/api/musics?pageSize=3');

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(3);
      expect(response.body.data).toHaveLength(3);
    });

    it('devrait plafonner "limit" à 50 éléments par page', async () => {
      const response = await request(app).get('/api/musics?limit=1000');

      expect(response.status).toBe(200);
      expect(response.body.limit).toBe(50);
    });

    it('devrait peupler l’auteur et la zone, calculer le score et masquer le mot de passe', async () => {
      const response = await request(app).get('/api/musics?search=around');
      const [music] = response.body.data;

      expect(music.postedBy).toMatchObject({ username: 'alice', role: 'user' });
      expect(music.postedBy).not.toHaveProperty('passwordHash');
      expect(music.zone).toMatchObject({ name: 'HEIG-VD Yverdon', radius: 500 });
      expect(music.zone.location.coordinates).toEqual([6.6412, 46.7785]);
      expect(music.score).toBe(2);
      expect(music).not.toHaveProperty('sortScore');
    });

    it.each([
      ['page=-1', 'page négative'],
      ['page=0', 'page nulle'],
      ['page=1.5', 'page décimale'],
      ['page=abc', 'page non numérique'],
      ['limit=abc', 'limit non numérique'],
      ['limit=0', 'limit nulle'],
      ['pageSize=-5', 'pageSize négatif']
    ])('devrait rejeter une pagination invalide (%s : %s) avec un code 400', async (queryString) => {
      const response = await request(app).get(`/api/musics?${queryString}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait filtrer par genre sans tenir compte de la casse (genre=Electro)', async () => {
      const response = await request(app).get('/api/musics?genre=Electro');

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(2);
      expect(titles(response).sort()).toEqual(['Around the World', 'Get Lucky']);
    });

    it('devrait exiger le genre exact (genre=Elec ne renvoie rien)', async () => {
      const response = await request(app).get('/api/musics?genre=Elec');

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(0);
      expect(response.body.totalPages).toBe(0);
    });

    it('devrait filtrer par zone (zone=<id>)', async () => {
      const response = await request(app).get(`/api/musics?zone=${zoneLausanne._id}`);

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(2);
      response.body.data.forEach((music) => {
        expect(music.zone._id).toBe(zoneLausanne._id.toString());
      });
    });

    it('devrait renvoyer une liste vide pour une zone valide mais inexistante', async () => {
      const unknownZoneId = new mongoose.Types.ObjectId();
      const response = await request(app).get(`/api/musics?zone=${unknownZoneId}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('devrait rejeter un identifiant de zone mal formé avec un code 400', async () => {
      const response = await request(app).get('/api/musics?zone=pas-un-id');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait combiner plusieurs filtres (zone + genre)', async () => {
      const response = await request(app).get(`/api/musics?zone=${zoneYverdon._id}&genre=rock`);

      expect(response.status).toBe(200);
      expect(titles(response)).toEqual(['Smells Like Teen Spirit']);
    });

    it('devrait rechercher dans l’artiste sans tenir compte de la casse (search=daft)', async () => {
      const response = await request(app).get('/api/musics?search=daft');

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(2);
      expect(titles(response).sort()).toEqual(['Around the World', 'Get Lucky']);
    });

    it('devrait rechercher aussi dans le titre (search=SPIRIT)', async () => {
      const response = await request(app).get('/api/musics?search=SPIRIT');

      expect(response.status).toBe(200);
      expect(titles(response)).toEqual(['Smells Like Teen Spirit']);
    });

    it('devrait traiter les caractères spéciaux de la recherche comme du texte (pas de crash)', async () => {
      const response = await request(app).get('/api/musics?search=' + encodeURIComponent('(['));

      expect(response.status).toBe(200);
      expect(response.body.totalItems).toBe(0);
    });

    it('devrait rejeter un filtre répété (genre=a&genre=b) avec un code 400', async () => {
      const response = await request(app).get('/api/musics?genre=Rock&genre=Jazz');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('devrait trier par popularité (sort=popular) du meilleur au pire score', async () => {
      const response = await request(app).get('/api/musics?sort=popular');

      expect(response.status).toBe(200);
      expect(response.body.data.map((music) => music.score)).toEqual([2, 1, 0, 0, -1]);
      expect(titles(response)[0]).toBe('Around the World');
      expect(titles(response)[4]).toBe('Bohemian Rhapsody');
    });

    it('devrait rejeter une valeur de tri inconnue avec un code 400', async () => {
      const response = await request(app).get('/api/musics?sort=alphabetique');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/zones/stats/overview (Agrégation MongoDB)', () => {
    it('devrait répondre 200 avec la structure globalStats / zonesStats', async () => {
      const response = await request(app).get('/api/zones/stats/overview');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('globalStats');
      expect(response.body).toHaveProperty('zonesStats');
      expect(response.body.globalStats).toEqual({ totalMusics: 5, totalUsers: 2 });
      expect(response.body.zonesStats).toHaveLength(2);
    });

    it('devrait calculer exactement les compteurs de musiques et de votes par zone', async () => {
      const response = await request(app).get('/api/zones/stats/overview');
      const [yverdon, lausanne] = response.body.zonesStats;

      // Tri par nombre de musiques décroissant : Yverdon (3) avant Lausanne (2)
      expect(yverdon).toMatchObject({
        zoneId: zoneYverdon._id.toString(),
        zoneName: 'HEIG-VD Yverdon',
        totalMusics: 3,
        totalUpvotes: 4,
        totalDownvotes: 1,
        averageScore: 1
      });
      expect(yverdon.genres.sort()).toEqual(['Electro', 'Rock', 'electro']);

      expect(lausanne).toMatchObject({
        zoneId: zoneLausanne._id.toString(),
        zoneName: 'Place Chauderon',
        totalMusics: 2,
        totalUpvotes: 0,
        totalDownvotes: 1,
        averageScore: -0.5
      });
      expect(lausanne.genres.sort()).toEqual(['Jazz', 'Rock']);
    });

    it('devrait être accessible aussi via /api/stats/overview', async () => {
      const response = await request(app).get('/api/stats/overview');

      expect(response.status).toBe(200);
      expect(response.body.globalStats.totalMusics).toBe(5);
    });

    it('devrait conserver les musiques d’une zone supprimée (zoneName absent)', async () => {
      await Zone.findByIdAndDelete(zoneLausanne._id);
      const response = await request(app).get('/api/zones/stats/overview');
      const orphan = response.body.zonesStats.find(
        (stats) => stats.zoneId === zoneLausanne._id.toString()
      );

      expect(response.status).toBe(200);
      expect(orphan.totalMusics).toBe(2);
      expect(orphan).not.toHaveProperty('zoneName');
    });

    it('devrait renvoyer des statistiques vides si la base ne contient aucune musique', async () => {
      await Music.deleteMany({});
      const response = await request(app).get('/api/zones/stats/overview');

      expect(response.status).toBe(200);
      expect(response.body.globalStats).toEqual({ totalMusics: 0, totalUsers: 2 });
      expect(response.body.zonesStats).toEqual([]);
    });
  });
});
