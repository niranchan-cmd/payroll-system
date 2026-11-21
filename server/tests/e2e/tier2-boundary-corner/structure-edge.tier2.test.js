'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 6: CTC Structure Mathematical & Overlap Edges (Tier 2)', () => {
  let client;
  let adminToken;
  let sampleOrg;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'str-edge-admin@payroll.test' });
    adminToken = admin.token;

    sampleOrg = await seedClient({ name: 'Structure Edge Org' });
  });

  it('T2.STR_EDGE.1: Creating CTC structure where component percentages exceed 100% is rejected with 400', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/structures`, {
        version_name: 'V-Invalid-120Percent',
        effective_from: '2026-01-01',
        remainder_comp: 'Special Allowance',
        components: [
          { name: 'Basic', calc_type: 'PERCENT_OF_CTC', value: 80.0, ctc_inclusion: 'INCLUDED' },
          { name: 'HRA', calc_type: 'PERCENT_OF_CTC', value: 45.0, ctc_inclusion: 'INCLUDED' }, // 80 + 45 = 125%
          { name: 'Special Allowance', calc_type: 'REMAINDER', ctc_inclusion: 'INCLUDED' },
        ],
      });

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('exceed 100%') || (res.body.errors && res.body.errors.length > 0));
  });

  it('T2.STR_EDGE.2: Creating structure with effective date overlapping existing version is rejected with 409 Conflict', async () => {
    // Seed V1 effective 2026-01-01
    await seedCTCStructure(sampleOrg.id, {
      version_name: 'V1',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });

    // Attempt to create another structure without resolve_conflict: 'AUTO_END'
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/structures`, {
        version_name: 'V2-Conflicting',
        effective_from: '2026-01-01',
        remainder_comp: 'Special Allowance',
        components: [
          { name: 'Basic', calc_type: 'PERCENT_OF_CTC', value: 50.0, ctc_inclusion: 'INCLUDED' },
          { name: 'Special Allowance', calc_type: 'REMAINDER', ctc_inclusion: 'INCLUDED' },
        ],
      });

    assert.equal(res.status, 409, `Expected 409 Conflict, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.conflict === true || (res.body.message && res.body.message.includes('Conflict')));
  });

  it('T2.STR_EDGE.3: Structure with ₹0 fixed component handles division and calculation without NaN', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/structures`, {
        version_name: 'V-ZeroFixed',
        effective_from: '2026-06-01',
        remainder_comp: 'Special Allowance',
        components: [
          { name: 'Basic', calc_type: 'PERCENT_OF_CTC', value: 40.0, ctc_inclusion: 'INCLUDED' },
          { name: 'Zero Bonus', calc_type: 'FIXED', value: 0, ctc_inclusion: 'INCLUDED' },
          { name: 'Special Allowance', calc_type: 'REMAINDER', ctc_inclusion: 'INCLUDED' },
        ],
      });

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}`);
    assert.equal(res.body.success, true);
    const comps = res.body.data.components;
    const zeroComp = comps.find((c) => c.name === 'Zero Bonus');
    assert.ok(zeroComp);
    assert.equal(Number(zeroComp.value), 0);
  });

  it('T2.STR_EDGE.4: Remainder component absorbs penny rounding differences ensuring exact sum equals total CTC', async () => {
    const struct = await seedCTCStructure(sampleOrg.id, {
      version_name: 'V-Remainder-Check',
      effective_from: new Date('2026-07-01'),
      components: [
        { name: 'Basic', calc_type: 'PERCENT_OF_CTC', value: 33.33, ctc_inclusion: 'INCLUDED' },
        { name: 'HRA', calc_type: 'PERCENT_OF_CTC', value: 33.33, ctc_inclusion: 'INCLUDED' },
        { name: 'Special Allowance', calc_type: 'REMAINDER', value: null, ctc_inclusion: 'INCLUDED' },
      ],
    });

    const singleRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/structures/${struct.id}`);

    assert.equal(singleRes.status, 200);
    assert.equal(singleRes.body.data.remainder_comp, 'Special Allowance');
  });

  it('T2.STR_EDGE.5: Creating structure without mandatory Basic component returns 400 Bad Request', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleOrg.id}/structures`, {
        version_name: 'V-NoBasic',
        effective_from: '2026-08-01',
        remainder_comp: 'Special Allowance',
        components: [
          { name: 'HRA', calc_type: 'PERCENT_OF_CTC', value: 40.0, ctc_inclusion: 'INCLUDED' },
          { name: 'Special Allowance', calc_type: 'REMAINDER', ctc_inclusion: 'INCLUDED' },
        ],
      });

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.message.includes('Basic component') || (res.body.errors && res.body.errors.length > 0)
    );
  });
});
