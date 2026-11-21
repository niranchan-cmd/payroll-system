'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 3: RBAC & Privilege Escalation (Tier 2)', () => {
  let client;
  let viewerToken;
  let adminToken;
  let sampleOrg;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const viewer = await seedUser('VIEWER', { email: 'viewer-rbac@payroll.test' });
    viewerToken = viewer.token;

    const admin = await seedUser('ADMIN', { email: 'admin-rbac@payroll.test' });
    adminToken = admin.token;

    sampleOrg = await seedClient({ name: 'RBAC Test Org' });
  });

  it('T2.RBAC.1: VIEWER role attempting POST /api/v1/clients receives 403 Forbidden', async () => {
    const res = await client.withBearer(viewerToken).post('/api/v1/clients', {
      name: 'Unauthorized Org By Viewer',
      pan: 'ABCDE1234F',
    });

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('Access denied') || res.body.message.includes('Forbidden'));
  });

  it('T2.RBAC.2: VIEWER role attempting POST /api/v1/clients/:id/payroll/run receives 403 Forbidden', async () => {
    const res = await client
      .withBearer(viewerToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/run`, {
        month: 1,
        year: 2026,
      });

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
  });

  it('T2.RBAC.3: VIEWER role attempting GET /api/v1/reports/pay-register/export receives 403 Forbidden', async () => {
    const res = await client
      .withBearer(viewerToken)
      .get(`/api/v1/reports/pay-register/export?clientId=${sampleOrg.id}&month=1&year=2026`);

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
  });

  it('T2.RBAC.4: VIEWER role attempting GET /api/v1/admin/users receives 403 Forbidden', async () => {
    const res = await client
      .withBearer(viewerToken)
      .get('/api/v1/admin/users');

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
  });

  it('T2.RBAC.5: ADMIN role attempting to delete another SUPER_ADMIN receives 403 Forbidden', async () => {
    const superAdmin = await seedUser('SUPER_ADMIN', { email: 'target-super@payroll.test' });

    const res = await client
      .withBearer(adminToken)
      .delete(`/api/v1/admin/users/${superAdmin.user.id}`);

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.message.includes('Admins cannot delete Super Admins') || res.body.message.includes('Access denied')
    );
  });
});
