import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../app.js';
import User from '../models/User.js';
import { authenticate, requireAdmin } from '../middlewares/auth.js';

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

      // Vérification en base que le mot de passe est bien haché
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
      // Inscription préalable d'un utilisateur de test
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
      // Création utilisateur standard
      await request(app)
        .post('/api/users')
        .send({ username: 'userTest', password: 'password123' });

      const loginUser = await request(app)
        .post('/api/auth/login')
        .send({ username: 'userTest', password: 'password123' });
      userToken = loginUser.body.token;

      // Création compte admin
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
      // Avec token standard -> 403 Forbidden
      const forbiddenRes = await request(app)
        .get('/api/users/admin-check')
        .set('Authorization', `Bearer ${userToken}`);
      expect(forbiddenRes.status).toBe(403);
      expect(forbiddenRes.body).toHaveProperty('error');

      // Avec token admin -> 200 OK
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
