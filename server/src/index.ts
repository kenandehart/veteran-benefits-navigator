import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pool from './db.js';
import healthRouter from './routes/health.js';
import questionnaireRouter from './routes/questionnaire.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.set('json spaces', 2)

app.use(express.json());

const PgSession = connectPgSimple(session);

app.use((_req, res, next) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Headers', 'Content-Type');
res.header('Access-Control-Allow-Methods', 'GET, POST');
next();
});

app.use(session({
  store: new PgSession({ pool }),
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
}));

app.use(healthRouter);
app.use(questionnaireRouter);

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
