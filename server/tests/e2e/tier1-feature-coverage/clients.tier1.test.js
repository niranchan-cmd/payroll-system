'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, createToken, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 2: Client Organization Management (Tier 1)', () => {
  let client;
  let superAdminToken;
  let adminToken;
  let viewerToken;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const superAdmin = await seedUser('SUPER_ADMIN', { email: 'client-super@payroll.test' });
    const admin = await seedUser('ADMIN', { email: 'client-admin@payroll.test' });
    const viewer = await seedUser('VIEWER', { email: 'client-viewer@payroll.test' });

    superAdminToken = superAdmin.token;
    adminToken = admin.token;
    viewerToken = viewer.token;
  });

  it('T1.CLIENT.1: SUPER_ADMIN can create a new client with complete statutory and proration configuration', async () => {
    const payload = {
      name: 'Nexis Enterprise Solutions',
      registration_no: 'CIN-U72200KA2026PTC123456',
      pan: 'AABCN1234F',
      address: 'Plot 45, Electronic City, Bengaluru',
      state: 'Karnataka',
    };

    const res = await client
      .withBearer(superAdminToken)
      .post('/api/v1/clients', payload);

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id, 'Expected client id in response');
    assert.equal(res.body.data.name, payload.name);
    assert.equal(res.body.data.pan, payload.pan);
    assert.equal(res.body.data.registration_no, payload.registration_no);

    // Configure statutory and proration settings
    const statutoryPayload = {
      proration_rule: 'CALENDAR',
      pf_on_actual: false,
      esi_auto_apply: true,
      payroll_cycle: 'MONTHLY',
      payroll_cutoff: 25,
    };

    const updateRes = await client
      .withBearer(superAdminToken)
      .patch(`/api/v1/clients/${res.body.data.id}`, statutoryPayload);

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.proration_rule, 'CALENDAR');
    assert.equal(updateRes.body.data.pf_on_actual, false);
    assert.equal(updateRes.body.data.esi_auto_apply, true);
    assert.equal(updateRes.body.data.payroll_cutoff, 25);
  });

  it('T1.CLIENT.2: Authenticated user can retrieve the list of active clients', async () => {
    await seedClient({ name: 'Alpha Corp', pan: 'AAAAA1111A' });
    await seedClient({ name: 'Beta Labs', pan: 'BBBBB2222B' });

    const res = await client
      .withBearer(viewerToken)
      .get('/api/v1/clients');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Expected data to be an array of clients');
    assert.ok(res.body.data.length >= 2, 'Expected at least 2 seeded clients in response');

    const names = res.body.data.map((c) => c.name);
    assert.ok(names.includes('Alpha Corp'));
    assert.ok(names.includes('Beta Labs'));
  });

  it('T1.CLIENT.3: Authenticated user can retrieve a specific client by ID with all configuration fields', async () => {
    const seeded = await seedClient({
      name: 'Gamma Systems',
      pan: 'GGGGG3333G',
      proration_rule: 'FIXED_26',
      pf_on_actual: true,
      payroll_cutoff: 28,
    });

    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${seeded.id}`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, seeded.id);
    assert.equal(res.body.data.name, 'Gamma Systems');
    assert.equal(res.body.data.pan, 'GGGGG3333G');
    assert.equal(res.body.data.proration_rule, 'FIXED_26');
    assert.equal(res.body.data.pf_on_actual, true);
    assert.equal(res.body.data.payroll_cutoff, 28);
  });

  it('T1.CLIENT.4: ADMIN can update client details (name, PAN, proration rule, PF/ESI settings)', async () => {
    const seeded = await seedClient({
      name: 'Delta Corp',
      pan: 'DDDDD4444D',
      proration_rule: 'CALENDAR',
      pf_on_actual: false,
    });

    const updatePayload = {
      name: 'Delta Global Inc',
      pan: 'DDDDD9999Z',
      proration_rule: 'FIXED_30',
      pf_on_actual: true,
      esi_auto_apply: false,
      payroll_cutoff: 30,
    };

    const res = await client
      .withBearer(adminToken)
      .patch(`/api/v1/clients/${seeded.id}`, updatePayload);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.name, 'Delta Global Inc');
    assert.equal(res.body.data.pan, 'DDDDD9999Z');
    assert.equal(res.body.data.proration_rule, 'FIXED_30');
    assert.equal(res.body.data.pf_on_actual, true);
    assert.equal(res.body.data.esi_auto_apply, false);
    assert.equal(res.body.data.payroll_cutoff, 30);
  });

  it('T1.CLIENT.5: Client readiness endpoint /clients/:id/readiness accurately evaluates setup completion status', async () => {
    // Client with complete details AND an active CTC structure
    const completeClient = await seedClient({
      name: 'Ready Corp',
      registration_no: 'REG-101010',
      pan: 'ABCDE9999Q',
      address: 'Suite 200, Brigade Road, Bangalore',
      state: 'Karnataka',
      proration_rule: 'CALENDAR',
      pf_on_actual: false,
      esi_auto_apply: true,
      payroll_cycle: 'MONTHLY',
      payroll_cutoff: 25,
    });
    await seedCTCStructure(completeClient.id, { status: 'ACTIVE' });

    const res = await client
      .withBearer(viewerToken)
      .get(`/api/v1/clients/${completeClient.id}/readiness`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.is_ready, true, 'Fully configured client with structure must be ready');
    assert.ok(Array.isArray(res.body.data.items), 'Expected readiness items checklist');
    assert.equal(res.body.data.missing.length, 0, 'Ready client should have 0 missing requirements');

    // Negative check: Client lacking structure
    const unreadyClient = await seedClient({
      name: 'Incomplete Corp',
      address: null,
    });

    const unreadyRes = await client
      .withBearer(viewerToken)
      .get(`/api/v1/clients/${unreadyClient.id}/readiness`);

    assert.equal(unreadyRes.status, 200);
    assert.equal(unreadyRes.body.data.is_ready, false, 'Client without address and structure must not be ready');
    assert.ok(unreadyRes.body.data.missing.length > 0);
  });
});
