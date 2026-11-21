'use strict';

const http = require('http');
const { Readable, Writable } = require('stream');

/**
 * Fluent in-process HTTP test client.
 * Dispatches requests directly into the Express application pipeline without opening external sockets.
 */
class TestClient {
  constructor(app, defaultHeaders = {}) {
    this.app = app;
    this.defaultHeaders = { ...defaultHeaders };
    this._token = null;
    this._cookies = [];
  }

  withBearer(token) {
    const clone = this._clone();
    clone._token = token;
    return clone;
  }

  withCookie(cookie) {
    const clone = this._clone();
    clone._cookies.push(cookie);
    return clone;
  }

  withHeader(name, value) {
    const clone = this._clone();
    clone.defaultHeaders[name.toLowerCase()] = value;
    return clone;
  }

  _clone() {
    const client = new TestClient(this.app, this.defaultHeaders);
    client._token = this._token;
    client._cookies = [...this._cookies];
    return client;
  }

  async get(url, opts = {}) {
    return this._request('GET', url, null, opts);
  }

  async post(url, body = null, opts = {}) {
    return this._request('POST', url, body, opts);
  }

  async put(url, body = null, opts = {}) {
    return this._request('PUT', url, body, opts);
  }

  async patch(url, body = null, opts = {}) {
    return this._request('PATCH', url, body, opts);
  }

  async delete(url, opts = {}) {
    return this._request('DELETE', url, null, opts);
  }

  /**
   * Helper to perform multipart/form-data upload (e.g. for bulk Excel imports)
   */
  async uploadFile(url, fieldName, filename, fileBuffer, mimeType = 'application/octet-stream', additionalFields = {}, opts = {}) {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    const parts = [];

    for (const [key, val] of Object.entries(additionalFields)) {
      parts.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`
        )
      );
    }

    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`
      )
    );
    parts.push(Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer));
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const fullBody = Buffer.concat(parts);

    const mergedOpts = {
      ...opts,
      headers: {
        ...(opts.headers || {}),
        'content-type': `multipart/form-data; boundary=${boundary}`,
        'content-length': String(fullBody.length),
      },
    };

    return this._request('POST', url, fullBody, mergedOpts);
  }

  _request(method, url, body, opts = {}) {
    return new Promise((resolve, reject) => {
      const headers = { ...this.defaultHeaders, ...(opts.headers || {}) };

      if (this._token && !headers['authorization']) {
        headers['authorization'] = `Bearer ${this._token}`;
      }

      if (this._cookies.length > 0 && !headers['cookie']) {
        headers['cookie'] = this._cookies.join('; ');
      }

      let payloadBuffer = null;
      if (body !== null && body !== undefined) {
        if (Buffer.isBuffer(body)) {
          payloadBuffer = body;
        } else if (typeof body === 'object') {
          if (!headers['content-type']) {
            headers['content-type'] = 'application/json';
          }
          payloadBuffer = Buffer.from(JSON.stringify(body));
        } else {
          payloadBuffer = Buffer.from(String(body));
        }

        if (!headers['content-length']) {
          headers['content-length'] = String(payloadBuffer.length);
        }
      }

      const socket = new Readable({ read() {} });
      socket.remoteAddress = '127.0.0.1';
      socket.encrypted = false;
      socket.destroy = () => {};

      const req = new http.IncomingMessage(socket);
      req.complete = true;
      req.method = method;
      req.url = url;
      req.headers = Object.assign({ host: 'localhost:5000' }, headers);

      const resSocket = new Writable({
        write(chunk, enc, cb) {
          cb();
        },
      });
      const res = new http.ServerResponse(req);
      res.assignSocket(resSocket);

      const chunks = [];
      const origWrite = res.write;
      res.write = function (chunk, ...args) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return origWrite.apply(this, [chunk, ...args]);
      };

      const origEnd = res.end;
      res.end = function (chunk, ...args) {
        if (chunk && typeof chunk !== 'function') {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return origEnd.apply(this, [chunk, ...args]);
      };

      res.on('finish', () => {
        const rawBuffer = Buffer.concat(chunks);
        const rawText = rawBuffer.toString('utf8');
        let parsedBody = rawText;
        const contentType = res.getHeader('content-type') || '';
        if (typeof contentType === 'string' && contentType.includes('application/json')) {
          try {
            parsedBody = JSON.parse(rawText);
          } catch (_) {
            parsedBody = rawText;
          }
        }

        resolve({
          status: res.statusCode,
          headers: res.getHeaders(),
          body: parsedBody,
          raw: rawBuffer,
        });
      });

      // Execute Express app
      try {
        this.app.handle(req, res);

        if (payloadBuffer) {
          req.push(payloadBuffer);
        }
        req.push(null);
      } catch (err) {
        reject(err);
      }
    });
  }
}

function createTestClient(app) {
  return new TestClient(app);
}

module.exports = {
  TestClient,
  createTestClient,
};
