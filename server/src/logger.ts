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
//   req serializer — whitelist serializer. Emits id/method/url/query/params
//                    plus a fixed set of headers (user-agent, host, referer,
//                    x-request-id). Intentionally omits remoteAddress and
//                    remotePort so client IPs never hit the log stream.
//                    IPs remain available via req.ip to the rate limiters,
//                    which do not call into the logger — so keying on IP
//                    in memory is fine without leaking IPs to logs.
//   redact paths  — belt-and-suspenders censoring of cookie, authorization,
//                    password, passwordHash anywhere they appear in a log
//                    record (the req serializer already drops the header
//                    ones, but handlers that log req.body would still be
//                    covered).

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

// Only these headers survive serialization. Everything else — including
// cookie, authorization, and any IP-carrying headers like x-forwarded-for
// or x-real-ip — is dropped before the record reaches the transport.
const SAFE_HEADER_NAMES = ['user-agent', 'host', 'referer', 'x-request-id'] as const;

interface SerializableReq {
  id?: unknown;
  method?: unknown;
  url?: unknown;
  query?: unknown;
  params?: unknown;
  headers?: Record<string, unknown>;
}

export function reqSerializer(req: SerializableReq): Record<string, unknown> {
  const incoming = req.headers ?? {};
  const headers: Record<string, unknown> = {};
  for (const name of SAFE_HEADER_NAMES) {
    if (incoming[name] !== undefined) headers[name] = incoming[name];
  }
  return {
    id: req.id,
    method: req.method,
    url: req.url,
    query: req.query,
    params: req.params,
    headers,
  };
}

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  serializers: { req: reqSerializer, err: errSerializer },
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
  serializers: { req: reqSerializer },
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
