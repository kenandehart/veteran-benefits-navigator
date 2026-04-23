import { Router } from 'express';
import pool from '../db.js';
import { feedbackLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateBody.js';
import { FeedbackSchema, type FeedbackBody } from '../schemas.js';

const router = Router();

// Cap on the user-agent string stored per row. Real UAs are ~200 chars;
// the header is untrusted and could be huge, so truncate before persisting.
const UA_MAX_LEN = 500;

router.post('/', feedbackLimiter, validateBody(FeedbackSchema), async (req, res, next) => {
  const { comment, email, page_context, metadata } = req.body as FeedbackBody;

  const rawUA = req.headers['user-agent'];
  const userAgent = typeof rawUA === 'string' ? rawUA.slice(0, UA_MAX_LEN) : null;

  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO feedback (comment, email, page_context, metadata, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        comment,
        email ?? null,
        page_context,
        metadata ? JSON.stringify(metadata) : null,
        userAgent,
      ]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to insert feedback');
    next(error);
  }
});

export default router;
