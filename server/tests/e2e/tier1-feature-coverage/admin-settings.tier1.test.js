'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 9: Admin Settings & Audit Logging (Tier 1)', () => {
  let client;
  let adminToken;
  let adminUser;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', {
      email: 'settings-admin@payroll.test',
      name: 'Settings Governance Admin',
    });
    adminToken = admin.token;
    adminUser = admin.user;
  });

  it('T1.ADM_SET.1: Admin can retrieve all statutory limits and system settings (/api/v1/admin/settings)', async () => {
    const res = await client
      .withBearer(adminToken)
      .get('/api/v1/admin/settings');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Expected array of settings');
    assert.ok(res.body.data.length >= 2, 'Expected standard statutory settings');

    const keys = res.body.data.map((s) => s.key);
    assert.ok(keys.includes('PF_WAGE_CEILING'), 'Expected PF_WAGE_CEILING setting');
    assert.ok(keys.includes('ESI_WAGE_CEILING'), 'Expected ESI_WAGE_CEILING setting');
  });

  it('T1.ADM_SET.2: Admin can update statutory PF wage ceiling setting with audit description', async () => {
    const updatePayload = {
      key: 'PF_WAGE_CEILING',
      value: '21000',
      description: 'Updated statutory PF ceiling per government gazette 2026',
    };

    const res = await client
      .withBearer(adminToken)
      .put('/api/v1/admin/settings', updatePayload);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.key, 'PF_WAGE_CEILING');
    assert.equal(res.body.data.value, '21000');
    assert.equal(res.body.data.description, updatePayload.description);
  });

  it('T1.ADM_SET.3: Admin audit logs endpoint (/api/v1/admin/audit-logs) returns paginated security and system events', async () => {
    // Generate an audit event by updating a setting
    await client
      .withBearer(adminToken)
      .put('/api/v1/admin/settings', {
        key: 'ESI_WAGE_CEILING',
        value: '25000',
        description: 'Audit trigger update',
      });

    const res = await client
      .withBearer(adminToken)
      .get('/api/v1/admin/audit-logs?page=1&limit=10');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Expected array of audit log entries');
    assert.ok(res.body.data.length >= 1, 'Expected at least 1 recorded audit log');
    assert.ok(res.body.pagination);
    assert.ok(res.body.pagination.total >= 1);
  });

  it('T1.ADM_SET.4: Audit logs record user ID, action type, target entity, and timestamp for administrative mutations', async () => {
    await client
      .withBearer(adminToken)
      .put('/api/v1/admin/settings', {
        key: 'TAX_ROUNDING_MODE',
        value: 'NEAREST_10',
        description: 'New tax rounding rule',
      });

    const res = await client
      .withBearer(adminToken)
      .get('/api/v1/admin/audit-logs');

    assert.equal(res.status, 200);
    const logs = res.body.data;
    const settingLog = logs.find((l) => l.action === 'SETTING_UPDATED');

    assert.ok(settingLog, 'Expected SETTING_UPDATED action in audit log');
    assert.equal(settingLog.user_id, adminUser.id, 'Expected user_id of mutating administrator');
    assert.equal(settingLog.entity_type, 'SETTING');
    assert.equal(settingLog.target_id, 'TAX_ROUNDING_MODE');
    assert.ok(settingLog.created_at, 'Expected created_at timestamp');
  });

  it('T1.ADM_SET.5: Admin payroll overview endpoint returns high-level company and payroll run metrics', async () => {
    // Seed sample organizations and employees
    const clientA = await seedClient({ name: 'Overview Corp A' });
    const structA = await seedCTCStructure(clientA.id);
    await seedEmployee(clientA.id, structA.id, { roll_no: 'OV-001' });

    const clientB = await seedClient({ name: 'Overview Corp B' });
    const structB = await seedCTCStructure(clientB.id);
    await seedEmployee(clientB.id, structB.id, { roll_no: 'OV-002' });

    // Execute run for Client A
    await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${clientA.id}/payroll/run`, {
        month: 1,
        year: 2026,
      });

    const res = await client
      .withBearer(adminToken)
      .get('/api/v1/admin/payroll/overview');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.total_clients >= 2, 'Expected at least 2 clients in metrics');
    assert.ok(res.body.data.active_employees >= 2, 'Expected at least 2 active employees in metrics');
    assert.ok(res.body.data.total_runs >= 1, 'Expected at least 1 payroll run in metrics');
    assert.equal(typeof res.body.data.draft_runs, 'number');
    assert.equal(typeof res.body.data.finalized_runs, 'number');
  });
});
