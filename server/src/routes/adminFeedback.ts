import { Router } from 'express';
import basicAuth from 'express-basic-auth';
import pool from '../db.js';
import { logger } from '../logger.js';

const router = Router();

const ADMIN_USERNAME = 'admin';

// Fail-closed: when ADMIN_PASSWORD is unset, no credential will authenticate,
// so the endpoint remains inaccessible rather than silently open. We log at
// startup so the operator notices before trying to use the admin UI.
if (!process.env.ADMIN_PASSWORD) {
  logger.warn(
    'ADMIN_PASSWORD is not set — the admin feedback endpoint will reject all requests.'
  );
}

const adminAuth = basicAuth({
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

router.get('/', adminAuth, async (req, res, next) => {
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
});

export default router;
