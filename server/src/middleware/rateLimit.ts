// express-rate-limit relies on req.ip reflecting the real client IP, which
// requires `app.set('trust proxy', 1)` in index.ts so the Nginx hop is
// accounted for. Without that, every request would look like it came from
// the loopback and one abusive client would burn everyone's quota.
//
// authIpLimiter caps horizontal attacks (rotating usernames from one IP).
// authUserLimiter caps vertical attacks (repeated attempts against one
// account). Stacking both on auth routes covers both axes — neither alone
// is sufficient against credential stuffing.
//
// All limiters use the default in-memory store. That resets on process
// restart and is not shared across Node processes — fine for our
// single-instance PM2 setup. Move to a Redis-backed store before scaling
// horizontally.

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

function authKey(req: Request): string {
  const body = (req.body ?? {}) as { username?: unknown; email?: unknown };
  const secondary =
    typeof body.username === 'string'
      ? body.username.toLowerCase()
      : typeof body.email === 'string'
        ? body.email.toLowerCase()
        : '';
  return `${ipKeyGenerator(req.ip ?? '')}::${secondary}`;
}

export const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKeyGenerator(req.ip ?? ''),
  skipSuccessfulRequests: false,
  message: { error: 'Too many attempts from this address. Please try again later.' },
});

export const authUserLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  keyGenerator: authKey,
  skipSuccessfulRequests: false,
  message: { error: 'Too many attempts for this account. Please try again later.' },
});

export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const userId = req.session.userId;
    return userId !== undefined
      ? `user:${userId}`
      : `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
  message: { error: 'Too many requests. Please slow down.' },
});
