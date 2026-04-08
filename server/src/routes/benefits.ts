import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/benefits', async (_req, res) => {
  try{
    const result = await pool.query('SELECT * FROM benefits');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch benefits' });
  }
});

export default router;
