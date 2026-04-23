import test, { before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import pool from '../src/db.js';
import feedbackRouter from '../src/routes/feedback.js';
import { feedbackLimiter } from '../src/middleware/rateLimit.js';
import { httpLogger } from '../src/logger.js';

function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(httpLogger);
  app.use(express.json());
  app.use('/feedback', feedbackRouter);
  return app;
}

// We never want tests to hit a real DB. Replace pool.query with a mock that
// each test case configures via `setMock(...)`, and restore in after().
type QueryResult = { rows: unknown[] };
type QueryMock = (text: string, params?: unknown[]) => Promise<QueryResult>;

const origQuery = pool.query.bind(pool);
let queryMock: QueryMock | null = null;
let queryCalls: Array<{ text: string; params?: unknown[] }> = [];

function setMock(fn: QueryMock) {
  queryMock = fn;
}

before(() => {
  (pool as unknown as { query: QueryMock }).query = async (text, params) => {
    queryCalls.push({ text, params });
    if (!queryMock) throw new Error('pool.query called in test without a mock');
    return queryMock(text, params);
  };
});

after(async () => {
  (pool as unknown as { query: typeof origQuery }).query = origQuery;
  // End the pool so the process exits cleanly even if a lazy connection opened.
  await pool.end().catch(() => {});
});

beforeEach(() => {
  // Rate limit state is in-memory; reset the keys supertest would use so
  // separate cases don't share budget.
  feedbackLimiter.resetKey('::ffff:127.0.0.1');
  feedbackLimiter.resetKey('127.0.0.1');
  queryMock = null;
  queryCalls = [];
});

describe('POST /feedback', () => {
  test('201 and returns { id } on valid submission', async () => {
    setMock(async () => ({ rows: [{ id: 42 }] }));
    const app = buildApp();

    const res = await request(app)
      .post('/feedback')
      .set('User-Agent', 'jest-test-agent/1.0')
      .send({ comment: 'Great site!', page_context: 'results' });

    assert.equal(res.status, 201);
    assert.deepEqual(res.body, { id: 42 });
    assert.equal(queryCalls.length, 1);
    const params = queryCalls[0].params as unknown[];
    assert.equal(params[0], 'Great site!');
    assert.equal(params[1], null); // email not provided
    assert.equal(params[2], 'results');
    assert.equal(params[3], null); // metadata not provided
    assert.equal(params[4], 'jest-test-agent/1.0');
  });

  test('persists metadata as JSON string and email when provided', async () => {
    setMock(async () => ({ rows: [{ id: 1 }] }));
    const app = buildApp();

    const res = await request(app)
      .post('/feedback')
      .send({
        comment: 'nice',
        email: 'veteran@example.com',
        page_context: 'footer',
        metadata: { source: 'homepage', count: 3 },
      });

    assert.equal(res.status, 201);
    const params = queryCalls[0].params as unknown[];
    assert.equal(params[1], 'veteran@example.com');
    assert.equal(params[2], 'footer');
    assert.equal(typeof params[3], 'string');
    assert.deepEqual(JSON.parse(params[3] as string), { source: 'homepage', count: 3 });
  });

  test('400 when comment is missing', async () => {
    const app = buildApp();
    const res = await request(app).post('/feedback').send({ page_context: 'results' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'Invalid request body');
  });

  test('400 when comment is empty string', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/feedback')
      .send({ comment: '', page_context: 'results' });
    assert.equal(res.status, 400);
  });

  test('400 when comment exceeds 2000 chars', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'x'.repeat(2001), page_context: 'results' });
    assert.equal(res.status, 400);
  });

  test('400 when page_context is not whitelisted', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'hi', page_context: 'dashboard' });
    assert.equal(res.status, 400);
  });

  test('400 when email is malformed', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'hi', email: 'not-an-email', page_context: 'results' });
    assert.equal(res.status, 400);
  });

  test('accepts a 2000-char comment (boundary)', async () => {
    setMock(async () => ({ rows: [{ id: 9 }] }));
    const app = buildApp();
    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'x'.repeat(2000), page_context: 'results' });
    assert.equal(res.status, 201);
  });

  test('429 on the 6th submission within the window', async () => {
    setMock(async () => ({ rows: [{ id: 1 }] }));
    const app = buildApp();

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app)
        .post('/feedback')
        .send({ comment: `msg ${i}`, page_context: 'results' });
      assert.equal(res.status, 201, `request ${i + 1} should succeed`);
    }

    const blocked = await request(app)
      .post('/feedback')
      .send({ comment: 'one too many', page_context: 'results' });
    assert.equal(blocked.status, 429);
  });

  test('500 with generic message when DB fails', async () => {
    setMock(async () => {
      throw new Error('connection refused');
    });
    // buildApp() has no global error handler; mount a minimal one here so the
    // route's next(error) path lands in JSON rather than express's default HTML.
    const app = buildApp();
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      res.status(500).json({ error: 'Internal server error' });
    });

    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'hi', page_context: 'results' });
    assert.equal(res.status, 500);
    assert.equal(res.body.error, 'Internal server error');
  });
});
