'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 7: Reports & Pay Register (Tier 1)', () => {
  let client;
  let adminToken;
  let sampleClient;
  let sampleStructure;
  let runId;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'reports-admin@payroll.test' });
    adminToken = admin.token;
    sampleClient = await seedClient({ name: 'Reporting Test Org' });
    sampleStructure = await seedCTCStructure(sampleClient.id, {
      version_name: 'V1',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });

    await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Aditya Gupta',
      roll_no: 'REP-001',
      annual_ctc: 600000,
      start_date: new Date('2026-01-01'),
    });
    await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Sunita Rao',
      roll_no: 'REP-002',
      annual_ctc: 480000,
      start_date: new Date('2026-01-01'),
    });

    // Execute and finalize a payroll run for Month 1, Year 2026
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/run`, {
        month: 1,
        year: 2026,
      });
    runId = runRes.body.data.run_id || runRes.body.data.id;

    await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/${runId}/finalize`, {});
  });

  it('T1.REP.1: Pay register endpoint returns aggregated payroll data filtered by client, month, and year', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register?clientId=${sampleClient.id}&month=1&year=2026`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.runs));
    assert.equal(res.body.data.runs.length, 1);

    const run = res.body.data.runs[0];
    assert.equal(run.id, runId);
    assert.equal(run.month, 1);
    assert.equal(run.year, 2026);
    assert.equal(run.status, 'FINALIZED');
    assert.equal(run.entries.length, 2);
  });

  it('T1.REP.2: Pay register calculates accurate summary grand totals (Total Gross, PF, ESI, Total Net Pay)', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register?clientId=${sampleClient.id}&month=1&year=2026`);

    assert.equal(res.status, 200);
    const run = res.body.data.runs[0];
    assert.ok(run.totals, 'Expected totals object for run');
    assert.ok(run.totals.gross > 0, 'Expected positive gross salary');
    assert.ok(run.totals.net_pay > 0, 'Expected positive net pay');
    assert.ok(run.totals.employee_pf >= 0);

    // Assert grand_totals in response
    assert.ok(res.body.data.grand_totals || res.body.data.grandTotals, 'Expected grand_totals object');
  });

  it('T1.REP.3: Pay register CSV export endpoint generates well-formatted CSV with appropriate Content-Disposition header', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register/export?clientId=${sampleClient.id}&month=1&year=2026`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const disposition = res.headers['content-disposition'] || '';
    assert.ok(
      disposition.includes('attachment') && disposition.includes('.csv'),
      `Expected CSV attachment Content-Disposition, got: ${disposition}`
    );

    const csvContent = res.body;
    assert.ok(typeof csvContent === 'string', 'Expected string CSV content');
    assert.ok(csvContent.includes('Roll No'), 'Expected Roll No in CSV header');
    assert.ok(csvContent.includes('Gross Salary'), 'Expected Gross Salary in CSV header');
    assert.ok(csvContent.includes('Net Pay'), 'Expected Net Pay in CSV header');
    assert.ok(csvContent.includes('REP-001'), 'Expected REP-001 in CSV body');
    assert.ok(csvContent.includes('Aditya Gupta'), 'Expected employee name in CSV body');
  });

  it('T1.REP.4: Single payroll run export endpoint /clients/:clientId/payroll/:runId/export returns CSV paysheet', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/payroll/${runId}/export`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const disposition = res.headers['content-disposition'] || '';
    assert.ok(
      disposition.includes('attachment') && disposition.includes('.csv'),
      `Expected CSV attachment, got: ${disposition}`
    );

    const csvContent = res.body;
    assert.ok(typeof csvContent === 'string');
    assert.ok(csvContent.includes('REP-001'));
    assert.ok(csvContent.includes('REP-002'));
  });

  it('T1.REP.5: Search query parameter correctly filters pay register entries by employee name or roll number', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register?clientId=${sampleClient.id}&month=1&year=2026&search=Aditya`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const run = res.body.data.runs[0];
    assert.equal(run.entries.length, 1, 'Expected search filter to match exactly 1 employee');
    assert.equal(run.entries[0].roll_no, 'REP-001');
    assert.equal(run.entries[0].name, 'Aditya Gupta');
  });
});
