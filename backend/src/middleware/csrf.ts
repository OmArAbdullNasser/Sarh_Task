import type { RequestHandler } from 'express';
import { allowedOrigins } from '../config/env.js';
import { AppError } from '../lib/errors.js';

// Browser writes must originate from the app, use JSON when a body is present,
// and carry a non-simple header. No permissive CORS middleware is installed.
export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) { next(); return; }
  if (!req.headers.origin || !allowedOrigins.has(req.headers.origin) || req.get('X-SARH-Request') !== '1') {
    throw new AppError(403, 'CSRF_REJECTED', 'The request origin or application header is invalid.');
  }
  if ((req.headers['content-length'] || req.headers['transfer-encoding']) && !req.is('application/json')) {
    throw new AppError(415, 'JSON_REQUIRED', 'Use application/json.');
  }
  next();
};
