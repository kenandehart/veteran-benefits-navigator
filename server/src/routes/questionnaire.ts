import { Router } from 'express';
import pool from '../db.js';
import { checkEligibility } from '../eligibility.js';
import { readLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/questionnaire', readLimiter, async (req, res) => {
  const answers = req.body;

  // Basic validation — does it have the shape we expect?
  if (!answers || !Array.isArray(answers.servicePeriods)) {
    res.status(400).json({ error: 'Invalid questionnaire data' });
    return;
  }

  try {
    const eligibleBenefitIds = checkEligibility(answers);
    const benefitsResult = await pool.query(
      'SELECT id, name, category, short_description, description, eligibility_summary, url FROM benefits WHERE id = ANY($1)',
      [eligibleBenefitIds]
    );
    res.status(201).json({ eligibleBenefits: benefitsResult.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process questionnaire' });
  }
});

export default router;
