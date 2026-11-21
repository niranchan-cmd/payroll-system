'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, resetDatabase, DEFAULT_PASSWORD } = require('../../helpers/testFixtures');

describe('Suite 8: Admin User Management (Tier 1)', () => {
  let client;
  let superAdmin;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    superAdmin = await seedUser('SUPER_ADMIN', {
      email: 'root-admin@payroll.test',
      name: 'Root Super Admin',
    });
  });

  it('T1.ADM_USR.1: SUPER_ADMIN can list all system users with pagination, role, and active status', async () => {
    await seedUser('ADMIN', { email: 'admin1@payroll.test', name: 'Admin One' });
    await seedUser('VIEWER', { email: 'viewer1@payroll.test', name: 'Viewer One' });

    const res = await client
      .withBearer(superAdmin.token)
      .get('/api/v1/admin/users?page=1&limit=10');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Expected array of users');
    assert.ok(res.body.data.length >= 3, 'Expected at least 3 seeded users');
    assert.ok(res.body.pagination, 'Expected pagination object');
    assert.ok(res.body.pagination.total >= 3);

    // Verify properties and security: password hash must never be exposed
    for (const u of res.body.data) {
      assert.ok(u.id);
      assert.ok(u.email);
      assert.ok(u.role);
      assert.equal(typeof u.is_active, 'boolean');
      assert.equal(u.password, undefined, 'Password must never be returned in user listing');
    }
  });

  it('T1.ADM_USR.2: SUPER_ADMIN can create a new user account with specified name, email, password, and role', async () => {
    const newUserPayload = {
      name: 'Finance Manager',
      email: 'finance.manager@acme.test',
      password: 'SecurePassword@2026',
      role: 'ADMIN',
    };

    const res = await client
      .withBearer(superAdmin.token)
      .post('/api/v1/admin/users', newUserPayload);

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id);
    assert.equal(res.body.data.email, newUserPayload.email);
    assert.equal(res.body.data.name, newUserPayload.name);
    assert.equal(res.body.data.role, 'ADMIN');
    assert.equal(res.body.data.is_active, true);
    assert.equal(res.body.data.password, undefined);

    // Verify new user can log in
    const loginRes = await client.post('/api/v1/auth/login', {
      email: newUserPayload.email,
      password: newUserPayload.password,
    });
    assert.equal(loginRes.status, 200, 'Newly created user should successfully log in');
  });

  it('T1.ADM_USR.3: SUPER_ADMIN can update an existing user role (e.g. promote VIEWER to ADMIN)', async () => {
    const { user } = await seedUser('VIEWER', { email: 'promoteme@payroll.test' });

    const res = await client
      .withBearer(superAdmin.token)
      .patch(`/api/v1/admin/users/${user.id}/role`, {
        role: 'ADMIN',
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, user.id);
    assert.equal(res.body.data.role, 'ADMIN', 'Expected role to be updated to ADMIN');
  });

  it('T1.ADM_USR.4: SUPER_ADMIN can deactivate and reactivate another user account', async () => {
    const { user } = await seedUser('ADMIN', { email: 'deactivateme@payroll.test' });

    // Step 1: Deactivate
    const deactRes = await client
      .withBearer(superAdmin.token)
      .patch(`/api/v1/admin/users/${user.id}/status`, {
        is_active: false,
      });

    assert.equal(deactRes.status, 200, `Expected 200 OK, got ${deactRes.status}`);
    assert.equal(deactRes.body.data.is_active, false);

    // Step 2: Reactivate
    const reactRes = await client
      .withBearer(superAdmin.token)
      .patch(`/api/v1/admin/users/${user.id}/status`, {
        is_active: true,
      });

    assert.equal(reactRes.status, 200);
    assert.equal(reactRes.body.data.is_active, true);
  });

  it('T1.ADM_USR.5: SUPER_ADMIN can delete an inactive user account', async () => {
    const { user } = await seedUser('VIEWER', { email: 'deleteme@payroll.test', is_active: false });

    const res = await client
      .withBearer(superAdmin.token)
      .delete(`/api/v1/admin/users/${user.id}`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);

    // Verify user no longer exists in database
    const userInDb = await global.prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(userInDb, null, 'Deleted user must no longer exist in DB');
  });
});
