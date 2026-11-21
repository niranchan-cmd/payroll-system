'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { app, mockPrisma } = require('../setup');
const { createTestClient } = require('../helpers/testClient');
const { signAccessToken } = require('../../src/utils/jwt.utils');

describe('Security Hardening — Feature 3: Role Authorization on Reports & Exports', () => {
  const client = createTestClient(app);

  const viewerUser = {
    id: crypto.randomUUID(),
    email: 'viewer@payroll.com',
    name: 'Viewer User',
    role: 'VIEWER',
    is_active: true,
  };

  const adminUser = {
    id: crypto.randomUUID(),
    email: 'admin@payroll.com',
    name: 'Admin User',
    role: 'ADMIN',
    is_active: true,
  };

  const superAdminUser = {
    id: crypto.randomUUID(),
    email: 'superadmin@payroll.com',
    name: 'Super Admin User',
    role: 'SUPER_ADMIN',
    is_active: true,
  };

  const viewerToken = signAccessToken({ id: viewerUser.id, email: viewerUser.email, role: viewerUser.role });
  const adminToken = signAccessToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });
  const superAdminToken = signAccessToken({ id: superAdminUser.id, email: superAdminUser.email, role: superAdminUser.role });

  const clientId = crypto.randomUUID();
  const runId = crypto.randomUUID();

  beforeEach(async () => {
    mockPrisma.reset();
    await mockPrisma.user.create({ data: viewerUser });
    await mockPrisma.user.create({ data: adminUser });
    await mockPrisma.user.create({ data: superAdminUser });

    // Seed client & payroll run
    await mockPrisma.client.create({
      data: {
        id: clientId,
        name: 'Acme Test Corp',
        is_active: true,
      },
    });

    await mockPrisma.payrollRun.create({
      data: {
        id: runId,
        client_id: clientId,
        month: 3,
        year: 2026,
        status: 'DRAFT',
        run_by: adminUser.id,
      },
    });
  });

  describe('GET /api/v1/reports/pay-register', () => {
    it('blocks unauthenticated request with 401 Unauthorized', async () => {
      const res = await client.get('/api/v1/reports/pay-register');
      assert.equal(res.status, 401);
      assert.equal(res.body.success, false);
    });

    it('blocks VIEWER role with 403 Forbidden', async () => {
      const res = await client.withBearer(viewerToken).get('/api/v1/reports/pay-register');
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Forbidden|Access denied/i);
    });

    it('permits ADMIN role with 200 OK', async () => {
      const res = await client.withBearer(adminToken).get('/api/v1/reports/pay-register');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.runs);
      assert.ok(res.body.data.grand_totals);
    });

    it('permits SUPER_ADMIN role with 200 OK', async () => {
      const res = await client.withBearer(superAdminToken).get('/api/v1/reports/pay-register');
      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.runs);
    });
  });

  describe('GET /api/v1/reports/pay-register/export', () => {
    it('blocks VIEWER role with 403 Forbidden', async () => {
      const res = await client.withBearer(viewerToken).get('/api/v1/reports/pay-register/export');
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Forbidden|Access denied/i);
    });

    it('permits ADMIN role with 200 OK and returns text/csv', async () => {
      const res = await client.withBearer(adminToken).get('/api/v1/reports/pay-register/export');
      assert.equal(res.status, 200);
      const contentType = res.headers['content-type'];
      assert.ok(contentType.includes('text/csv'));
    });
  });

  describe('GET /api/v1/clients/:clientId/payroll/:runId/export', () => {
    it('blocks VIEWER role with 403 Forbidden', async () => {
      const res = await client
        .withBearer(viewerToken)
        .get(`/api/v1/clients/${clientId}/payroll/${runId}/export`);
      assert.equal(res.status, 403);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Forbidden|Access denied/i);
    });

    it('permits ADMIN role with 200 OK and returns text/csv', async () => {
      const res = await client
        .withBearer(adminToken)
        .get(`/api/v1/clients/${clientId}/payroll/${runId}/export`);
      assert.equal(res.status, 200);
      const contentType = res.headers['content-type'];
      assert.ok(contentType.includes('text/csv'));
    });
  });
});
