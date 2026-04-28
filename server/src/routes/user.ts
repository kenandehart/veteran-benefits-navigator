import { Router } from 'express';
import pool from '../db.js';
import { checkEligibility } from '../eligibility.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateBody.js';
import { UserResultsUpdateSchema, type UserResultsUpdate } from '../schemas.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
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
      application_guidance: string;
      application_url: string;
      eligibility_url: string;
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
         b.url,
         b.application_guidance,
         b.application_url,
         b.eligibility_url
       FROM user_questionnaire uq
       JOIN benefits b
         ON b.id = ANY(ARRAY(SELECT jsonb_array_elements_text(uq.matched_benefit_ids)::integer))
       WHERE uq.user_id = $1`,
      [req.session.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'No saved results found' });
      return;
    }

    res.json({
      answers: result.rows[0].answers,
      updatedAt: result.rows[0].updated_at,
      matchedBenefits: result.rows.map(({ answers: _a, updated_at: _u, ...benefit }) => benefit),
    });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch user results');
    next(error);
  }
});

router.put('/', writeLimiter, validateBody(UserResultsUpdateSchema), requireAuth, async (req, res, next) => {
  const { answers } = req.body as UserResultsUpdate;
  const matchedBenefitIds = checkEligibility(answers);

  // Transactioned so a completion event is only recorded if the main save
  // commits. Every call logs a completion — first save and retakes both
  // count as independent events in the append-only log.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO user_questionnaire (user_id, answers, matched_benefit_ids)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET answers = EXCLUDED.answers,
                     matched_benefit_ids = EXCLUDED.matched_benefit_ids,
                     updated_at = NOW()`,
      [req.session.userId, JSON.stringify(answers), JSON.stringify(matchedBenefitIds)]
    );
    await client.query(`INSERT INTO questionnaire_completions DEFAULT VALUES`);
    await client.query('COMMIT');

    res.json({ message: 'Results saved' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    req.log.error({ err: error }, 'Failed to save results');
    next(error);
  } finally {
    client.release();
  }
});

export default router;
