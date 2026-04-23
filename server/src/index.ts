import express, { type ErrorRequestHandler } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import cors from 'cors';
import helmet from 'helmet';
import pool from './db.js';
import { logger, httpLogger } from './logger.js';
import healthRouter from './routes/health.js';
import benefitsRouter from './routes/benefits.js';
import questionnaireRouter from './routes/questionnaire.js';
import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import feedbackRouter from './routes/feedback.js';
import adminFeedbackRouter from './routes/adminFeedback.js';

const app = express();
app.set('trust proxy', 1);

const PORT = parseInt(process.env.PORT || '3000', 10);

const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  logger.fatal('SESSION_SECRET must be set to a value of at least 32 characters.');
  throw new Error(
    'SESSION_SECRET must be set to a value of at least 32 characters. Refusing to start.'
  );
}

const ALLOWED_ORIGINS = [process.env.APP_ORIGIN, process.env.STAGING_ORIGIN]
  .filter((o): o is string => !!o);
if (ALLOWED_ORIGINS.length === 0) {
  logger.fatal('At least one of APP_ORIGIN or STAGING_ORIGIN must be set.');
  throw new Error(
    'At least one of APP_ORIGIN or STAGING_ORIGIN must be set. Refusing to start.'
  );
}

app.set('json spaces', 2)

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // Fonts are self-hosted via @fontsource, so no CDN origins need allowing.
      // 'unsafe-inline' on style-src stays for inline styles React emits.
      'style-src': ["'self'", "'unsafe-inline'"],
      'font-src': ["'self'", 'data:'],
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

app.use(httpLogger);

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
app.use('/feedback', feedbackRouter);
app.use('/admin/feedback', adminFeedbackRouter);

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const errLike = err as Error & { statusCode?: number; status?: number };
  const statusCode = errLike.statusCode ?? errLike.status ?? 500;

  req.log.error({ err }, 'Unhandled error');

  const rawMessage = typeof errLike.message === 'string' ? errLike.message : '';
  const safeMessage =
    statusCode >= 400 &&
    statusCode < 500 &&
    rawMessage.length > 0 &&
    rawMessage.length < 200 &&
    !rawMessage.includes('\n')
      ? rawMessage
      : 'Internal server error';

  res.status(statusCode).json({
    error: safeMessage,
    requestId: req.id,
  });
};
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server listening');
});
