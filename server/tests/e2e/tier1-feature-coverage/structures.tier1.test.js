'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 3: CTC Structure & Versioning (Tier 1)', () => {
  let client;
  let adminToken;
  let sampleClient;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'struct-admin@payroll.test' });
    adminToken = admin.token;
    sampleClient = await seedClient({ name: 'Structures Test Client' });
  });

  it('T1.STRUCT.1: ADMIN can create a V1 CTC structure with standard basic, HRA, and allowance components', async () => {
    const payload = {
      version_name: 'V1',
      effective_from: '2026-01-01',
      rounding_rule: 'NEAREST_RUPEE',
      remainder_comp: 'Special Allowance',
      components: [
        {
          name: 'Basic',
          calc_type: 'PERCENT_OF_CTC',
          value: 40,
          basis: 'ANNUAL_CTC',
          ctc_inclusion: 'INCLUDED',
          is_taxable: true,
          display_order: 1,
        },
        {
          name: 'HRA',
          calc_type: 'PERCENT_OF_BASIC',
          value: 50,
          basis: 'MONTHLY_BASIC',
          ctc_inclusion: 'INCLUDED',
          is_taxable: true,
          display_order: 2,
        },
        {
          name: 'Special Allowance',
          calc_type: 'REMAINDER',
          value: null,
          basis: 'N/A',
          ctc_inclusion: 'INCLUDED',
          is_taxable: true,
          display_order: 3,
        },
      ],
    };

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/structures`, payload);

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.version_name, 'V1');
    assert.equal(res.body.data.rounding_rule, 'NEAREST_RUPEE');
    assert.equal(res.body.data.remainder_comp, 'Special Allowance');
    assert.equal(res.body.data.status, 'ACTIVE');
    assert.ok(Array.isArray(res.body.data.components), 'Expected components array');
    assert.equal(res.body.data.components.length, 3);
  });

  it('T1.STRUCT.2: Structure list endpoint returns all versions for a client ordered by effective date', async () => {
    await seedCTCStructure(sampleClient.id, {
      version_name: 'V1',
      effective_from: new Date('2025-01-01'),
      status: 'EXPIRED',
    });
    await seedCTCStructure(sampleClient.id, {
      version_name: 'V2',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });

    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/structures`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Expected array of structures');
    assert.equal(res.body.data.length, 2);

    const versionNames = res.body.data.map((s) => s.version_name);
    assert.ok(versionNames.includes('V1'));
    assert.ok(versionNames.includes('V2'));
  });

  it('T1.STRUCT.3: Single structure endpoint returns detailed component breakdown and rounding rules', async () => {
    const seeded = await seedCTCStructure(sampleClient.id, {
      version_name: 'V1',
      rounding_rule: 'NEAREST_10',
      remainder_comp: 'Special Allowance',
    });

    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/structures/${seeded.id}`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, seeded.id);
    assert.equal(res.body.data.version_name, 'V1');
    assert.equal(res.body.data.rounding_rule, 'NEAREST_10');
    assert.ok(Array.isArray(res.body.data.components));
    assert.ok(res.body.data.components.length > 0);

    const basicComp = res.body.data.components.find((c) => c.name === 'Basic');
    assert.ok(basicComp, 'Expected Basic component in structure');
    assert.equal(basicComp.calc_type, 'PERCENT_OF_CTC');
  });

  it('T1.STRUCT.4: Structure conflict checker /check-conflict approves non-overlapping date ranges', async () => {
    // When no structures exist or date has no conflict
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/structures/check-conflict`, {
        effective_from: '2026-06-01',
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.has_conflict, false, 'Non-overlapping effective date should have no conflict');
  });

  it('T1.STRUCT.5: System correctly marks previous structure version as EXPIRED when new version is activated', async () => {
    // Initial active V1 structure
    const v1 = await seedCTCStructure(sampleClient.id, {
      version_name: 'V1',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });

    // Create new V2 structure with AUTO_END resolution
    const v2Payload = {
      version_name: 'V2',
      effective_from: '2026-04-01',
      rounding_rule: 'NEAREST_RUPEE',
      remainder_comp: 'Special Allowance',
      resolve_conflict: 'AUTO_END',
      components: [
        {
          name: 'Basic',
          calc_type: 'PERCENT_OF_CTC',
          value: 50,
          basis: 'ANNUAL_CTC',
          ctc_inclusion: 'INCLUDED',
          is_taxable: true,
          display_order: 1,
        },
        {
          name: 'Special Allowance',
          calc_type: 'REMAINDER',
          value: null,
          basis: 'N/A',
          ctc_inclusion: 'INCLUDED',
          is_taxable: true,
          display_order: 2,
        },
      ],
    };

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/structures`, v2Payload);

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.version_name, 'V2');
    assert.equal(res.body.data.status, 'ACTIVE');

    // Inspect V1 in database to verify it transitioned to EXPIRED
    const v1Updated = await client
      .withBearer(adminToken)
      .get(`/api/v1/structures/${v1.id}`);

    assert.equal(v1Updated.status, 200);
    assert.equal(v1Updated.body.data.status, 'EXPIRED', 'Previous structure must be marked EXPIRED');
    assert.ok(v1Updated.body.data.effective_to, 'Previous structure must have effective_to date set');
  });
});
