import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pool from './db.js';
import healthRouter from './routes/health.js';
import benefitsRouter from './routes/benefits.js';
import questionnaireRouter from './routes/questionnaire.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';

const app = express();
app.set('trust proxy', 1);

const PORT = parseInt(process.env.PORT || '3000', 10);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    'SESSION_SECRET must be set to a value of at least 32 characters. Refusing to start.'
  );
}

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
  secret: SESSION_SECRET,
  name: 'vbn.sid',
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    // Secure cookies require HTTPS; local dev runs plain HTTP, so gate on NODE_ENV.
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  },
}));

app.use(healthRouter);
app.use(benefitsRouter);
app.use(questionnaireRouter);
app.use('/auth', authRouter);
app.use('/user/results', userRouter);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
