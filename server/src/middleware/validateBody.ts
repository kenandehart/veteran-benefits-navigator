import type { RequestHandler } from 'express';
import { z } from 'zod';

// Replaces req.body with the parsed, shape-checked value on success.
// On failure, responds 400 with a flattened issues object and logs at
// warn (observability; not echoed to the client response beyond the
// flattened form, which is UI-friendly without leaking schema internals).
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      req.log.warn({ issues: result.error.issues }, 'Request body validation failed');
      res.status(400).json({
        error: 'Invalid request body',
        issues: z.flattenError(result.error),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
