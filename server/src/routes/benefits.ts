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

export default router;
