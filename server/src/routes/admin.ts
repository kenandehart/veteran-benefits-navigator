import { Router, type RequestHandler } from 'express';
import basicAuth from 'express-basic-auth';
import pool from '../db.js';
import { logger } from '../logger.js';

const ADMIN_USERNAME = 'admin';

// Fail-closed: when ADMIN_PASSWORD is unset, no credential will authenticate,
// so the admin routes remain inaccessible rather than silently open. We log
// at startup so the operator notices before trying to use the admin UI.
if (!process.env.ADMIN_PASSWORD) {
  logger.warn(
    'ADMIN_PASSWORD is not set — the admin endpoints will reject all requests.'
  );
}

export const adminAuth = basicAuth({
  authorizer: (username: string, password: string) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return false;
    // safeCompare prevents timing-leak of the correct password length/prefix.
    const userOk = basicAuth.safeCompare(username, ADMIN_USERNAME);
    const passOk = basicAuth.safeCompare(password, expected);
    return userOk && passOk;
  },
  challenge: true,
  realm: 'vbn-admin',
});

// Session cookie maxAge from index.ts — used to convert MAX(expire) into an
// approximation of "last active at". Kept as a local constant rather than
// imported so admin.ts stays decoupled from index.ts's session config.
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export const feedbackHandler: RequestHandler = async (req, res, next) => {
  try {
    const rowsResult = await pool.query<{
      id: number;
      comment: string;
      email: string | null;
      page_context: string;
      metadata: unknown;
      user_agent: string | null;
      user_id: number | null;
      submitted_at: Date;
    }>(
      `SELECT id, comment, email, page_context, metadata, user_agent, user_id, submitted_at
       FROM feedback
       ORDER BY submitted_at DESC`
    );

    const statsResult = await pool.query<{ total: string; last_7_days: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE submitted_at >= NOW() - INTERVAL '7 days')::text AS last_7_days
       FROM feedback`
    );

    const stats = statsResult.rows[0];

    res.json({
      feedback: rowsResult.rows,
      stats: {
        total: Number(stats.total),
        last_7_days: Number(stats.last_7_days),
      },
    });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch admin feedback');
    next(error);
  }
};

const accountsHandler: RequestHandler = async (req, res, next) => {
  try {
    // No pagination — returns all accounts in one response. Fine while the
    // user base is small; revisit (LIMIT/OFFSET or cursor) if this grows to
    // the point where a single JSON payload becomes heavy.
    const result = await pool.query<{
      id: number;
      username: string;
      email: string | null;
      created_at: Date;
      has_completed_questionnaire: boolean;
      matched_benefit_count: number;
      last_seen: Date | null;
    }>(
      `SELECT
         u.id,
         u.username,
         u.email,
         u.created_at,
         (uq.user_id IS NOT NULL) AS has_completed_questionnaire,
         COALESCE(jsonb_array_length(uq.matched_benefit_ids), 0)::int AS matched_benefit_count,
         (SELECT MAX(expire) FROM session
           WHERE sess->>'userId' = u.id::text) AS last_seen
       FROM users u
       LEFT JOIN user_questionnaire uq ON uq.user_id = u.id
       ORDER BY u.created_at DESC`
    );

    const accounts = result.rows.map((row) => ({
      ...row,
      // last_seen is session.expire (when the session would time out).
      // last_seen_adjusted subtracts the session maxAge so it approximates
      // the real "last active at" — this is what the UI should display.
      last_seen_adjusted:
        row.last_seen
          ? new Date(row.last_seen.getTime() - SESSION_MAX_AGE_MS).toISOString()
          : null,
    }));

    res.json({ accounts, total_count: accounts.length });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch admin accounts');
    next(error);
  }
};

const deleteAccountHandler: RequestHandler = async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // session has no user_id column — it's keyed by sid, with userId nested
    // inside the sess JSON blob. Delete via the JSON lookup.
    await client.query(
      `DELETE FROM session WHERE sess->>'userId' = $1::text`,
      [String(id)]
    );
    // Explicit user_questionnaire delete in case the FK is not ON DELETE
    // CASCADE (the table is not created by this repo's migrations, so the
    // FK behavior is not guaranteed). feedback.user_id is set to NULL via
    // its FK ON DELETE SET NULL, so we don't touch feedback here.
    await client.query(
      `DELETE FROM user_questionnaire WHERE user_id = $1`,
      [id]
    );
    const { rowCount } = await client.query(
      `DELETE FROM users WHERE id = $1`,
      [id]
    );
    await client.query('COMMIT');
    if (rowCount === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ deleted: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    req.log.error({ err: error, userId: id }, 'Failed to delete account');
    next(error);
  } finally {
    client.release();
  }
};

const analyticsHandler: RequestHandler = async (req, res, next) => {
  try {
    const [totalsRes, byDayRes, byMonthRes, topPathsRes] = await Promise.all([
      pool.query<{
        total_pageviews: number;
        unique_visitors: number;
        total_accounts: number;
        total_questionnaires_completed: number;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM page_views)::int AS total_pageviews,
           (SELECT COUNT(DISTINCT visitor_id) FROM page_views)::int AS unique_visitors,
           (SELECT COUNT(*) FROM users)::int AS total_accounts,
           (SELECT COUNT(*) FROM questionnaire_completions)::int AS total_questionnaires_completed`
      ),
      pool.query<{ date: Date; pageviews: number; unique_visitors: number }>(
        `SELECT
           DATE_TRUNC('day', viewed_at)::date AS date,
           COUNT(*)::int AS pageviews,
           COUNT(DISTINCT visitor_id)::int AS unique_visitors
         FROM page_views
         WHERE viewed_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY 1 DESC`
      ),
      pool.query<{ month: Date; pageviews: number; unique_visitors: number }>(
        `SELECT
           DATE_TRUNC('month', viewed_at)::date AS month,
           COUNT(*)::int AS pageviews,
           COUNT(DISTINCT visitor_id)::int AS unique_visitors
         FROM page_views
         WHERE viewed_at >= NOW() - INTERVAL '12 months'
         GROUP BY 1
         ORDER BY 1 DESC`
      ),
      pool.query<{ path: string; pageviews: number }>(
        `SELECT path, COUNT(*)::int AS pageviews
         FROM page_views
         GROUP BY path
         ORDER BY pageviews DESC
         LIMIT 10`
      ),
    ]);

    const totals = totalsRes.rows[0];
    res.json({
      total_pageviews: totals.total_pageviews,
      unique_visitors: totals.unique_visitors,
      total_accounts: totals.total_accounts,
      total_questionnaires_completed: totals.total_questionnaires_completed,
      pageviews_by_day: byDayRes.rows,
      pageviews_by_month: byMonthRes.rows,
      top_paths: topPathsRes.rows,
    });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch admin analytics');
    next(error);
  }
};

const router = Router();
router.use(adminAuth);
router.get('/feedback', feedbackHandler);
router.get('/accounts', accountsHandler);
router.delete('/accounts/:id', deleteAccountHandler);
router.get('/analytics', analyticsHandler);

export default router;
