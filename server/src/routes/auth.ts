import { Router } from 'express';
import bcrypt from 'bcrypt';
import { DatabaseError } from 'pg';
import pool from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { authIpLimiter, authUserLimiter, readLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authIpLimiter, authUserLimiter, async (req, res, next) => {
  const { username, password, email, answers, matchedBenefitIds } = req.body as {
    username?: string;
    password?: string;
    email?: string;
    answers?: unknown;
    matchedBenefitIds?: unknown;
  };

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const normalizedUsername = username.toLowerCase();

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query<{
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

    const hasResults = answers !== undefined && matchedBenefitIds !== undefined;
    if (hasResults) {
      await pool.query(
        `INSERT INTO user_questionnaire (user_id, answers, matched_benefit_ids)
         VALUES ($1, $2, $3)`,
        [user.id, JSON.stringify(answers), JSON.stringify(matchedBenefitIds)]
      );
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.status(201).json({ ...user, hasResults });
  } catch (error) {
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
  }
});

const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

router.post('/login', authIpLimiter, authUserLimiter, async (req, res, next) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

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

router.put('/email', authIpLimiter, authUserLimiter, requireAuth, async (req, res, next) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  if (!/^.+@.+\..+$/.test(email)) {
    res.status(400).json({ error: 'Invalid email format' });
    return;
  }

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

export default router;
