// Structured logging for the API. Two exports:
//
//   logger     — a bare pino instance for module-scope logging (startup,
//                validation failures, app.listen callback). Use req.log
//                inside handlers instead so every line carries the reqId.
//   httpLogger — pino-http middleware. Attaches req.log (a child logger
//                scoped to the request) and req.id (UUID correlation ID
//                also returned in the X-Request-Id response header).
//
// Sensitive-field handling:
//   err serializer — strips err.parameters (pg-specific; holds query
//                    parameters including usernames, emails, password
//                    hashes, answers JSON) and err.config.
//   redact paths  — censors cookie, authorization, password, passwordHash
//                    anywhere they appear in a log record.

import pino from 'pino';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

function prettyTransportIfAvailable(): { target: string } | undefined {
  if (process.env.NODE_ENV === 'production') return undefined;
  try {
    nodeRequire.resolve('pino-pretty');
    return { target: 'pino-pretty' };
  } catch {
    return undefined;
  }
}

const baseErrSerializer = pino.stdSerializers.err;

function errSerializer(err: Error): Record<string, unknown> {
  const serialized: Record<string, unknown> = { ...baseErrSerializer(err) };
  delete serialized.parameters;
  delete serialized.config;
  return serialized;
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  serializers: { err: errSerializer },
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'req.body.password',
      'req.body.passwordHash',
    ],
    censor: '[REDACTED]',
  },
  transport: prettyTransportIfAvailable(),
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const incoming = req.headers['x-request-id'];
    const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
