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
    // Two-step lookup so we can distinguish "no questionnaire row" (404) from
    // "row exists with zero matches" (200 with empty matchedBenefits). A
    // single JOIN against benefits collapses the two cases together because
    // an empty matched_benefit_ids array yields zero rows.
    const questionnaireResult = await pool.query<{
      answers: unknown;
      matched_benefit_ids: number[];
      updated_at: string;
    }>(
      `SELECT answers, matched_benefit_ids, updated_at
       FROM user_questionnaire
       WHERE user_id = $1`,
      [req.session.userId]
    );

    if (questionnaireResult.rows.length === 0) {
      res.status(404).json({ error: 'No saved results found' });
      return;
    }

    const { answers, matched_benefit_ids, updated_at } = questionnaireResult.rows[0];

    let matchedBenefits: Array<{
      id: number;
      slug: string;
      name: string;
      category: string;
      short_description: string;
      description: string;
      eligibility_summary: string;
      url: string;
      application_guidance: string;
      application_url: string;
      eligibility_url: string;
    }> = [];

    if (matched_benefit_ids.length > 0) {
      const benefitsResult = await pool.query<typeof matchedBenefits[number]>(
        `SELECT id, slug, name, category, short_description, description,
                eligibility_summary, url, application_guidance, application_url,
                eligibility_url
         FROM benefits
         WHERE id = ANY($1::int[])`,
        [matched_benefit_ids]
      );
      matchedBenefits = benefitsResult.rows;
    }

    res.json({
      answers,
      updatedAt: updated_at,
      matchedBenefits,
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
