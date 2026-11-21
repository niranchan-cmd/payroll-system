'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, resetDatabase, DEFAULT_PASSWORD } = require('../../helpers/testFixtures');

describe('Suite 1: Authentication Security & Rate Limiting (Tier 2)', () => {
  let client;

  beforeEach(() => {
    resetDatabase();
    client = createTestClient(app);
  });

  it('T2.AUTH.1: Login rejects incorrect password with 401 Unauthorized and generic error message', async () => {
    const { user } = await seedUser('ADMIN', { email: 'wrong-pass@payroll.test' });

    const res = await client.post('/api/v1/auth/login', {
      email: user.email,
      password: 'DefinitiveWrongPassword!999',
    });

    assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid credentials.');
    assert.ok(res.body.attemptsRemaining !== undefined, 'Expected attemptsRemaining in response');
  });

  it('T2.AUTH.2: Login rejects non-existent email address with 401 Unauthorized', async () => {
    const res = await client.post('/api/v1/auth/login', {
      email: 'nonexistent-ghost-user@payroll.test',
      password: DEFAULT_PASSWORD,
    });

    assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.equal(res.body.message, 'Invalid credentials.');
  });

  it('T2.AUTH.3: Unauthenticated password reset endpoint /auth/reset-password rejects arbitrary reset without token', async () => {
    const res = await client.post('/api/v1/auth/reset-password', {
      email: 'target-victim@payroll.test',
      newPassword: 'HackedPassword@123',
    });

    // Insecure unauthenticated endpoint was eliminated; must return 404 Route not found or 401 Unauthorized
    assert.ok(
      res.status === 404 || res.status === 401 || res.status === 403,
      `Expected rejection status (404/401/403), got ${res.status}`
    );
    assert.equal(res.body.success, false);
  });

  it('T2.AUTH.4: Tampered or malformed JWT Bearer token is rejected with 401 Unauthorized', async () => {
    const malformedTokens = [
      'not.a.valid.jwt',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tamperedpayload.signature',
      'random-garbage-string-xyz',
    ];

    for (const badToken of malformedTokens) {
      const res = await client.withBearer(badToken).get('/api/v1/auth/me');
      assert.equal(res.status, 401, `Expected 401 for token: ${badToken}, got: ${res.status}`);
      assert.equal(res.body.success, false);
      assert.ok(
        res.body.message.includes('Invalid token') || res.body.message.includes('No token provided'),
        `Unexpected error message: ${res.body.message}`
      );
    }
  });

  it('T2.AUTH.5: Expired access token returns 401 with TokenExpiredError payload prompting refresh', async () => {
    const expiredToken = jwt.sign(
      { id: 'expired-user-id', email: 'expired@payroll.test', role: 'ADMIN' },
      process.env.JWT_SECRET,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );

    const res = await client.withBearer(expiredToken).get('/api/v1/auth/me');

    assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.message.toLowerCase().includes('expired') || res.body.message.toLowerCase().includes('refresh'),
      `Expected message mentioning expiry/refresh, got: ${res.body.message}`
    );
  });
});
