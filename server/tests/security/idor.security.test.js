'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { app, mockPrisma } = require('../setup');
const { createTestClient } = require('../helpers/testClient');
const { signAccessToken } = require('../../src/utils/jwt.utils');

describe('Security Hardening — Feature 4: IDOR Protection & VIEWER Salary Redaction', () => {
  const client = createTestClient(app);

  const viewerUser = {
    id: crypto.randomUUID(),
    email: 'viewer-idor@payroll.com',
    name: 'Viewer User',
    role: 'VIEWER',
    is_active: true,
  };

  const adminUser = {
    id: crypto.randomUUID(),
    email: 'admin-idor@payroll.com',
    name: 'Admin User',
    role: 'ADMIN',
    is_active: true,
  };

  const viewerToken = signAccessToken({ id: viewerUser.id, email: viewerUser.email, role: viewerUser.role });
  const adminToken = signAccessToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });

  const clientAId = crypto.randomUUID();
  const clientBId = crypto.randomUUID();
  const employeeAId = crypto.randomUUID();
  const structureAId = crypto.randomUUID();

  beforeEach(async () => {
    mockPrisma.reset();
    await mockPrisma.user.create({ data: viewerUser });
    await mockPrisma.user.create({ data: adminUser });

    // Client A (Active)
    await mockPrisma.client.create({
      data: {
        id: clientAId,
        name: 'Client Alpha Corp',
        is_active: true,
      },
    });

    // Client B (Active)
    await mockPrisma.client.create({
      data: {
        id: clientBId,
        name: 'Client Beta Corp',
        is_active: true,
      },
    });

    // Structure A for Client A
    await mockPrisma.cTCStructure.create({
      data: {
        id: structureAId,
        client_id: clientAId,
        version_name: 'V1',
        effective_from: new Date('2026-01-01'),
        status: 'ACTIVE',
        rounding_rule: 'NEAREST_RUPEE',
        remainder_comp: 'Special Allowance',
      },
    });

    // Components for Structure A
    await mockPrisma.cTCComponent.create({
      data: {
        structure_id: structureAId,
        name: 'Basic',
        calc_type: 'PERCENT_OF_CTC',
        value: 50.0,
        basis: 'ANNUAL_CTC',
        ctc_inclusion: 'INCLUDED',
        is_taxable: true,
        display_order: 1,
      },
    });

    // Employee A for Client A
    await mockPrisma.employee.create({
      data: {
        id: employeeAId,
        client_id: clientAId,
        name: 'John Alpha Doe',
        roll_no: 'ALPHA-001',
        designation: 'Staff Engineer',
        start_date: new Date('2026-01-01'),
        tax_regime: 'NEW',
        status: 'ACTIVE',
      },
    });

    // Salary history for Employee A
    await mockPrisma.employeeSalaryHistory.create({
      data: {
        id: crypto.randomUUID(),
        employee_id: employeeAId,
        annual_ctc: 1200000,
        structure_version_id: structureAId,
        effective_from: new Date('2026-01-01'),
        effective_to: null,
        change_reason: 'INITIAL_JOINING',
        created_by: adminUser.id,
      },
    });
  });

  describe('Flat Route: GET /api/v1/employees/:id', () => {
    it('redacts salary breakdown and salary history when called by low-privilege VIEWER', async () => {
      const res = await client
        .withBearer(viewerToken)
        .get(`/api/v1/employees/${employeeAId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.employee.id, employeeAId);
      assert.equal(res.body.data.employee.name, 'John Alpha Doe');

      // Salary details MUST be redacted for VIEWER
      assert.equal(res.body.data.salaryBreakdown, null);
      assert.deepEqual(res.body.data.employee.salary_histories, []);
    });

    it('returns full salary breakdown and salary history when called by ADMIN', async () => {
      const res = await client
        .withBearer(adminToken)
        .get(`/api/v1/employees/${employeeAId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.employee.id, employeeAId);

      // Admin receives complete salary history
      assert.ok(Array.isArray(res.body.data.employee.salary_histories));
      assert.ok(res.body.data.employee.salary_histories.length > 0);
    });

    it('returns 404 if clientId context parameter does not match the employee tenant client_id', async () => {
      // Employee A belongs to Client A; query with Client B id context
      const res = await client
        .withBearer(adminToken)
        .get(`/api/v1/employees/${employeeAId}?clientId=${clientBId}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Employee not found/i);
    });

    it('returns 404 if the employee belongs to a deactivated client organization', async () => {
      // Deactivate Client A
      await mockPrisma.client.update({
        where: { id: clientAId },
        data: { is_active: false },
      });

      const res = await client
        .withBearer(adminToken)
        .get(`/api/v1/employees/${employeeAId}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Employee not found/i);
    });
  });

  describe('Flat Route: GET /api/v1/structures/:id', () => {
    it('returns 200 for valid structure and active client', async () => {
      const res = await client
        .withBearer(adminToken)
        .get(`/api/v1/structures/${structureAId}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.equal(res.body.data.id, structureAId);
      assert.equal(res.body.data.client_id, clientAId);
    });

    it('returns 404 if clientId context parameter does not match the structure tenant client_id', async () => {
      // Structure A belongs to Client A; query with Client B id context
      const res = await client
        .withBearer(adminToken)
        .get(`/api/v1/structures/${structureAId}?clientId=${clientBId}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Structure not found/i);
    });

    it('returns 404 if the structure belongs to a deactivated client organization', async () => {
      // Deactivate Client A
      await mockPrisma.client.update({
        where: { id: clientAId },
        data: { is_active: false },
      });

      const res = await client
        .withBearer(adminToken)
        .get(`/api/v1/structures/${structureAId}`);

      assert.equal(res.status, 404);
      assert.equal(res.body.success, false);
      assert.match(res.body.message, /Structure not found/i);
    });
  });
});
