'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
require('../../setup');
const { app } = require('../../setup');
const { createTestClient } = require('../../helpers/testClient');

describe('Suite 2: CORS & Origin Hardening (Tier 2)', () => {
  let client;

  beforeEach(() => {
    client = createTestClient(app);
  });

  it('T2.CORS.1: Request with unauthorized origin (http://malicious-site.com) is rejected with 403 Forbidden', async () => {
    const res = await client
      .withHeader('origin', 'http://malicious-site.com')
      .get('/api/v1/health');

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
    assert.ok(
      res.body.message.includes('CORS') || res.body.message.includes('Not allowed'),
      `Expected CORS rejection message, got: ${res.body.message}`
    );
  });

  it('T2.CORS.2: Request with spoofed subdomain (http://evil-payroll.vercel.app) is rejected with 403 Forbidden', async () => {
    const res = await client
      .withHeader('origin', 'http://evil-payroll.vercel.app')
      .get('/api/v1/health');

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.equal(res.body.success, false);
  });

  it('T2.CORS.3: Valid allowed origin receives Access-Control-Allow-Origin header', async () => {
    const allowedOrigin = 'http://localhost:5173';
    const res = await client
      .withHeader('origin', allowedOrigin)
      .get('/api/v1/health');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    const acao = res.headers['access-control-allow-origin'];
    assert.equal(acao, allowedOrigin, `Expected ACAO: ${allowedOrigin}, got: ${acao}`);
  });

  it('T2.CORS.4: Preflight OPTIONS request from untrusted origin returns 403 and omits credentials header', async () => {
    const res = await client
      ._request('OPTIONS', '/api/v1/clients', null, {
        headers: {
          origin: 'http://hacker-phishing.com',
          'access-control-request-method': 'POST',
        },
      });

    assert.equal(res.status, 403, `Expected 403 Forbidden, got ${res.status}`);
    const allowCreds = res.headers['access-control-allow-credentials'];
    assert.notEqual(allowCreds, 'true', 'Credentials header must never be present on rejected preflight');
  });

  it('T2.CORS.5: Server-to-server request with no Origin header is permitted for internal health check', async () => {
    // Zero Origin header simulating backend internal or curl call
    const res = await client.get('/api/v1/health');

    assert.equal(res.status, 200, `Expected 200 OK, got ${res.status}`);
    assert.equal(res.body.status, 'OK');
    assert.ok(res.body.timestamp);
  });
});
