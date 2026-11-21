'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 9: Admin Safety Guard Invariant Boundaries (Tier 2)', () => {
  let client;
  let superAdminUser;
  let superAdminToken;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const sa = await seedUser('SUPER_ADMIN', { email: 'chief-admin@payroll.test' });
    superAdminUser = sa.user;
    superAdminToken = sa.token;
  });

  it('T2.ADM_GD.1: Super Admin attempting to deactivate their own account receives 400 Cannot deactivate own account', async () => {
    const res = await client
      .withBearer(superAdminToken)
      .patch(`/api/v1/admin/users/${superAdminUser.id}/status`, {
        is_active: false,
      });

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Cannot deactivate own account'));
  });

  it('T2.ADM_GD.2: Super Admin attempting to delete their own account receives 400 Cannot delete own account', async () => {
    const res = await client
      .withBearer(superAdminToken)
      .delete(`/api/v1/admin/users/${superAdminUser.id}`);

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Cannot delete own account'));
  });

  it('T2.ADM_GD.3: Attempting to delete the sole remaining SUPER_ADMIN user is blocked with 400 error', async () => {
    // Create a secondary admin who will attempt to delete the sole super admin
    const secondAdmin = await seedUser('ADMIN', { email: 'secondary-admin@payroll.test' });

    const res = await client
      .withBearer(secondAdmin.token)
      .delete(`/api/v1/admin/users/${superAdminUser.id}`);

    // Blocked by Admin -> SuperAdmin check (403) or sole super admin guard (400)
    assert.ok(
      res.status === 400 || res.status === 403,
      `Expected 400 or 403, got ${res.status}: ${JSON.stringify(res.body)}`
    );
    assert.equal(res.body.success, false);
  });

  it('T2.ADM_GD.4: Attempting to assign an undefined or invalid role string returns 400 Bad Request', async () => {
    const targetUser = await seedUser('VIEWER', { email: 'viewer-promote@payroll.test' });

    const res = await client
      .withBearer(superAdminToken)
      .patch(`/api/v1/admin/users/${targetUser.user.id}/role`, {
        role: 'ROOT_GOD_MODE', // Invalid role
      });

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid role'));
  });

  it('T2.ADM_GD.5: Updating system settings with invalid data type or blank key returns 400 Bad Request', async () => {
    const blankKeyRes = await client
      .withBearer(superAdminToken)
      .put('/api/v1/admin/settings', {
        key: '   ', // blank key
        value: '1000',
      });

    assert.equal(blankKeyRes.status, 400, `Expected 400 for blank key, got ${blankKeyRes.status}`);
    assert.equal(blankKeyRes.body.success, false);

    const nullValueRes = await client
      .withBearer(superAdminToken)
      .put('/api/v1/admin/settings', {
        key: 'SOME_VALID_KEY',
        value: null,
      });

    assert.equal(nullValueRes.status, 400, `Expected 400 for null value, got ${nullValueRes.status}`);
    assert.equal(nullValueRes.body.success, false);
  });
});
