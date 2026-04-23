import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { reqSerializer } from '../src/logger.js';

describe('reqSerializer', () => {
  test('omits remoteAddress and remotePort', () => {
    // Cast through unknown: the serializer's input type doesn't include these
    // fields (by design), but pino-http's default serializer does, and we
    // want to confirm that extra fields on the input are discarded.
    const out = reqSerializer({
      id: 'abc-123',
      method: 'POST',
      url: '/feedback',
      headers: { 'user-agent': 'test/1' },
      remoteAddress: '203.0.113.5',
      remotePort: 443,
    } as unknown as Parameters<typeof reqSerializer>[0]);
    assert.equal('remoteAddress' in out, false);
    assert.equal('remotePort' in out, false);
  });

  test('keeps only whitelisted headers and drops cookie/authorization/ip headers', () => {
    const out = reqSerializer({
      id: 'x',
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': 'Mozilla/5.0',
        host: 'example.com',
        referer: 'https://example.com/',
        'x-request-id': 'req-1',
        cookie: 'vbn.sid=secret',
        authorization: 'Bearer xyz',
        'x-forwarded-for': '203.0.113.5',
        'x-real-ip': '203.0.113.5',
        'accept-language': 'en-US',
      },
    });
    const headers = out.headers as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(headers).sort(),
      ['host', 'referer', 'user-agent', 'x-request-id'],
    );
    assert.equal('cookie' in headers, false);
    assert.equal('authorization' in headers, false);
    assert.equal('x-forwarded-for' in headers, false);
    assert.equal('x-real-ip' in headers, false);
  });

  test('emits the expected top-level fields', () => {
    const out = reqSerializer({
      id: 'abc',
      method: 'POST',
      url: '/feedback',
      query: { q: '1' },
      params: { id: '7' },
      headers: {},
    });
    assert.equal(out.id, 'abc');
    assert.equal(out.method, 'POST');
    assert.equal(out.url, '/feedback');
    assert.deepEqual(out.query, { q: '1' });
    assert.deepEqual(out.params, { id: '7' });
    assert.deepEqual(out.headers, {});
  });

  test('handles a request with no headers object', () => {
    const out = reqSerializer({ id: 'x', method: 'GET', url: '/' });
    assert.deepEqual(out.headers, {});
  });
});
