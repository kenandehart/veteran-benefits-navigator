import express from 'express';
import pool from './db.js';

const app = express();
const PORT = 3000;

app.set('json spaces', 2)

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

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
