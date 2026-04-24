import { Router } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import { DatabaseError } from 'pg';
import pool from '../db.js';
import { checkEligibility } from '../eligibility.js';
import { requireAuth } from '../middleware/auth.js';
import { authIpLimiter, authUserLimiter, readLimiter, resetRequestLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validateBody.js';
import { sendPasswordResetEmail, appUrl } from '../services/email.js';
import {
  RegisterBodySchema,
  LoginBodySchema,
  EmailUpdateSchema,
  RequestPasswordResetSchema,
  ResetPasswordSchema,
  type RegisterBody,
  type LoginBody,
  type EmailUpdate,
  type RequestPasswordReset,
  type ResetPassword,
} from '../schemas.js';

const router = Router();

router.post('/register', authIpLimiter, authUserLimiter, validateBody(RegisterBodySchema), async (req, res, next) => {
  const { username, password, email, answers } = req.body as RegisterBody;

  const normalizedUsername = username.toLowerCase();

  // Transactioned so that user + user_questionnaire + completion event all
  // land (or none do). Previously users and user_questionnaire were two
  // separate pool.query calls; this tightens that too as a side effect.
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await client.query('BEGIN');

    const result = await client.query<{
      id: number;
      username: string;
      email: string | null;
      created_at: Date;
    }>(
      `INSERT INTO users (username, password_hash, email)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, created_at`,
      [normalizedUsername, passwordHash, email ?? null]
    );

    const user = result.rows[0];

    const hasResults = answers !== undefined;
    if (hasResults) {
      const matchedBenefitIds = checkEligibility(answers);
      await client.query(
        `INSERT INTO user_questionnaire (user_id, answers, matched_benefit_ids)
         VALUES ($1, $2, $3)`,
        [user.id, JSON.stringify(answers), JSON.stringify(matchedBenefitIds)]
      );
      await client.query(`INSERT INTO questionnaire_completions DEFAULT VALUES`);
    }

    await client.query('COMMIT');

    req.session.userId = user.id;
    req.session.username = user.username;
    res.status(201).json({ ...user, hasResults });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error instanceof DatabaseError && error.code === '23505') {
      if (error.constraint === 'users_username_key') {
        res.status(409).json({ error: 'Username already taken' });
      } else if (error.constraint === 'users_email_key') {
        res.status(409).json({ error: 'Email already registered' });
      } else {
        res.status(409).json({ error: 'Duplicate value conflict' });
      }
      return;
    }
    req.log.error({ err: error }, 'Registration failed');
    next(error);
  } finally {
    client.release();
  }
});

const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

router.post('/login', authIpLimiter, authUserLimiter, validateBody(LoginBodySchema), async (req, res, next) => {
  const { username, password } = req.body as LoginBody;

  const normalizedUsername = username.toLowerCase();

  try {
    const result = await pool.query<{
      id: number;
      username: string;
      email: string | null;
      created_at: Date;
      password_hash: string;
    }>(
      'SELECT id, username, email, created_at, password_hash FROM users WHERE username = $1',
      [normalizedUsername]
    );

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !passwordMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const qResult = await pool.query(
      'SELECT 1 FROM user_questionnaire WHERE user_id = $1',
      [user.id]
    );

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ id: user.id, username: user.username, email: user.email, created_at: user.created_at, hasResults: qResult.rows.length > 0 });
  } catch (error) {
    req.log.error({ err: error }, 'Login failed');
    next(error);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      req.log.error({ err }, 'Failed to destroy session on logout');
      return next(err);
    }
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', readLimiter, async (req, res, next) => {
  if (!req.session.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  try {
    const result = await pool.query<{
      id: number;
      username: string;
      email: string | null;
      created_at: Date;
    }>(
      'SELECT id, username, email, created_at FROM users WHERE id = $1',
      [req.session.userId]
    );

    const user = result.rows[0];
    if (!user) {
      req.session.destroy(() => {});
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const qResult = await pool.query(
      'SELECT 1 FROM user_questionnaire WHERE user_id = $1',
      [user.id]
    );

    res.json({ ...user, hasResults: qResult.rows.length > 0 });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to fetch user');
    next(error);
  }
});

router.put('/email', authIpLimiter, authUserLimiter, validateBody(EmailUpdateSchema), requireAuth, async (req, res, next) => {
  const { email } = req.body as EmailUpdate;

  try {
    const result = await pool.query<{
      id: number;
      username: string;
      email: string | null;
      created_at: Date;
    }>(
      `UPDATE users SET email = $1 WHERE id = $2
       RETURNING id, username, email, created_at`,
      [email, req.session.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error instanceof DatabaseError && error.code === '23505' && error.constraint === 'users_email_key') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    req.log.error({ err: error }, 'Failed to update email');
    next(error);
  }
});

router.delete('/account', requireAuth, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.session.userId]);

    req.session.destroy((err) => {
      if (err) {
        // Account is already deleted — log but still respond success.
        req.log.warn({ err }, 'Failed to destroy session after account deletion');
      }
      res.json({ message: 'Account deleted' });
    });
  } catch (error) {
    req.log.error({ err: error }, 'Failed to delete account');
    next(error);
  }
});

router.post(
  '/request-reset',
  authIpLimiter,
  resetRequestLimiter,
  validateBody(RequestPasswordResetSchema),
  async (req, res, next) => {
    const { email } = req.body as RequestPasswordReset;
    const genericMessage = "If an account exists for that email, we've sent a reset link.";

    try {
      const userResult = await pool.query<{ id: number; email: string | null }>(
        'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
        [email],
      );
      const user = userResult.rows[0];

      if (user && user.email) {
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        await pool.query(
          `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
          [user.id, tokenHash],
        );

        const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
        try {
          await sendPasswordResetEmail(user.email, resetUrl);
        } catch (err) {
          req.log.error({ err }, 'Failed to send password reset email');
        }
      }

      res.json({ message: genericMessage });
    } catch (error) {
      req.log.error({ err: error }, 'Password reset request failed');
      next(error);
    }
  },
);

router.post(
  '/reset-password',
  authIpLimiter,
  validateBody(ResetPasswordSchema),
  async (req, res, next) => {
    const { token, newPassword } = req.body as ResetPassword;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const tokenResult = await client.query<{ id: number; user_id: number }>(
        `SELECT id, user_id FROM password_reset_tokens
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [tokenHash],
      );
      const tokenRow = tokenResult.rows[0];

      if (!tokenRow) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'Invalid or expired reset link' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
        passwordHash,
        tokenRow.user_id,
      ]);
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [tokenRow.id],
      );
      await client.query(
        "DELETE FROM session WHERE sess->>'userId' = $1::text",
        [tokenRow.user_id],
      );

      await client.query('COMMIT');

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      req.log.error({ err: error }, 'Password reset failed');
      next(error);
    } finally {
      client.release();
    }
  },
);

export default router;
