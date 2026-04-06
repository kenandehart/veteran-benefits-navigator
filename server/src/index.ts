import express from 'express';
import pool from './db.js';
import { checkEligibility } from './eligibility.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.set('json spaces', 2)

app.use(express.json());

app.use((_req, res, next) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Headers', 'Content-Type');
res.header('Access-Control-Allow-Methods', 'GET, POST');
next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/benefits', async (_req, res) => {
  try{
    const result = await pool.query('SELECT * FROM benefits');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch benefits' });
  }
});

app.post('/questionnaire', async (req, res) => {
  const answers = req.body;

  // Basic validation — does it have the shape we expect?
  if (!answers || !Array.isArray(answers.servicePeriods)) {
    res.status(400).json({ error: 'Invalid questionnaire data' });
    return;
  }

  try {
    const result = await pool.query('SELECT * FROM eligibility_requirements');
    const eligibleBenefitIds = checkEligibility(answers, result.rows);
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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
