'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { app, mockPrisma } = require('../setup');
const { createTestClient } = require('../helpers/testClient');
const { signAccessToken } = require('../../src/utils/jwt.utils');

describe('Security Hardening — Features 1 & 6: Authentication & Token Rotation', () => {
  const client = createTestClient(app);

  const testUser = {
    id: '11111111-2222-3333-4444-555555555555',
    email: 'test-admin@payroll.com',
    password: '', // will set hash
    name: 'Test Administrator',
    role: 'SUPER_ADMIN',
    is_active: true,
  };

  beforeEach(async () => {
    mockPrisma.reset();
    testUser.password = await bcrypt.hash('CorrectPassword123!', 10);
    await mockPrisma.user.create({ data: testUser });
  });

  it('Feature 1: /api/v1/auth/reset-password endpoint has been removed (returns 404)', async () => {
    const res = await client.post('/api/v1/auth/reset-password', {
      email: testUser.email,
      newPassword: 'AttackerNewPassword123!',
      confirmPassword: 'AttackerNewPassword123!',
    });

    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /Route not found/i);

    // Verify password was NOT changed in the database
    const user = await mockPrisma.user.findUnique({ where: { email: testUser.email } });
    const isOldPassword = await bcrypt.compare('CorrectPassword123!', user.password);
    assert.equal(isOldPassword, true);
  });

  it('Feature 6: POST /api/v1/auth/login sets refresh cookie with strict Path=/api/v1/auth and HttpOnly', async () => {
    const res = await client.post('/api/v1/auth/login', {
      email: testUser.email,
      password: 'CorrectPassword123!',
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken);

    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie);
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.match(cookieStr, /refreshToken=/);
    assert.match(cookieStr, /Path=\/api\/v1\/auth/i);
    assert.match(cookieStr, /HttpOnly/i);

    // Verify token stored in mock database
    const stored = await mockPrisma.refreshToken.findMany({ where: { user_id: testUser.id } });
    assert.equal(stored.length, 1);
  });

  it('Feature 6: POST /api/v1/auth/refresh executes Refresh Token Rotation (RTR)', async () => {
    // 1. Initial Login
    const loginRes = await client.post('/api/v1/auth/login', {
      email: testUser.email,
      password: 'CorrectPassword123!',
    });
    const setCookie = loginRes.headers['set-cookie'];
    const initialCookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const initialToken = initialCookie.split(';')[0]; // "refreshToken=..."

    const initialStoredTokens = await mockPrisma.refreshToken.findMany({ where: { user_id: testUser.id } });
    assert.equal(initialStoredTokens.length, 1);
    const firstTokenVal = initialStoredTokens[0].token;

    // 2. Perform Refresh
    const refreshClient = client.withCookie(initialToken);
    const refreshRes = await refreshClient.post('/api/v1/auth/refresh');

    assert.equal(refreshRes.status, 200);
    assert.equal(refreshRes.body.success, true);
    assert.ok(refreshRes.body.data.accessToken);

    const newSetCookie = refreshRes.headers['set-cookie'];
    assert.ok(newSetCookie);
    const newCookieStr = Array.isArray(newSetCookie) ? newSetCookie[0] : newSetCookie;
    assert.match(newCookieStr, /Path=\/api\/v1\/auth/i);

    // 3. Verify Database: Old token deleted, new rotated token exists
    const currentStoredTokens = await mockPrisma.refreshToken.findMany({ where: { user_id: testUser.id } });
    assert.equal(currentStoredTokens.length, 1);
    assert.notEqual(currentStoredTokens[0].token, firstTokenVal);

    // 4. Replay Attack Prevention: Attempt refresh using the old token again
    const replayRes = await client.withCookie(initialToken).post('/api/v1/auth/refresh');
    assert.equal(replayRes.status, 401);
    assert.equal(replayRes.body.success, false);
    assert.match(replayRes.body.message, /Session expired|Invalid/i);
  });

  it('Feature 6: POST /api/v1/auth/logout clears cookie with matching Path=/api/v1/auth and deletes DB record', async () => {
    // Login first
    const loginRes = await client.post('/api/v1/auth/login', {
      email: testUser.email,
      password: 'CorrectPassword123!',
    });
    const setCookie = loginRes.headers['set-cookie'];
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    const tokenCookie = cookie.split(';')[0];

    // Call logout
    const logoutRes = await client.withCookie(tokenCookie).post('/api/v1/auth/logout');
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.success, true);

    // Verify cookie cleared with Path=/api/v1/auth
    const clearCookie = logoutRes.headers['set-cookie'];
    assert.ok(clearCookie);
    const clearCookieStr = Array.isArray(clearCookie) ? clearCookie[0] : clearCookie;
    assert.match(clearCookieStr, /Path=\/api\/v1\/auth/i);
    assert.match(clearCookieStr, /Expires=Thu, 01 Jan 1970|Max-Age=0/i);

    // Verify token deleted from database
    const stored = await mockPrisma.refreshToken.findMany({ where: { user_id: testUser.id } });
    assert.equal(stored.length, 0);
  });

  it('Feature 6: POST /api/v1/auth/change-password revokes all existing refresh tokens in DB', async () => {
    // Create multiple active refresh tokens
    await mockPrisma.refreshToken.create({
      data: { token: 'token-device-1', user_id: testUser.id, expires_at: new Date(Date.now() + 86400000) },
    });
    await mockPrisma.refreshToken.create({
      data: { token: 'token-device-2', user_id: testUser.id, expires_at: new Date(Date.now() + 86400000) },
    });

    const activeTokensBefore = await mockPrisma.refreshToken.findMany({ where: { user_id: testUser.id } });
    assert.equal(activeTokensBefore.length, 2);

    const authToken = signAccessToken({ id: testUser.id, email: testUser.email, role: testUser.role });

    const changeRes = await client.withBearer(authToken).post('/api/v1/auth/change-password', {
      currentPassword: 'CorrectPassword123!',
      newPassword: 'BrandNewSecurePassword456!',
    });

    assert.equal(changeRes.status, 200);
    assert.equal(changeRes.body.success, true);

    // Verify all active refresh tokens for user were revoked
    const activeTokensAfter = await mockPrisma.refreshToken.findMany({ where: { user_id: testUser.id } });
    assert.equal(activeTokensAfter.length, 0);

    // Verify password was updated in DB
    const updatedUser = await mockPrisma.user.findUnique({ where: { id: testUser.id } });
    const isNewValid = await bcrypt.compare('BrandNewSecurePassword456!', updatedUser.password);
    assert.equal(isNewValid, true);

    // Old password should fail login
    const oldLogin = await client.post('/api/v1/auth/login', {
      email: testUser.email,
      password: 'CorrectPassword123!',
    });
    assert.equal(oldLogin.status, 401);

    // New password should succeed login
    const newLogin = await client.post('/api/v1/auth/login', {
      email: testUser.email,
      password: 'BrandNewSecurePassword456!',
    });
    assert.equal(newLogin.status, 200);
  });
});
