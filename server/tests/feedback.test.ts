import test, { before, beforeEach, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import express from 'express';
import pool from '../src/db.js';
import feedbackRouter from '../src/routes/feedback.js';
import { feedbackLimiter } from '../src/middleware/rateLimit.js';
import { httpLogger } from '../src/logger.js';

// Stub session shape matching the express-session augmentation in
// src/types/session.d.ts. An empty object represents an anonymous visitor
// (no userId); supplying { userId } simulates a logged-in user.
type SessionStub = { userId?: number; username?: string };

function buildApp(session: SessionStub = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.use(httpLogger);
  app.use(express.json());
  // Fake express-session so req.session.userId is readable in the route.
  // Real express-session would attach a Session instance here; the route
  // only touches .userId so a plain object is enough.
  app.use((req, _res, next) => {
    (req as unknown as { session: SessionStub }).session = { ...session };
    next();
  });
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
    assert.equal(params[5], null); // anonymous session → user_id NULL
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
    assert.equal(params[5], null);
  });

  test('inserts NULL user_id when session is anonymous', async () => {
    setMock(async () => ({ rows: [{ id: 1 }] }));
    const app = buildApp(); // no session userId

    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'hi', page_context: 'results' });

    assert.equal(res.status, 201);
    const params = queryCalls[0].params as unknown[];
    assert.strictEqual(params[5], null);
  });

  test('inserts user_id from req.session.userId when logged in', async () => {
    setMock(async () => ({ rows: [{ id: 1 }] }));
    const app = buildApp({ userId: 42, username: 'vet' });

    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'thanks', page_context: 'results' });

    assert.equal(res.status, 201);
    const params = queryCalls[0].params as unknown[];
    assert.strictEqual(params[5], 42);
  });

  test('400 when body includes user_id (strict schema rejects client-supplied user_id)', async () => {
    const app = buildApp();
    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'hi', page_context: 'results', user_id: 999 });
    assert.equal(res.status, 400);
    // No DB call should have happened; validation rejects before the handler runs.
    assert.equal(queryCalls.length, 0);
  });

  test('client-supplied user_id cannot override session value (anon session + body user_id → rejected)', async () => {
    const app = buildApp(); // anonymous
    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'sneaky', page_context: 'results', user_id: 1 });
    // Strict schema rejects; no row inserted.
    assert.equal(res.status, 400);
    assert.equal(queryCalls.length, 0);
  });

  test('logged-in results submission persists small metadata + session user_id', async () => {
    setMock(async () => ({ rows: [{ id: 1 }] }));
    const app = buildApp({ userId: 7 });

    const res = await request(app)
      .post('/feedback')
      .send({
        comment: 'love it',
        page_context: 'results',
        metadata: { matched_benefit_ids: [1, 4, 6] },
      });

    assert.equal(res.status, 201);
    const params = queryCalls[0].params as unknown[];
    assert.strictEqual(params[5], 7);
    assert.equal(typeof params[3], 'string');
    assert.deepEqual(JSON.parse(params[3] as string), { matched_benefit_ids: [1, 4, 6] });
  });

  test('anonymous results submission persists full answers metadata + NULL user_id', async () => {
    setMock(async () => ({ rows: [{ id: 1 }] }));
    const app = buildApp(); // anonymous
    // Realistic shape for an anon results-page submission.
    const answers = {
      servicePeriods: [{ entryDate: '2001-01-01', separationDate: '2005-01-01' }],
      disabilityRating: 70,
      incomeBelowLimit: true,
    };

    const res = await request(app)
      .post('/feedback')
      .send({ comment: 'thanks', page_context: 'results', metadata: answers });

    assert.equal(res.status, 201);
    const params = queryCalls[0].params as unknown[];
    assert.strictEqual(params[5], null);
    assert.deepEqual(JSON.parse(params[3] as string), answers);
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
