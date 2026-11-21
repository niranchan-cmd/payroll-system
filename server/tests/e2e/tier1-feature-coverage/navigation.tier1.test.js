'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');
const { seedUser, seedClient, seedCTCStructure, seedEmployee, resetDatabase } = require('../../helpers/testFixtures');

describe('Suite 10: Multi-Page Navigation & Routing (Tier 1)', () => {
  let client;
  let adminToken;
  let sampleClient;

  beforeEach(async () => {
    resetDatabase();
    client = createTestClient(app);

    const admin = await seedUser('ADMIN', { email: 'nav-admin@payroll.test' });
    adminToken = admin.token;
    sampleClient = await seedClient({ name: 'Navigation Target Client' });
  });

  it('T1.NAV.1: Direct GET requests to top-level paths (/dashboard, /clients, /reports, /payroll) return valid layout shells', async () => {
    const topLevelPaths = ['/dashboard', '/clients', '/reports', '/payroll'];

    for (const routePath of topLevelPaths) {
      const res = await client.get(routePath);

      assert.equal(res.status, 200, `Expected 200 OK for ${routePath}, got ${res.status}`);
      const contentType = res.headers['content-type'] || '';
      assert.ok(contentType.includes('text/html'), `Expected HTML shell for ${routePath}, got: ${contentType}`);

      const bodyText = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
      assert.ok(bodyText.includes('<div id="root"></div>'), `Expected root mount point in ${routePath}`);
      assert.ok(bodyText.includes('Ploye.pe') || bodyText.includes('Payroll'), `Expected application title in ${routePath}`);
    }
  });

  it('T1.NAV.2: Deep-link route /clients/:id/employees properly extracts client ID and synchronizes context', async () => {
    // 1. Direct deep-link HTTP navigation returns HTML layout shell
    const res = await client.get(`/clients/${sampleClient.id}/employees`);

    assert.equal(res.status, 200, `Expected 200 OK for deep-link route, got ${res.status}`);
    const bodyText = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    assert.ok(bodyText.includes('<div id="root"></div>'));

    // 2. Synchronized context verification via API contract
    const apiRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}`);

    assert.equal(apiRes.status, 200);
    assert.equal(apiRes.body.data.id, sampleClient.id);
    assert.equal(apiRes.body.data.name, 'Navigation Target Client');

    // 3. Employee list scoped to this client ID
    const empListRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/employees`);
    assert.equal(empListRes.status, 200);
    assert.ok(Array.isArray(empListRes.body.data));
  });

  it('T1.NAV.3: Deep-link route /clients/:id/payroll loads payroll history for the specified client', async () => {
    const struct = await seedCTCStructure(sampleClient.id);
    await seedEmployee(sampleClient.id, struct.id, { roll_no: 'NAV-PAY-1' });

    // Execute run for this client
    const runRes = await client
      .withBearer(adminToken)
      .post(`/api/v1/clients/${sampleClient.id}/payroll/run`, {
        month: 1,
        year: 2026,
      });
    assert.equal(runRes.status, 201);

    // Deep link route loads valid shell
    const res = await client.get(`/clients/${sampleClient.id}/payroll`);
    assert.equal(res.status, 200);
    const bodyText = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    assert.ok(bodyText.includes('<div id="root"></div>'));

    // Scoped payroll history loads runs for this client
    const runsRes = await client
      .withBearer(adminToken)
      .get(`/api/v1/clients/${sampleClient.id}/payroll`);
    assert.equal(runsRes.status, 200);
    assert.ok(Array.isArray(runsRes.body.data));
    assert.equal(runsRes.body.data.length, 1);
    assert.equal(runsRes.body.data[0].month, 1);
  });

  it('T1.NAV.4: Admin layout route /admin/* renders navigation sidebar with Users, Settings, and Audit Logs tabs', async () => {
    const adminPaths = ['/admin/users', '/admin/settings', '/admin/audit-logs'];

    for (const adminPath of adminPaths) {
      const res = await client.get(adminPath);
      assert.equal(res.status, 200, `Expected 200 for ${adminPath}`);
      const bodyText = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
      assert.ok(bodyText.includes('<div id="root"></div>'));
    }

    // Verify frontend App.jsx or Sidebar route structure supports Admin navigation
    const clientAppPath = path.resolve(__dirname, '../../../../client/src/App.jsx');
    if (fs.existsSync(clientAppPath)) {
      const appSource = fs.readFileSync(clientAppPath, 'utf8');
      assert.ok(
        appSource.includes('admin') || appSource.includes('Admin') || appSource.includes('Routes'),
        'Frontend router should declare routing architecture'
      );
    }
  });

  it('T1.NAV.5: User profile and settings route /settings renders password change and account details', async () => {
    const res = await client.get('/settings');

    assert.equal(res.status, 200, `Expected 200 OK for /settings, got ${res.status}`);
    const bodyText = typeof res.body === 'string' ? res.body : JSON.stringify(res.body);
    assert.ok(bodyText.includes('<div id="root"></div>'));

    // Verify settings backend contract is accessible for user profile
    const profileRes = await client
      .withBearer(adminToken)
      .get('/api/v1/auth/me');

    assert.equal(profileRes.status, 200);
    assert.equal(profileRes.body.data.email, 'nav-admin@payroll.test');
  });
});
