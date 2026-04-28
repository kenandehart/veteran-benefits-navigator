import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/benefits', async (req, res, next) => {
  try{
    const result = await pool.query('SELECT * FROM benefits');
    res.json(result.rows);
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch benefits');
    next(error);
  }
});

router.get('/benefits/:slug', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM benefits WHERE slug = $1', [req.params.slug]);
    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Benefit not found' });
      return;
    }
    res.json(result.rows[0]);
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch benefit by slug');
    next(error);
  }
});

export default router;
