'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../setup');
const { createTestClient } = require('../helpers/testClient');

describe('Security Hardening — Feature 2: CORS Configuration', () => {
  const client = createTestClient(app);

  it('rejects cross-origin request from arbitrary third-party .vercel.app domain', async () => {
    const res = await client._request('OPTIONS', '/api/v1/health', null, {
      headers: {
        origin: 'https://malicious-attacker.vercel.app',
        'access-control-request-method': 'GET',
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /CORS/i);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('rejects cross-origin request from completely unauthorized domain', async () => {
    const res = await client._request('OPTIONS', '/api/v1/health', null, {
      headers: {
        origin: 'https://evil-hacker.com',
        'access-control-request-method': 'GET',
      },
    });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /CORS/i);
    assert.equal(res.headers['access-control-allow-origin'], undefined);
  });

  it('allows registered production frontend origin (https://payroll-os-rose.vercel.app)', async () => {
    const res = await client._request('OPTIONS', '/api/v1/health', null, {
      headers: {
        origin: 'https://payroll-os-rose.vercel.app',
        'access-control-request-method': 'GET',
      },
    });

    assert.ok(res.status === 200 || res.status === 204);
    assert.equal(res.headers['access-control-allow-origin'], 'https://payroll-os-rose.vercel.app');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  it('allows registered local development frontend origin (http://localhost:5173)', async () => {
    const res = await client._request('OPTIONS', '/api/v1/health', null, {
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'GET',
      },
    });

    assert.ok(res.status === 200 || res.status === 204);
    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(res.headers['access-control-allow-credentials'], 'true');
  });

  it('permits requests with no origin (e.g. server-to-server or mobile clients)', async () => {
    const res = await client.get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'OK');
  });
});
