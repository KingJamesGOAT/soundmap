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
