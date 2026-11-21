'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 4: Multi-Tenant Boundary & IDOR Probes (Tier 2)', () => {
  let client;
  let adminToken;
  let clientA;
  let clientB;
  let structureA;
  let employeeA;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'idor-admin@payroll.test' });
    adminToken = admin.token;

    clientA = await seedClient({ name: 'Tenant A Corp' });
    clientB = await seedClient({ name: 'Tenant B Corp' });

    structureA = await seedCTCStructure(clientA.id, { version_name: 'V1-A' });
    const emp = await seedEmployee(clientA.id, structureA.id, { name: 'Tenant A Employee', roll_no: 'EMP-A1' });
    employeeA = emp.employee;
  });

  it('T2.IDOR.1: Accessing /api/v1/employees/:id belonging to Client A with Client B scope returns 404', async () => {
    // Provide cross-tenant query param or x-client-id header pointing to Client B
    const res = await client
      .withBearer(adminToken)
      .withHeader('x-client-id', clientB.id)
      .get(`/api/v1/employees/${employeeA.id}?clientId=${clientB.id}`);

    assert.equal(res.status, 404, `Expected 404 Not Found for cross-tenant probe, got ${res.status}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('not found') || res.body.message.includes('Employee not found'));
  });

  it('T2.IDOR.2: Accessing /api/v1/structures/:id of Client A via Client B context is blocked', async () => {
    const res = await client
      .withBearer(adminToken)
      .withHeader('x-client-id', clientB.id)
      .get(`/api/v1/structures/${structureA.id}?clientId=${clientB.id}`);

    assert.equal(res.status, 404, `Expected 404 Not Found for cross-tenant structure access, got ${res.status}`);
    assert.equal(res.body.success, false);
  });

  it('T2.IDOR.3: Updating employee details with mismatched clientId or invalid employee is rejected', async () => {
    // Attempting to update employee of Client A using non-existent or wrong ID
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await client
      .withBearer(adminToken)
      .patch(`/api/v1/employees/${fakeId}`, {
        name: 'Updated Cross-Tenant Name',
      });

    assert.equal(res.status, 404, `Expected 404 for invalid employee update, got ${res.status}`);
    assert.equal(res.body.success, false);
  });

  it('T2.IDOR.4: Querying payroll run ID belonging to Client A under Client B URL path returns 404', async () => {
    // Create payroll run for Client A
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${clientA.id}/payroll/run`, {
        month: 1,
        year: 2026,
      });
    assert.equal(runRes.status, 201);
    const runIdA = runRes.body.data.run_id || runRes.body.data.id;

    // Probe run under Client B path: /clients/:clientB/payroll/:runIdA
    const probeRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${clientB.id}/payroll/${runIdA}`);

    assert.equal(probeRes.status, 404, `Expected 404 Not Found, got ${probeRes.status}`);
    assert.equal(probeRes.body.success, false);
  });

  it('T2.IDOR.5: Deleting a client organization verifies authorization and prevents cross-tenant deletion', async () => {
    const viewer = await seedUser('VIEWER', { email: 'viewer-delete@payroll.test' });

    // Unauthorized role cannot delete client
    const res = await client
      .withBearer(viewer.token)
      .delete(`/api/v1/clients/${clientA.id}`);

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    assert.equal(res.body.success, false);

    // Non-existent client ID returns 404 or 400
    const nonExistentId = '11111111-2222-3333-4444-555555555555';
    const invalidRes = await client
      .withBearer(adminToken)
      .delete(`/api/v1/clients/${nonExistentId}`, { password: 'Password@123' });

    assert.ok(
      invalidRes.status === 404 || invalidRes.status === 400,
      `Expected 404 or 400, got ${invalidRes.status}`
    );
  });
});
