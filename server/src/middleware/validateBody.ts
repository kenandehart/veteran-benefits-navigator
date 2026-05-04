import type { RequestHandler } from 'express';
import { z } from 'zod';

const FIELD_LABELS: Record<string, string> = {
  username: 'Username',
  password: 'Password',
  newPassword: 'New password',
  email: 'Email',
  token: 'Reset token',
  comment: 'Feedback',
  identifier: 'Username or email',
};

function formatIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.map(String).join('.');
  const label = FIELD_LABELS[path] ?? (path || 'Request');
  return `${label}: ${issue.message}`;
}

// Replaces req.body with the parsed, shape-checked value on success.
// On failure, responds 400 with a user-facing message built from the first
// Zod issue (Zod orders issues by path, so the earliest field with a problem
// is the most relevant one to surface), plus the flattened issues object
// for clients that want field-level rendering. Logs at warn for observability.
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      req.log.warn({ issues: result.error.issues }, 'Request body validation failed');
      const first = result.error.issues[0];
      const error = first ? formatIssue(first) : 'Invalid request body';
      res.status(400).json({
        error,
        issues: z.flattenError(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
