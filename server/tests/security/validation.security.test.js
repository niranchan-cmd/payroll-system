'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { app, mockPrisma } = require('../setup');
const { createTestClient } = require('../helpers/testClient');
const { signAccessToken } = require('../../src/utils/jwt.utils');

describe('Security Hardening — Feature 5: Input Validation & Sanitization', () => {
  const client = createTestClient(app);

  const adminUser = {
    id: crypto.randomUUID(),
    email: 'admin-validation@payroll.com',
    name: 'Admin User',
    role: 'ADMIN',
    is_active: true,
  };

  const adminToken = signAccessToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });
  const clientId = crypto.randomUUID();

  beforeEach(async () => {
    mockPrisma.reset();
    await mockPrisma.user.create({ data: adminUser });
    await mockPrisma.client.create({
      data: {
        id: clientId,
        name: 'Validation Test Client',
        is_active: true,
      },
    });
  });

  describe('Standardized 400 Error Format Verification', () => {
    it('returns standardized payload with success: false, message: "Validation failed", and errors array', async () => {
      const res = await client.post('/api/v1/auth/login', {
        email: 'invalid-email-address',
        password: '',
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      assert.equal(res.body.message, 'Validation failed');
      assert.ok(Array.isArray(res.body.errors));
      assert.ok(res.body.errors.length >= 2);

      // Verify shape of each error item
      for (const err of res.body.errors) {
        assert.ok(typeof err.field === 'string');
        assert.ok(typeof err.message === 'string');
      }

      const emailErr = res.body.errors.find((e) => e.field === 'email');
      const passwordErr = res.body.errors.find((e) => e.field === 'password');
      assert.ok(emailErr);
      assert.ok(passwordErr);
    });
  });

  describe('Auth Validation Schemas', () => {
    it('rejects password change if newPassword is less than 6 characters', async () => {
      const res = await client.withBearer(adminToken).post('/api/v1/auth/change-password', {
        currentPassword: 'OldPassword123!',
        newPassword: 'short',
      });

      assert.equal(res.status, 400);
      assert.equal(res.body.success, false);
      const newPassErr = res.body.errors.find((e) => e.field === 'newPassword');
      assert.ok(newPassErr);
      assert.match(newPassErr.message, /at least 6 characters/i);
    });
  });

  describe('Client Validation Schemas', () => {
    it('rejects client creation when name is empty', async () => {
      const res = await client.withBearer(adminToken).post('/api/v1/clients', {
        name: '   ',
        pan: 'ABCDE1234F',
      });

      assert.equal(res.status, 400);
      const nameErr = res.body.errors.find((e) => e.field === 'name');
      assert.ok(nameErr);
    });

    it('rejects invalid PAN format (must match ^[A-Z]{5}[0-9]{4}[A-Z]{1}$)', async () => {
      const invalidPans = ['BADPAN123', 'ABCDE12345', '12345ABCDE', 'TOOLONGPAN12345', '1234567890'];

      for (const badPan of invalidPans) {
        const res = await client.withBearer(adminToken).post('/api/v1/clients', {
          name: 'Acme Test',
          pan: badPan,
        });

        assert.equal(res.status, 400);
        const panErr = res.body.errors.find((e) => e.field === 'pan');
        assert.ok(panErr, `Expected validation error for bad PAN: ${badPan}`);
        assert.match(panErr.message, /PAN must be in valid/i);
      }
    });

    it('accepts valid PAN format (e.g. ABCDE1234F)', async () => {
      const res = await client.withBearer(adminToken).post('/api/v1/clients', {
        name: 'Valid Corp',
        pan: 'ABCDE1234F',
      });

      assert.equal(res.status, 201);
      assert.equal(res.body.success, true);
    });

    it('rejects client update when payroll_cutoff is out of range 1-31', async () => {
      const res = await client.withBearer(adminToken).patch(`/api/v1/clients/${clientId}`, {
        payroll_cutoff: 35,
      });

      assert.equal(res.status, 400);
      const cutoffErr = res.body.errors.find((e) => e.field === 'payroll_cutoff');
      assert.ok(cutoffErr);
      assert.match(cutoffErr.message, /between 1 and 31/i);
    });

    it('rejects malformed non-UUID route parameters on client routes', async () => {
      const res = await client.withBearer(adminToken).get('/api/v1/clients/not-a-valid-uuid');
      assert.equal(res.status, 400);
      const idErr = res.body.errors.find((e) => e.field === 'id');
      assert.ok(idErr);
      assert.match(idErr.message, /must be UUID/i);
    });
  });

  describe('Employee Validation Schemas', () => {
    it('rejects negative or zero annual_ctc', async () => {
      const res = await client.withBearer(adminToken).post(`/api/v1/clients/${clientId}/employees`, {
        name: 'John Doe',
        roll_no: 'EMP001',
        designation: 'Developer',
        start_date: '2026-01-01',
        annual_ctc: -50000,
        tax_regime: 'NEW',
      });

      assert.equal(res.status, 400);
      const ctcErr = res.body.errors.find((e) => e.field === 'annual_ctc');
      assert.ok(ctcErr);
      assert.match(ctcErr.message, /positive number greater than 0/i);
    });

    it('rejects invalid tax_regime (must be OLD or NEW)', async () => {
      const res = await client.withBearer(adminToken).post(`/api/v1/clients/${clientId}/employees`, {
        name: 'John Doe',
        roll_no: 'EMP001',
        designation: 'Developer',
        start_date: '2026-01-01',
        annual_ctc: 600000,
        tax_regime: 'CUSTOM_REGIME',
      });

      assert.equal(res.status, 400);
      const regimeErr = res.body.errors.find((e) => e.field === 'tax_regime');
      assert.ok(regimeErr);
    });

    it('rejects malformed start_date (must be ISO8601)', async () => {
      const res = await client.withBearer(adminToken).post(`/api/v1/clients/${clientId}/employees`, {
        name: 'John Doe',
        roll_no: 'EMP001',
        designation: 'Developer',
        start_date: 'not-a-date',
        annual_ctc: 600000,
        tax_regime: 'NEW',
      });

      assert.equal(res.status, 400);
      const dateErr = res.body.errors.find((e) => e.field === 'start_date');
      assert.ok(dateErr);
    });
  });

  describe('Structure Validation Schemas', () => {
    it('rejects empty components array', async () => {
      const res = await client.withBearer(adminToken).post(`/api/v1/clients/${clientId}/structures`, {
        version_name: 'V1',
        effective_from: '2026-01-01',
        remainder_comp: 'Special Allowance',
        components: [],
      });

      assert.equal(res.status, 400);
      const compErr = res.body.errors.find((e) => e.field === 'components');
      assert.ok(compErr);
    });

    it('rejects invalid rounding_rule', async () => {
      const res = await client.withBearer(adminToken).post(`/api/v1/clients/${clientId}/structures`, {
        version_name: 'V1',
        effective_from: '2026-01-01',
        remainder_comp: 'Special Allowance',
        rounding_rule: 'INVALID_ROUNDING',
        components: [{ name: 'Basic', calc_type: 'PERCENT_OF_CTC', ctc_inclusion: 'INCLUDED' }],
      });

      assert.equal(res.status, 400);
      const ruleErr = res.body.errors.find((e) => e.field === 'rounding_rule');
      assert.ok(ruleErr);
    });
  });

  describe('Payroll Validation Schemas', () => {
    it('rejects month < 1 or > 12', async () => {
      const res = await client.withBearer(adminToken).post(`/api/v1/clients/${clientId}/payroll/preview`, {
        month: 13,
        year: 2026,
      });

      assert.equal(res.status, 400);
      const monthErr = res.body.errors.find((e) => e.field === 'month');
      assert.ok(monthErr);
      assert.match(monthErr.message, /between 1 and 12/i);
    });

    it('rejects year < 2020 or > 2100', async () => {
      const res = await client.withBearer(adminToken).post(`/api/v1/clients/${clientId}/payroll/preview`, {
        month: 5,
        year: 1999,
      });

      assert.equal(res.status, 400);
      const yearErr = res.body.errors.find((e) => e.field === 'year');
      assert.ok(yearErr);
      assert.match(yearErr.message, /between 2020 and 2100/i);
    });
  });
});
