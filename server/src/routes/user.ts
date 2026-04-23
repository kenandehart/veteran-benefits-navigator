import { Router } from 'express';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const result = await pool.query<{
    answers: unknown;
    updated_at: string;
    id: number;
    name: string;
    category: string;
    short_description: string;
    description: string;
    eligibility_summary: string;
    url: string;
  }>(
    `SELECT
       uq.answers,
       uq.updated_at,
       b.id,
       b.name,
       b.category,
       b.short_description,
       b.description,
       b.eligibility_summary,
       b.url
     FROM user_questionnaire uq
     JOIN benefits b
       ON b.id = ANY(ARRAY(SELECT jsonb_array_elements_text(uq.matched_benefit_ids)::integer))
     WHERE uq.user_id = $1`,
    [req.session.userId]
  ).catch((error) => {
    console.error(error);
    return null;
  });

  if (!result) {
    res.status(500).json({ error: 'Failed to fetch results' });
    return;
  }

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'No saved results found' });
    return;
  }

  res.json({
    answers: result.rows[0].answers,
    updatedAt: result.rows[0].updated_at,
    matchedBenefits: result.rows.map(({ answers: _a, updated_at: _u, ...benefit }) => benefit),
  });
});

router.put('/', writeLimiter, requireAuth, async (req, res) => {
  const { answers, matchedBenefitIds } = req.body as {
    answers?: unknown;
    matchedBenefitIds?: unknown;
  };

  if (answers === undefined || matchedBenefitIds === undefined) {
    res.status(400).json({ error: 'answers and matchedBenefitIds are required' });
    return;
  }

  try {
    await pool.query(
      `INSERT INTO user_questionnaire (user_id, answers, matched_benefit_ids)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET answers = EXCLUDED.answers,
                     matched_benefit_ids = EXCLUDED.matched_benefit_ids,
                     updated_at = NOW()`,
      [req.session.userId, JSON.stringify(answers), JSON.stringify(matchedBenefitIds)]
    );

    res.json({ message: 'Results saved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to save results' });
  }
});

export default router;
