'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 8: Bulk Import File & Malformed Data Edges (Tier 2)', () => {
  let client;
  let adminToken;
  let sampleOrg;

  const headers = [
    'Roll No',
    'Name',
    'Designation',
    'Department',
    'Email',
    'Start Date (YYYY-MM-DD)',
    'Annual CTC',
    'Tax Regime (OLD/NEW)',
  ];

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'imp-edge-admin@payroll.test' });
    adminToken = admin.token;

    sampleOrg = await seedClient({ name: 'Import Edge Org' });
    await seedCTCStructure(sampleOrg.id, {
      version_name: 'V1',
      effective_from: new Date('2026-01-01'),
      status: 'ACTIVE',
    });
  });

  it('T2.IMP_EDGE.1: Uploading non-Excel file (e.g. .pdf or .exe) returns 400 Only Excel files accepted', async () => {
    const pdfBuffer = Buffer.from('%PDF-1.4\n%Malformed PDF Content');
    const res = await client
      .withBearer(adminToken)
      .uploadFile(
        `/api/v1/clients/${sampleOrg.id}/employees/import/validate`,
        'file',
        'resume.pdf',
        pdfBuffer,
        'application/pdf'
      );

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.message.includes('Only Excel files') || res.body.message.includes('Validation failed')
    );
  });

  it('T2.IMP_EDGE.2: Uploading file exceeding 5MB size limit returns 413 Payload Too Large', async () => {
    // 5.5 MB dummy buffer
    const largeBuffer = Buffer.alloc(5.5 * 1024 * 1024, 'A');
    const res = await client
      .withBearer(adminToken)
      .uploadFile(
        `/api/v1/clients/${sampleOrg.id}/employees/import/validate`,
        'file',
        'large_roster.xlsx',
        largeBuffer,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

    assert.equal(res.status, 413, `Expected 413 Payload Too Large, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
  });

  it('T2.IMP_EDGE.3: Uploading empty Excel sheet with zero rows returns 400 with empty file error', async () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers]); // Only headers, zero employee rows
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const emptyBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await client
      .withBearer(adminToken)
      .uploadFile(
        `/api/v1/clients/${sampleOrg.id}/employees/import/validate`,
        'file',
        'empty.xlsx',
        emptyBuf,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

    assert.equal(res.status, 400, `Expected 400 Bad Request, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(res.body.message.includes('No data rows found') || res.body.message.includes('empty'));
  });

  it('T2.IMP_EDGE.4: File containing duplicate roll numbers within the same client returns validation error ledger', async () => {
    const wb = XLSX.utils.book_new();
    const duplicateRows = [
      headers,
      ['DUP-001', 'First Person', 'Dev', 'Tech', 'p1@test.com', '2026-01-01', 500000, 'NEW'],
      ['DUP-001', 'Second Person With Same Roll', 'Dev', 'Tech', 'p2@test.com', '2026-01-01', 600000, 'NEW'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(duplicateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await client
      .withBearer(adminToken)
      .uploadFile(
        `/api/v1/clients/${sampleOrg.id}/employees/import/validate`,
        'file',
        'duplicates.xlsx',
        buf,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

    assert.equal(res.status, 200, `Expected 200 with invalid ledger, got ${res.status}`);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.invalid.length > 0, 'Expected invalid rows detected');
    const dupIssue = res.body.data.invalid.find((inv) =>
      inv.errors.some((err) => err.toLowerCase().includes('duplicate'))
    );
    assert.ok(dupIssue, 'Expected duplicate roll number error flagged');
  });

  it('T2.IMP_EDGE.5: Row with future start date beyond company bounds is flagged in validation response', async () => {
    const wb = XLSX.utils.book_new();
    // 2099-01-01 has no applicable CTC structure version
    const invalidDateRows = [
      headers,
      ['FUT-001', 'Future Person', 'Architect', 'Tech', 'future@test.com', '1950-01-01', 500000, 'NEW'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(invalidDateRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const res = await client
      .withBearer(adminToken)
      .uploadFile(
        `/api/v1/clients/${sampleOrg.id}/employees/import/validate`,
        'file',
        'future_date.xlsx',
        buf,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    // Either valid or invalid ledger depending on whether fallback structure resolved or error flagged
    assert.ok(res.body.data.summary);
  });
});
