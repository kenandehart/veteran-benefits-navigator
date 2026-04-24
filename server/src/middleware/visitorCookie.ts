import { randomBytes } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

// Type augmentation: downstream handlers can read req.visitorId.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      visitorId: string;
    }
  }
}

const COOKIE_NAME = 'vbn.visitor';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const HEX_32 = /^[0-9a-f]{32}$/;

// cookie-parser is not installed and adding it for a single read would be
// overkill. Parse manually: split on ';' to get pairs, split each pair on
// the FIRST '=' (values can contain '=' after that).
function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(/; */)) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

export default function visitorCookie(req: Request, res: Response, next: NextFunction): void {
  const existing = readCookie(req.headers.cookie, COOKIE_NAME);
  if (existing && HEX_32.test(existing)) {
    req.visitorId = existing;
    next();
    return;
  }

  const id = randomBytes(16).toString('hex');
  req.visitorId = id;
  res.cookie(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: ONE_YEAR_MS,
    path: '/',
  });
  next();
}
