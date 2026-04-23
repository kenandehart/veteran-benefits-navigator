import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
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

const ALLOWED_ORIGINS = [process.env.APP_ORIGIN, process.env.STAGING_ORIGIN]
  .filter((o): o is string => !!o);
if (ALLOWED_ORIGINS.length === 0) {
  throw new Error(
    'At least one of APP_ORIGIN or STAGING_ORIGIN must be set. Refusing to start.'
  );
}

app.set('json spaces', 2)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'https://fonts.gstatic.com', 'data:'],
    },
  },
  // HSTS is set at the Nginx edge — disable here to avoid header conflicts.
  hsts: false,
}));

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json({ limit: '10kb' }));

const PgSession = connectPgSimple(session);

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
