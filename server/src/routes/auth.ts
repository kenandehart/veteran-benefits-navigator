import { Router } from 'express';
import bcrypt from 'bcrypt';
import { DatabaseError } from 'pg';
import pool from '../db.js';

const router = Router();

router.post('/register', async (req, res) => {
  const { username, password, email } = req.body as {
    username?: string;
    password?: string;
    email?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

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
      [username, passwordHash, email ?? null]
    );

    const user = result.rows[0];
    req.session.userId = user.id;
    req.session.username = user.username;
    res.status(201).json(user);
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
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

const DUMMY_HASH = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';

router.post('/login', async (req, res) => {
  const { username, password } = req.body as {
    username?: string;
    password?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  try {
    const result = await pool.query<{
      id: number;
      username: string;
      email: string | null;
      created_at: Date;
      password_hash: string;
    }>(
      'SELECT id, username, email, created_at, password_hash FROM users WHERE username = $1',
      [username]
    );

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

    if (!user || !passwordMatch) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ id: user.id, username: user.username, email: user.email, created_at: user.created_at });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Logout failed' });
      return;
    }
    res.json({ message: 'Logged out successfully' });
  });
});

router.get('/me', async (req, res) => {
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

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
