import type { RequestHandler } from 'express';
import { currentUser } from './authenticate.js';
import { AppError } from '../lib/errors.js';
export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (currentUser(req).role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'Administrator access is required.');
  next();
};
