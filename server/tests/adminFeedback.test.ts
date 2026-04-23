// Must be set BEFORE importing the admin router so the startup warning in
// adminFeedback.ts is suppressed and the authorizer has a real password to
// compare against.
process.env.ADMIN_PASSWORD = 'test-admin-pw';

import test, { before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import pool from '../src/db.js';
import adminFeedbackRouter from '../src/routes/adminFeedback.js';
import { httpLogger } from '../src/logger.js';

function buildApp() {
  const app = express();
  app.use(httpLogger);
  app.use(express.json());
  app.use('/admin/feedback', adminFeedbackRouter);
  return app;
}

function basicAuthHeader(user: string, pass: string): string {
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
}

type QueryResult = { rows: unknown[] };
type QueryMock = (text: string, params?: unknown[]) => Promise<QueryResult>;

const origQuery = pool.query.bind(pool);
let queryMock: QueryMock | null = null;

function setMock(fn: QueryMock) {
  queryMock = fn;
}

before(() => {
  (pool as unknown as { query: QueryMock }).query = async (text, params) => {
    if (!queryMock) throw new Error('pool.query called in test without a mock');
    return queryMock(text, params);
  };
});

after(async () => {
  (pool as unknown as { query: typeof origQuery }).query = origQuery;
  await pool.end().catch(() => {});
});

beforeEach(() => {
  queryMock = null;
});

describe('GET /admin/feedback', () => {
  test('401 without Authorization header', async () => {
    const app = buildApp();
    const res = await request(app).get('/admin/feedback');
    assert.equal(res.status, 401);
    assert.match(res.headers['www-authenticate'] ?? '', /Basic/);
  });

  test('401 with wrong password', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/admin/feedback')
      .set('Authorization', basicAuthHeader('admin', 'wrong'));
    assert.equal(res.status, 401);
  });

  test('401 with correct password but wrong username', async () => {
    const app = buildApp();
    const res = await request(app)
      .get('/admin/feedback')
      .set('Authorization', basicAuthHeader('root', 'test-admin-pw'));
    assert.equal(res.status, 401);
  });

  test('200 with rows and aggregate stats when credentials are correct', async () => {
    const now = new Date().toISOString();
    let rowsQueryText = '';
    setMock(async (text) => {
      if (text.includes('SELECT id, comment')) {
        rowsQueryText = text;
        return {
          rows: [
            {
              id: 2,
              comment: 'newer',
              email: null,
              page_context: 'footer',
              metadata: null,
              user_agent: 'ua',
              user_id: 7,
              submitted_at: now,
            },
            {
              id: 1,
              comment: 'older',
              email: 'a@b.co',
              page_context: 'results',
              metadata: { foo: 'bar' },
              user_agent: 'ua',
              user_id: null,
              submitted_at: now,
            },
          ],
        };
      }
      if (text.includes('COUNT(*)')) {
        return { rows: [{ total: '2', last_7_days: '1' }] };
      }
      throw new Error('unexpected query: ' + text);
    });

    const app = buildApp();
    const res = await request(app)
      .get('/admin/feedback')
      .set('Authorization', basicAuthHeader('admin', 'test-admin-pw'));

    assert.equal(res.status, 200);
    assert.equal(res.body.feedback.length, 2);
    assert.equal(res.body.feedback[0].id, 2, 'rows should come back in DESC order as returned by query');
    assert.strictEqual(res.body.feedback[0].user_id, 7, 'logged-in submission carries user_id');
    assert.strictEqual(res.body.feedback[1].user_id, null, 'anonymous submission has null user_id');
    assert.match(rowsQueryText, /user_id/, 'admin SELECT projects user_id');
    assert.deepEqual(res.body.stats, { total: 2, last_7_days: 1 });
  });

  test('returns coerced numeric stats (not strings from COUNT)', async () => {
    setMock(async (text) => {
      if (text.includes('SELECT id, comment')) return { rows: [] };
      if (text.includes('COUNT(*)')) return { rows: [{ total: '7', last_7_days: '3' }] };
      throw new Error('unexpected query');
    });

    const app = buildApp();
    const res = await request(app)
      .get('/admin/feedback')
      .set('Authorization', basicAuthHeader('admin', 'test-admin-pw'));

    assert.equal(res.status, 200);
    assert.strictEqual(typeof res.body.stats.total, 'number');
    assert.strictEqual(typeof res.body.stats.last_7_days, 'number');
    assert.equal(res.body.stats.total, 7);
    assert.equal(res.body.stats.last_7_days, 3);
  });
});

describe('GET /admin/feedback with ADMIN_PASSWORD unset', () => {
  test('401 for all requests (fail-closed)', async () => {
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    try {
      const app = buildApp();
      const res = await request(app)
        .get('/admin/feedback')
        .set('Authorization', basicAuthHeader('admin', 'anything'));
      assert.equal(res.status, 401);
    } finally {
      process.env.ADMIN_PASSWORD = saved;
    }
  });
});
