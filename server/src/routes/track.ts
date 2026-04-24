import { Router } from 'express';
import pool from '../db.js';
import { pageviewLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateBody.js';
import { PageViewSchema, type PageView } from '../schemas.js';

const router = Router();

// Fire-and-forget pageview write. The client does not retry or surface
// failures; this endpoint mirrors that by returning 204 even on DB error so
// the browser treats a logged outage as success. All visibility into
// problems comes from server logs, not the response.
router.post('/pageview', pageviewLimiter, validateBody(PageViewSchema), async (req, res) => {
  const { path } = req.body as PageView;
  try {
    await pool.query(
      'INSERT INTO page_views (visitor_id, path) VALUES ($1, $2)',
      [req.visitorId, path]
    );
  } catch (err) {
    req.log.warn({ err }, 'pageview insert failed');
  }
  res.status(204).end();
});

export default router;
