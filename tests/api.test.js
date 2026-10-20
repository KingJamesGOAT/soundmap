import request from 'supertest';
import app from '../app.js';

/**
 * ============================================================================
 * TESTS FONCTIONNELS DE BASE DE L'API SOUNDMAP
 * ============================================================================
 * Utilise Supertest pour simuler des requêtes HTTP sans avoir besoin
 * de lancer un vrai serveur sur un port réseau.
 */

describe('API SoundMap - Tests de base', () => {

  /**
   * Test de la route de santé GET /api
   */
  it('GET /api devrait répondre avec un code 200 et un statut "ok"', async () => {
    const response = await request(app).get('/api');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('message', "Bienvenue sur l'API SoundMap");
  });

  /**
   * Test de la gestion des routes inexistantes (404)
   */
  it('GET /api/route-qui-nexiste-pas devrait répondre avec un code 404', async () => {
    const response = await request(app).get('/api/route-qui-nexiste-pas');

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  /**
   * Test de vérification d'un stub (501 Not Implemented)
   */
  it('POST /api/auth/login devrait répondre avec un code 501 tant qu’elle n’est pas codée', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'password123' });

    expect(response.status).toBe(501);
    expect(response.body).toHaveProperty('message');
  });

});
