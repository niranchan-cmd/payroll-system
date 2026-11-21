'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 10: Reports Pagination & Empty State Edges (Tier 2)', () => {
  let client;
  let adminToken;
  let sampleOrg;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'rep-edge-admin@payroll.test' });
    adminToken = admin.token;

    sampleOrg = await seedClient({ name: 'Reports Edge Org' });
    const struct = await seedCTCStructure(sampleOrg.id, { version_name: 'V1' });
    await seedEmployee(sampleOrg.id, struct.id, { name: 'Reporting Person', roll_no: 'REP-ED-01' });

    // Run and finalize a run for month 1, 2026
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/run`, {
        month: 1,
        year: 2026,
      });
    const runId = runRes.body.data.run_id || runRes.body.data.id;
    await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/payroll/${runId}/finalize`, {});
  });

  it('T2.REP_EDGE.1: Pay register query for date range with zero payroll runs returns empty data array with 200 OK', async () => {
    // Year 2020 has 0 payroll runs
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register?clientId=${sampleOrg.id}&month=5&year=2020`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.runs));
    assert.equal(res.body.data.runs.length, 0, 'Expected 0 runs found');
    assert.equal(res.body.data.grand_totals.total_employees, 0);
  });

  it('T2.REP_EDGE.2: Requesting page beyond available total (page=9999) returns empty data array and valid pagination', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register?clientId=${sampleOrg.id}&page=9999&limit=10`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.runs));
    assert.equal(res.body.data.runs.length, 0);
    assert.ok(res.body.data.pagination);
    assert.equal(res.body.data.pagination.page, 9999);
  });

  it('T2.REP_EDGE.3: Requesting negative page or invalid limit defaults gracefully to page=1, limit=10', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register?clientId=${sampleOrg.id}&page=-5&limit=-20`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.pagination);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.limit, 10);
  });

  it('T2.REP_EDGE.4: Exporting pay register with 0 matching records generates valid CSV with headers only', async () => {
    // Export for year 2021 with zero runs
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register/export?clientId=${sampleOrg.id}&month=6&year=2021`);

    assert.equal(res.status, 200);
    assert.ok(typeof res.body === 'string');
    assert.ok(res.body.includes('Month/Year'));
    assert.ok(res.body.includes('Gross Salary'));
    // Lines should only be header row
    const lines = res.body.trim().split('\n');
    assert.equal(lines.length, 1, 'Expected only header row in empty CSV export');
  });

  it('T2.REP_EDGE.5: Very large pagination limit (limit=10000) is capped to maximum allowable limit (100)', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/reports/pay-register?clientId=${sampleOrg.id}&page=1&limit=10000`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.pagination);
    assert.equal(res.body.data.pagination.limit, 100, 'Expected limit capped at 100');
  });
});
