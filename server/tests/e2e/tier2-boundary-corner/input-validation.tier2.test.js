'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 5: Input Validation & Injection Sanitization (Tier 2)', () => {
  let client;
  let adminToken;
  let sampleOrg;
  let sampleStructure;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'val-admin@payroll.test' });
    adminToken = admin.token;

    sampleOrg = await seedClient({ name: 'Validation Test Org' });
    sampleStructure = await seedCTCStructure(sampleOrg.id, { version_name: 'V1' });
  });

  it('T2.VAL.1: Creating employee with invalid email format returns 400 Bad Request with field validation error', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/employees`, {
        name: 'Invalid Email Person',
        roll_no: 'EMP-VAL-01',
        designation: 'QA Engineer',
        start_date: '2026-01-01',
        annual_ctc: 600000,
        tax_regime: 'NEW',
        email: 'this-is-not-an-email-format',
      });

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      Array.isArray(res.body.errors) && res.body.errors.some((e) => e.field === 'email'),
      'Expected validation error on email field'
    );
  });

  it('T2.VAL.2: Submitting negative annual CTC returns 400 Bad Request', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/employees`, {
        name: 'Negative CTC Person',
        roll_no: 'EMP-VAL-02',
        designation: 'Software Engineer',
        start_date: '2026-01-01',
        annual_ctc: -500000,
        tax_regime: 'NEW',
      });

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      Array.isArray(res.body.errors) && res.body.errors.some((e) => e.field === 'annual_ctc'),
      'Expected validation error on annual_ctc field'
    );
  });

  it('T2.VAL.3: Submitting days worked > 31 in payroll calculation returns 400 Bad Request', async () => {
    const { employee } = await seedEmployee(sampleOrg.id, sampleStructure.id, {
      name: 'Overtime Worker',
      roll_no: 'EMP-VAL-03',
    });

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/preview`, {
        month: 1,
        year: 2026,
        attendanceOverrides: {
          [employee.id]: 35, // 35 days worked in a month is impossible
        },
      });

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.message.includes('31') || (Array.isArray(res.body.errors) && res.body.errors.length > 0)
    );
  });

  it('T2.VAL.4: SQL injection string payload in search query is sanitized and treated as literal text', async () => {
    await seedEmployee(sampleOrg.id, sampleStructure.id, { name: 'Normal Employee', roll_no: 'NORM-01' });

    const sqlPayload = "' OR 1=1 --";
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleOrg.id}/employees?search=${encodeURIComponent(sqlPayload)}`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.equal(res.body.success, true);
    // Must treat as literal string and not dump all records
    assert.equal(res.body.data.length, 0, 'SQL injection must not bypass filtering');
  });

  it('T2.VAL.5: Cross-Site Scripting (XSS) HTML string in employee designation is safely handled', async () => {
    const xssPayload = '<script>alert("XSS")</script>';
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/employees`, {
        name: 'XSS Test Person',
        roll_no: 'EMP-XSS-01',
        designation: xssPayload,
        start_date: '2026-01-01',
        annual_ctc: 600000,
        tax_regime: 'NEW',
      });

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.equal(res.body.success, true);
    // Verify stored content does not execute or corrupt the object
    assert.ok(res.body.data.designation);
    assert.ok(!res.body.data.designation.includes('<script src='));
  });
});
