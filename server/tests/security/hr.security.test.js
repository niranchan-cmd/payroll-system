'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { app, mockPrisma } = require('../setup');
const { createTestClient } = require('../helpers/testClient');
const { signAccessToken } = require('../../src/utils/jwt.utils');

describe('Security Hardening — HR Command Center Security & Tenant Isolation', () => {
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

  const tenantClientId = crypto.randomUUID();
  const otherClientId = crypto.randomUUID();
  const testEmployeeId = crypto.randomUUID();

  beforeEach(async () => {
    mockPrisma.reset();
    await mockPrisma.user.create({ data: viewerUser });
    await mockPrisma.user.create({ data: adminUser });
    await mockPrisma.user.create({ data: superAdminUser });

    // Seed primary tenant client
    await mockPrisma.client.create({
      data: {
        id: tenantClientId,
        name: 'Apex Global Technologies',
        is_active: true,
      },
    });

    // Seed secondary tenant client
    await mockPrisma.client.create({
      data: {
        id: otherClientId,
        name: 'Unrelated Foreign Corp',
        is_active: true,
      },
    });

    // Seed employee belonging ONLY to primary tenant
    await mockPrisma.employee.create({
      data: {
        id: testEmployeeId,
        client_id: tenantClientId,
        roll_no: 'EMP-1001',
        name: 'Rahul Sharma',
        designation: 'Senior Software Engineer',
        department: 'Engineering',
        email: 'rahul@apextech.com',
        start_date: new Date('2024-01-15'),
        tax_regime: 'NEW',
        status: 'ACTIVE',
      },
    });
  });

  describe('1. Authentication Gatekeeping (No Token / Expired Token)', () => {
    it('blocks unauthenticated GET /api/v1/clients/:clientId/hr/overview with 401', async () => {
      const res = await client.get(`/api/v1/clients/${tenantClientId}/hr/overview`);
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });

    it('blocks unauthenticated POST /api/v1/clients/:clientId/hr/leaves/requests with 401', async () => {
      const res = await client.post(`/api/v1/clients/${tenantClientId}/hr/leaves/requests`, {
        employee_id: testEmployeeId,
        leave_type: 'CASUAL',
        start_date: '2026-11-24',
        end_date: '2026-11-25',
        total_days: 2,
        reason: 'Wedding',
      });
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.success, false);
    });
  });

  describe('2. Role-Based Access Control (RBAC)', () => {
    it('blocks VIEWER role from creating leave requests with 403 Forbidden', async () => {
      const res = await client.withBearer(viewerToken).post(
        `/api/v1/clients/${tenantClientId}/hr/leaves/requests`,
        {
          employee_id: testEmployeeId,
          leave_type: 'CASUAL',
          start_date: '2026-11-24',
          end_date: '2026-11-25',
          total_days: 2,
          reason: 'Unauthorized test',
        }
      );
      assert.strictEqual(res.status, 403);
      assert.strictEqual(res.body.success, false);
    });

    it('blocks VIEWER role from publishing company policies with 403 Forbidden', async () => {
      const res = await client.withBearer(viewerToken).post(
        `/api/v1/clients/${tenantClientId}/hr/policies`,
        { title: 'Rogue Policy', category: 'GENERAL', summary: 'Hack' }
      );
      assert.strictEqual(res.status, 403);
    });

    it('blocks VIEWER role from issuing HR letters with 403 Forbidden', async () => {
      const res = await client.withBearer(viewerToken).post(
        `/api/v1/clients/${tenantClientId}/hr/letters`,
        { employee_id: testEmployeeId, letter_type: 'RELIEVING' }
      );
      assert.strictEqual(res.status, 403);
    });

    it('allows ADMIN and SUPER_ADMIN to view and create HR records', async () => {
      const overviewRes = await client.withBearer(adminToken).get(
        `/api/v1/clients/${tenantClientId}/hr/overview`
      );
      assert.strictEqual(overviewRes.status, 200);
      assert.strictEqual(overviewRes.body.success, true);
    });
  });

  describe('3. Tenant Isolation & IDOR Protection', () => {
    it('rejects malformed non-UUID client ID with 400 Bad Request', async () => {
      const res = await client.withBearer(superAdminToken).get(
        `/api/v1/clients/not-a-uuid/hr/overview`
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('rejects non-existent client ID with 404 Client Not Found', async () => {
      const randomUuid = crypto.randomUUID();
      const res = await client.withBearer(superAdminToken).get(
        `/api/v1/clients/${randomUuid}/hr/overview`
      );
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.success, false);
    });

    it('prevents cross-tenant entity manipulation (cannot add leave for employee of another client)', async () => {
      const res = await client.withBearer(superAdminToken).post(
        `/api/v1/clients/${otherClientId}/hr/leaves/requests`,
        {
          employee_id: testEmployeeId,
          leave_type: 'CASUAL',
          start_date: '2026-11-24',
          end_date: '2026-11-25',
          total_days: 2,
          reason: 'Cross tenant attack',
        }
      );
      assert.strictEqual(res.status, 404);
      assert.match(res.body.message, /not found in this client entity/i);
    });
  });

  describe('4. Input Validation & Strict Type Constraints', () => {
    it('rejects leave request with invalid leave_type', async () => {
      const res = await client.withBearer(adminToken).post(
        `/api/v1/clients/${tenantClientId}/hr/leaves/requests`,
        {
          employee_id: testEmployeeId,
          leave_type: 'VACATION_INVALID',
          start_date: '2026-11-24',
          end_date: '2026-11-25',
          total_days: 2,
        }
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('rejects leave request with zero or negative total_days', async () => {
      const res = await client.withBearer(adminToken).post(
        `/api/v1/clients/${tenantClientId}/hr/leaves/requests`,
        {
          employee_id: testEmployeeId,
          leave_type: 'CASUAL',
          start_date: '2026-11-24',
          end_date: '2026-11-25',
          total_days: -5,
        }
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });

    it('rejects policy creation with empty title', async () => {
      const res = await client.withBearer(adminToken).post(
        `/api/v1/clients/${tenantClientId}/hr/policies`,
        { title: '', category: 'GENERAL' }
      );
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.success, false);
    });
  });
});
