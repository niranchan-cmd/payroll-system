'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 6: Payroll Calculation & Finalization (Tier 1)', () => {
  let client;
  let adminToken;
  let sampleClient;
  let sampleStructure;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'payroll-admin@payroll.test' });
    adminToken = admin.token;
    sampleClient = await seedClient({
      name: 'Payroll Engine Client',
      proration_rule: 'CALENDAR',
      pf_on_actual: false,
      esi_auto_apply: true,
    });
    sampleStructure = await seedCTCStructure(sampleClient.id, {
      version_name: 'V1',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });

    // Seed two active employees with known CTCs
    await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Employee One',
      roll_no: 'PAY-001',
      annual_ctc: 600000, // Monthly Basic: 20,000; Monthly Gross: 47,600
      start_date: new Date('2026-01-01'),
    });
    await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Employee Two',
      roll_no: 'PAY-002',
      annual_ctc: 240000, // Monthly Basic: 8,000; Monthly Gross: 19,040 (<= 21,000 => ESI applies)
      start_date: new Date('2026-01-01'),
    });
  });

  it('T1.PAY.1: Payroll preview endpoint /preview calculates gross, PF, ESI, and net pay without persisting', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/preview`, {
        month: 1,
        year: 2026,
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.month, 1);
    assert.equal(res.body.data.year, 2026);
    assert.equal(res.body.data.total_employees, 2);
    assert.ok(Array.isArray(res.body.data.entries));
    assert.equal(res.body.data.entries.length, 2);

    // Assert summary grand totals
    assert.ok(res.body.data.totals, 'Expected totals object in preview');
    assert.ok(res.body.data.totals.total_gross > 0);
    assert.ok(res.body.data.totals.total_net_pay > 0);

    // Verify nothing was persisted into payrollRun table
    const runsInDb = await global.prisma.payrollRun.findMany({ where: { client_id: sampleClient.id } });
    assert.equal(runsInDb.length, 0, 'Preview must not persist payroll run records');
  });

  it('T1.PAY.2: Run payroll endpoint /run creates a new DRAFT payroll run with all calculated employee entries', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/run`, {
        month: 1,
        year: 2026,
        notes: 'January 2026 Regular Payroll Run',
      });

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    const runId = res.body.data.run_id || res.body.data.id;
    assert.ok(runId, 'Expected payroll run ID');
    assert.equal(res.body.data.month, 1);
    assert.equal(res.body.data.year, 2026);

    // Verify entries persisted in database
    const entriesInDb = await global.prisma.payrollEntry.findMany({
      where: { payroll_run_id: runId },
    });
    assert.equal(entriesInDb.length, 2, 'Expected 2 payroll entry records saved in DB');
  });

  it('T1.PAY.3: Run detail endpoint returns complete monetary breakdown for all employees in the run', async () => {
    // Execute run first
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/run`, {
        month: 2,
        year: 2026,
      });
    assert.equal(runRes.status, 201);
    const runId = runRes.body.data.run_id || runRes.body.data.id;

    // Fetch details
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/payroll/${runId}`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, runId);
    assert.ok(Array.isArray(res.body.data.entries), 'Expected entries array in detail response');
    assert.equal(res.body.data.entries.length, 2);

    const firstEntry = res.body.data.entries[0];
    assert.ok(firstEntry.gross_salary !== undefined);
    assert.ok(firstEntry.basic_salary !== undefined);
    assert.ok(firstEntry.employee_pf !== undefined);
    assert.ok(firstEntry.net_pay !== undefined);
    assert.ok(firstEntry.employee, 'Expected nested employee object');
  });

  it('T1.PAY.4: Finalize payroll endpoint /finalize transitions status from DRAFT to FINALIZED and locks the run', async () => {
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/run`, {
        month: 3,
        year: 2026,
      });
    assert.equal(runRes.status, 201);
    const runId = runRes.body.data.run_id || runRes.body.data.id;

    const finalizeRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/${runId}/finalize`, {});

    assert.equal(finalizeRes.status, 200, `Expected 200 OK, got ${finalizeRes.status}: ${JSON.stringify(finalizeRes.body)}`);
    assert.equal(finalizeRes.body.success, true);
    assert.equal(finalizeRes.body.data.status, 'FINALIZED');
    assert.ok(finalizeRes.body.data.finalized_at);

    // Attempting to finalize again must return conflict
    const reFinalizeRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/${runId}/finalize`, {});
    assert.equal(reFinalizeRes.status, 409, 'Re-finalizing locked run should return 409 Conflict');
  });

  it('T1.PAY.5: DRAFT payroll run can be successfully deleted before finalization', async () => {
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/run`, {
        month: 4,
        year: 2026,
      });
    assert.equal(runRes.status, 201);
    const runId = runRes.body.data.run_id || runRes.body.data.id;

    const deleteRes = await client
      .withBearer(adminToken)
      .delete(`/api/v1/clients/${sampleClient.id}/payroll/${runId}`);

    assert.equal(deleteRes.status, 200, `Expected 200 OK, got ${deleteRes.status}: ${JSON.stringify(deleteRes.body)}`);
    assert.equal(deleteRes.body.success, true);

    // Verify run no longer exists
    const checkRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/payroll/${runId}`);
    assert.equal(checkRes.status, 404, 'Deleted payroll run should return 404 Not Found');
  });
});
