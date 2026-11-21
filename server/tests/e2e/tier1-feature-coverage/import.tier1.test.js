'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 5: Bulk Import Engine (Tier 1)', () => {
  let client;
  let adminToken;
  let sampleClient;
  let sampleStructure;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'import-admin@payroll.test' });
    adminToken = admin.token;
    sampleClient = await seedClient({ name: 'Bulk Import Client' });
    sampleStructure = await seedCTCStructure(sampleClient.id, {
      version_name: 'V1',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });
  });

  it('T1.IMP.1: Download template endpoint returns valid Excel (.xlsx) file with required column headers', async () => {
    const res = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/employees/import/template`);

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const contentType = res.headers['content-type'] || '';
    assert.ok(
      contentType.includes('spreadsheetml') || contentType.includes('application/octet-stream'),
      `Expected Excel content-type, got: ${contentType}`
    );
    assert.ok(res.raw && res.raw.length > 0, 'Expected binary Excel file buffer');

    // Parse the returned buffer using XLSX
    const wb = XLSX.read(res.raw, { type: 'buffer' });
    assert.ok(wb.SheetNames.includes('Employees'), 'Template should contain Employees sheet');
    const ws = wb.Sheets['Employees'];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
    assert.ok(rows.length >= 1, 'Template should contain header row');

    const headers = rows[0];
    assert.ok(headers.includes('Roll No'));
    assert.ok(headers.includes('Name'));
    assert.ok(headers.includes('Annual CTC'));
    assert.ok(headers.includes('Start Date (YYYY-MM-DD)'));
  });

  it('T1.IMP.2: Upload and validate endpoint approves valid multi-row Excel spreadsheet with zero errors', async () => {
    // Construct test workbook buffer
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Roll No', 'Name', 'Designation', 'Department', 'Email', 'Start Date (YYYY-MM-DD)', 'Annual CTC', 'Tax Regime (OLD/NEW)'],
      ['BULK-001', 'Arjun Mehta', 'Developer', 'Engineering', 'arjun@corp.test', '2026-01-01', 720000, 'NEW'],
      ['BULK-002', 'Deepa Krishnan', 'QA Lead', 'QA', 'deepa@corp.test', '2026-01-01', 800000, 'OLD'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const fileBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await client
      .withBearer(adminToken)
      .uploadFile(
        `/api/v1/clients/${sampleClient.id}/employees/import/validate`,
        'file',
        'test_employees.xlsx',
        fileBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.can_import, true, 'Validation should approve valid rows');
    assert.equal(res.body.data.errors.length, 0, 'Expected zero validation errors');
    assert.equal(res.body.data.valid.length, 2, 'Expected 2 valid employee records');
  });

  it('T1.IMP.3: Bulk confirm endpoint creates multiple employee records and salary histories in a single transaction', async () => {
    const importRows = [
      {
        rollNo: 'BULK-101',
        name: 'Sunil Rao',
        designation: 'Architect',
        department: 'Tech',
        email: 'sunil@corp.test',
        startDate: '2026-01-01',
        annualCTC: 1200000,
        taxRegime: 'NEW',
      },
      {
        rollNo: 'BULK-102',
        name: 'Meera Sen',
        designation: 'Analyst',
        department: 'Finance',
        email: 'meera@corp.test',
        startDate: '2026-01-01',
        annualCTC: 650000,
        taxRegime: 'NEW',
      },
    ];

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/employees/import/confirm`, {
        rows: importRows,
      });

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.imported, 2);
    assert.equal(res.body.data.failed.length, 0);
  });

  it('T1.IMP.4: Import accurately resolves applicable CTC structure for each employee based on start date', async () => {
    // Add V2 structure effective from 2026-06-01
    const v2Structure = await seedCTCStructure(sampleClient.id, {
      version_name: 'V2',
      effective_from: new Date('2026-06-01'),
      status: 'UPCOMING',
    });

    const rows = [
      {
        rollNo: 'BULK-V1',
        name: 'V1 Joiner',
        designation: 'Dev',
        startDate: '2026-02-01', // Should resolve to V1
        annualCTC: 600000,
        taxRegime: 'NEW',
      },
      {
        rollNo: 'BULK-V2',
        name: 'V2 Joiner',
        designation: 'Dev',
        startDate: '2026-07-01', // Should resolve to V2
        annualCTC: 900000,
        taxRegime: 'NEW',
      },
    ];

    const res = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/employees/import/confirm`, {
        rows,
      });

    assert.equal(res.status, 201, `Expected 201 Created, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.data.imported, 2);

    // Verify V2 Joiner's salary history references V2 structure
    const empV2 = await global.prisma.employee.findUnique({
      where: { client_id_roll_no: { client_id: sampleClient.id, roll_no: 'BULK-V2' } },
    });
    const historyV2 = await global.prisma.employeeSalaryHistory.findFirst({
      where: { employee_id: empV2.id },
    });
    assert.equal(historyV2.structure_version_id, v2Structure.id, 'Expected V2 structure for July joiner');
  });

  it('T1.IMP.5: Successfully imported employees immediately appear in client employee listing', async () => {
    const importRows = [
      {
        rollNo: 'DIR-001',
        name: 'Direct Listed One',
        designation: 'Specialist',
        startDate: '2026-01-01',
        annualCTC: 550000,
        taxRegime: 'NEW',
      },
    ];

    await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/employees/import/confirm`, {
        rows: importRows,
      });

    const directoryRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/employees`);

    assert.equal(directoryRes.status, 200);
    const rolls = directoryRes.body.data.map((e) => e.roll_no);
    assert.ok(rolls.includes('DIR-001'), 'Imported employee must immediately appear in directory listing');
  });
});
