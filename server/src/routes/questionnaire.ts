import { Router } from 'express';
import pool from '../db.js';
import { checkEligibility } from '../eligibility.js';
import { readLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateBody.js';
import { QuestionnaireAnswersSchema, type QuestionnaireAnswers } from '../schemas.js';

const router = Router();

router.post('/questionnaire', readLimiter, validateBody(QuestionnaireAnswersSchema), async (req, res, next) => {
  const answers = req.body as QuestionnaireAnswers;

  try {
    const eligibleBenefitIds = checkEligibility(answers);
    const benefitsResult = await pool.query(
      'SELECT id, slug, name, category, short_description, description, eligibility_summary, url, application_guidance, application_url, eligibility_url FROM benefits WHERE id = ANY($1)',
      [eligibleBenefitIds]
    );
    res.status(201).json({ eligibleBenefits: benefitsResult.rows });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to process questionnaire');
    next(error);
  }
});

export default router;
