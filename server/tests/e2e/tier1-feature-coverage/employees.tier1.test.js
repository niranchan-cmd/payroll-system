'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 4: Employee & Salary History (Tier 1)', () => {
  let client;
  let adminToken;
  let sampleClient;
  let sampleStructure;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'emp-admin@payroll.test' });
    adminToken = admin.token;
    sampleClient = await seedClient({ name: 'Emp Test Client' });
    sampleStructure = await seedCTCStructure(sampleClient.id, {
      version_name: 'V1',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });
  });

  it('T1.EMP.1: ADMIN can onboard a new employee with valid personal details and initial salary CTC', async () => {
    const payload = {
      name: 'Priya Sharma',
      roll_no: 'EMP-101',
      designation: 'Senior Developer',
      department: 'Technology',
      email: 'priya.sharma@acme.test',
      start_date: '2026-01-15',
      tax_regime: 'NEW',
      annual_ctc: 840000,
      confirmed: true,
    };

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/employees`, payload);

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.id, 'Expected employee id');
    assert.equal(res.body.data.name, 'Priya Sharma');
    assert.equal(res.body.data.roll_no, 'EMP-101');
    assert.equal(res.body.data.designation, 'Senior Developer');
  });

  it('T1.EMP.2: Employee directory returns paginated employees for a client with active salary details', async () => {
    await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Rohan Verma',
      roll_no: 'EMP-201',
      annual_ctc: 600000,
    });
    await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Ananya Roy',
      roll_no: 'EMP-202',
      annual_ctc: 750000,
    });

    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/employees`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data), 'Expected array of employees');
    assert.equal(res.body.data.length, 2);

    const rollNos = res.body.data.map((e) => e.roll_no);
    assert.ok(rollNos.includes('EMP-201'));
    assert.ok(rollNos.includes('EMP-202'));
  });

  it('T1.EMP.3: Single employee profile endpoint returns complete salary revision timeline', async () => {
    const { employee } = await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Siddharth Sen',
      roll_no: 'EMP-301',
      annual_ctc: 500000,
    });

    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/employees/${employee.id}`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.employee.id, employee.id);
    assert.equal(res.body.data.employee.name, 'Siddharth Sen');
    assert.ok(Array.isArray(res.body.data.employee.salary_histories), 'Expected salary revision timeline');
    assert.equal(res.body.data.employee.salary_histories.length, 1);
    assert.equal(Number(res.body.data.employee.salary_histories[0].annual_ctc), 500000);
  });

  it('T1.EMP.4: Salary preview endpoint /preview-salary calculates accurate monthly component breakdown', async () => {
    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/employees/preview-salary`, {
        annual_ctc: 600000,
        start_date: '2026-01-01',
      });

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.monthlyCTC, 50000); // 600,000 / 12
    assert.ok(Array.isArray(res.body.data.includedComponents));

    // Basic is 40% of CTC = 20,000 / month
    const basic = res.body.data.includedComponents.find((c) => c.name === 'Basic');
    assert.ok(basic, 'Expected Basic component in preview');
    assert.equal(basic.monthly, 20000);
  });

  it('T1.EMP.5: CTC revision endpoint /revise-ctc creates new salary history record and updates active CTC', async () => {
    const { employee } = await seedEmployee(sampleClient.id, sampleStructure.id, {
      name: 'Kavita Nair',
      roll_no: 'EMP-501',
      annual_ctc: 600000,
    });

    const revisionPayload = {
      new_annual_ctc: 900000,
      effective_from: '2026-04-01',
      change_reason: 'CTC_REVISION',
      notes: 'Annual Performance Appraisal',
      confirmed: true,
    };

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/employees/${employee.id}/revise-ctc`, revisionPayload);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);

    // Profile check verifying 2 history records now exist
    const profileRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/employees/${employee.id}`);

    assert.equal(profileRes.status, 200);
    const histories = profileRes.body.data.employee.salary_histories;
    assert.equal(histories.length, 2, 'Expected 2 salary history records after revision');

    const activeRecord = histories.find((h) => !h.effective_to);
    assert.ok(activeRecord, 'Expected currently active salary history record');
    assert.equal(Number(activeRecord.annual_ctc), 900000);
  });
});
