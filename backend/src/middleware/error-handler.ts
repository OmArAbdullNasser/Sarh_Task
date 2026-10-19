import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, isDuplicateKey } from '../lib/errors.js';
export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Check the submitted fields.',
        details: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
    });
    return;
  }
  if (isDuplicateKey(error)) {
    res
      .status(409)
      .json({ error: { code: 'CONFLICT', message: 'A unique value is already in use.' } });
    return;
  }
  if (error && typeof error === 'object' && 'type' in error) {
    if (error.type === 'entity.parse.failed') {
      res
        .status(400)
        .json({ error: { code: 'INVALID_JSON', message: 'The JSON body is malformed.' } });
      return;
    }
    if (error.type === 'entity.too.large') {
      res
        .status(413)
        .json({ error: { code: 'BODY_TOO_LARGE', message: 'The request body is too large.' } });
      return;
    }
  }
  // Avoid logging bodies, cookies, JWTs, database connection strings or query parameters.
  console.error('Unhandled API error', error instanceof Error ? error.name : 'UnknownError');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Check the attempt status before retrying an order.',
    },
  });
};
