'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, resetDatabase, DEFAULT_PASSWORD } = require('../../helpers/testFixtures');

describe('Suite 1: Authentication & Session Management (Tier 1)', () => {
  let client;

  beforeEach(() => {
    resetDatabase();
    client = createTestClient(app);
  });

  it('T1.AUTH.1: Successful login with valid SUPER_ADMIN credentials returns accessToken and sets refreshToken cookie', async () => {
    const { user, rawPassword } = await seedUser('SUPER_ADMIN', {
      email: 'superadmin@payroll.test',
      name: 'Super Admin User',
    });

    const res = await client.post('/api/v1/auth/login', {
      email: user.email,
      password: rawPassword,
    });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.accessToken, 'Expected accessToken in login response');
    assert.equal(res.body.data.user.email, user.email);
    assert.equal(res.body.data.user.role, 'SUPER_ADMIN');

    // Assert set-cookie header contains refreshToken
    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie, 'Expected Set-Cookie header');
    const cookieHeader = Array.isArray(setCookie) ? setCookie.join('; ') : String(setCookie);
    assert.ok(cookieHeader.includes('refreshToken='), 'Expected refreshToken in Set-Cookie');
    assert.ok(cookieHeader.includes('HttpOnly'), 'Expected HttpOnly flag in cookie');
  });

  it('T1.AUTH.2: Token refresh using valid refreshToken cookie returns a new valid accessToken', async () => {
    const { user, rawPassword } = await seedUser('ADMIN', { email: 'admin-refresh@payroll.test' });

    // Step 1: Login to acquire valid refresh token
    const loginRes = await client.post('/api/v1/auth/login', {
      email: user.email,
      password: rawPassword,
    });
    assert.equal(loginRes.status, 200);

    const setCookie = loginRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : String(setCookie);
    const refreshTokenMatch = cookieHeader.match(/refreshToken=([^;]+)/);
    assert.ok(refreshTokenMatch, 'Failed to extract refreshToken from set-cookie');
    const refreshTokenVal = refreshTokenMatch[1];

    // Step 2: Request token refresh with cookie
    const refreshRes = await client
      .withCookie(`refreshToken=${refreshTokenVal}`)
      .post('/api/v1/auth/refresh', {});

    assert.equal(refreshRes.status, 200, `Expected 200 OK, got ${refreshRes.status}: ${JSON.stringify(refreshRes.body)}`);
    assert.equal(refreshRes.body.success, true);
    assert.ok(refreshRes.body.data.accessToken, 'Expected new accessToken in refresh response');
    assert.equal(refreshRes.body.data.user.email, user.email);
  });

  it('T1.AUTH.3: Accessing /api/v1/auth/me with valid Bearer token returns authenticated user identity', async () => {
    const { user, token } = await seedUser('SUPER_ADMIN', {
      email: 'me-test@payroll.test',
      name: 'Authenticated Identity',
    });

    const res = await client.withBearer(token).get('/api/v1/auth/me');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, user.id);
    assert.equal(res.body.data.email, user.email);
    assert.equal(res.body.data.name, 'Authenticated Identity');
    assert.equal(res.body.data.role, 'SUPER_ADMIN');
    assert.equal(res.body.data.password, undefined, 'Password hash must never be returned');
  });

  it('T1.AUTH.4: User can successfully change their password via /api/v1/auth/change-password', async () => {
    const { user, token } = await seedUser('ADMIN', {
      email: 'changepass@payroll.test',
      password: DEFAULT_PASSWORD,
    });

    const newPassword = 'NewSecretPassword@456';
    const res = await client.withBearer(token).post('/api/v1/auth/change-password', {
      currentPassword: DEFAULT_PASSWORD,
      newPassword,
    });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);

    // Verify login with new password succeeds
    const loginRes = await client.post('/api/v1/auth/login', {
      email: user.email,
      password: newPassword,
    });
    assert.equal(loginRes.status, 200, 'Login with new password should succeed');
    assert.ok(loginRes.body.data.accessToken);

    // Verify login with old password fails
    const oldLoginRes = await client.post('/api/v1/auth/login', {
      email: user.email,
      password: DEFAULT_PASSWORD,
    });
    assert.equal(oldLoginRes.status, 401, 'Login with old password should fail with 401');
  });

  it('T1.AUTH.5: Logout endpoint revokes the refresh token and clears the authentication cookie', async () => {
    const { user, rawPassword } = await seedUser('VIEWER', { email: 'logout-test@payroll.test' });

    // Step 1: Login
    const loginRes = await client.post('/api/v1/auth/login', {
      email: user.email,
      password: rawPassword,
    });
    assert.equal(loginRes.status, 200);
    const token = loginRes.body.data.accessToken;

    const setCookie = loginRes.headers['set-cookie'];
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : String(setCookie);
    const refreshTokenMatch = cookieHeader.match(/refreshToken=([^;]+)/);
    const refreshTokenVal = refreshTokenMatch[1];

    // Step 2: Logout with Bearer token & cookie
    const logoutRes = await client
      .withBearer(token)
      .withCookie(`refreshToken=${refreshTokenVal}`)
      .post('/api/v1/auth/logout', {});

    assert.equal(logoutRes.status, 200, `Expected 200 OK, got ${logoutRes.status}: ${JSON.stringify(logoutRes.body)}`);
    assert.equal(logoutRes.body.success, true);

    // Verify refresh cookie was cleared
    const logoutCookies = logoutRes.headers['set-cookie'];
    assert.ok(logoutCookies, 'Expected Set-Cookie header on logout');
    const logoutCookieStr = Array.isArray(logoutCookies) ? logoutCookies.join('; ') : String(logoutCookies);
    assert.ok(
      logoutCookieStr.includes('refreshToken=;') ||
        logoutCookieStr.includes('Expires=Thu, 01 Jan 1970') ||
        logoutCookieStr.includes('Max-Age=0'),
      'Expected cookie expiration / clearance on logout'
    );
  });
});
