'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 7: Payroll Calendar & Proration Edges (Tier 2)', () => {
  let client;
  let adminToken;
  let sampleOrg;
  let sampleStructure;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'pay-edge-admin@payroll.test' });
    adminToken = admin.token;

    sampleOrg = await seedClient({
      name: 'Payroll Edge Org',
      proration_rule: 'CALENDAR',
    });
    sampleStructure = await seedCTCStructure(sampleOrg.id, {
      version_name: 'V1',
      effective_from: new Date('2020-01-01'),
    });
  });

  it('T2.PAY_EDGE.1: February payroll in leap year (2028) calculates divisor as 29 days under CALENDAR rule', async () => {
    const { employee } = await seedEmployee(sampleOrg.id, sampleStructure.id, {
      name: 'Leap Year Employee',
      roll_no: 'EMP-LEAP',
      start_date: new Date('2028-01-01'),
      salary_effective_from: new Date('2028-01-01'),
    });

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/preview`, {
        month: 2,
        year: 2028,
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    const entry = res.body.data.find((e) => e.employee_id === employee.id);
    assert.ok(entry, 'Expected employee in payroll preview');
    assert.equal(entry.total_days, 29, 'Expected 29 days divisor for Feb 2028 leap year');
  });

  it('T2.PAY_EDGE.2: February payroll in non-leap year (2026) calculates divisor as 28 days under CALENDAR rule', async () => {
    const { employee } = await seedEmployee(sampleOrg.id, sampleStructure.id, {
      name: 'Non-Leap Year Employee',
      roll_no: 'EMP-NONLEAP',
      start_date: new Date('2026-01-01'),
      salary_effective_from: new Date('2026-01-01'),
    });

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/preview`, {
        month: 2,
        year: 2026,
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    const entry = res.body.data.find((e) => e.employee_id === employee.id);
    assert.ok(entry);
    assert.equal(entry.total_days, 28, 'Expected 28 days divisor for Feb 2026 non-leap year');
  });

  it('T2.PAY_EDGE.3: Employee joining on last day of month receives exactly 1 day prorated pay', async () => {
    // 31 days in January; employee joins on Jan 31st
    const { employee } = await seedEmployee(sampleOrg.id, sampleStructure.id, {
      name: 'Last Day Joiner',
      roll_no: 'EMP-LASTDAY',
      start_date: new Date('2026-01-31'),
      salary_effective_from: new Date('2026-01-31'),
    });

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/preview`, {
        month: 1,
        year: 2026,
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    const entry = res.body.data.find((e) => e.employee_id === employee.id);
    assert.ok(entry);
    assert.equal(entry.days_worked, 1, 'Expected exactly 1 day worked');
    assert.equal(entry.is_prorated, true);
    assert.equal(entry.total_days, 31);
  });

  it('T2.PAY_EDGE.4: Employee with 0 days worked receives ₹0 gross pay and ₹0 statutory deductions', async () => {
    const { employee } = await seedEmployee(sampleOrg.id, sampleStructure.id, {
      name: 'Zero Days Worker',
      roll_no: 'EMP-ZERODAYS',
      start_date: new Date('2026-01-01'),
    });

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/preview`, {
        month: 1,
        year: 2026,
        attendanceOverrides: {
          [employee.id]: 0,
        },
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    const entry = res.body.data.find((e) => e.employee_id === employee.id);
    assert.ok(entry);
    assert.equal(entry.days_worked, 0);
    assert.equal(entry.gross_salary, 0);
    assert.equal(entry.employee_pf, 0);
    assert.equal(entry.employee_esi, 0);
    assert.equal(entry.net_pay, 0);
  });

  it('T2.PAY_EDGE.5: Attempting to delete or mutate a FINALIZED payroll run returns 400 Bad Request', async () => {
    await seedEmployee(sampleOrg.id, sampleStructure.id, {
      name: 'Sample Finalize Worker',
      roll_no: 'EMP-FIN',
      start_date: new Date('2026-01-01'),
    });

    // Run payroll
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/run`, {
        month: 1,
        year: 2026,
      });
    assert.equal(runRes.status, 201);
    const runId = runRes.body.data.run_id || runRes.body.data.id;

    // Finalize payroll
    const finRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/${runId}/finalize`, {});
    assert.equal(finRes.status, 200);

    // Attempt delete on finalized run
    const delRes = await client
      .withBearer(adminToken)
      .delete(`/api/v1/clients/${sampleOrg.id}/payroll/${runId}`);

    assert.equal(delRes.status, 400, `Expected 400 Bad Request, got ${delRes.status}: ${JSON.stringify(delRes.body)}`);
    assert.equal(delRes.body.success, false);
    assert.ok(delRes.body.message.includes('Cannot delete a finalized payroll run'));
  });
});
