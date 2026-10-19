import type { Request, RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { User } from '../modules/users/user.model.js';
import { cookieName, verifySession } from '../modules/auth/auth.token.js';

export interface AuthUser {
  id: string;
  role: 'admin' | 'agent';
  mustChangePassword: boolean;
  sessionVersion: number;
}
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return req.user;
}
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = req.cookies?.[cookieName];
  if (typeof token !== 'string') throw new AppError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  let claims;
  try {
    claims = verifySession(token);
  } catch {
    throw new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
  }
  // Read role and account state from DB, never trust an old role claim.
  const user = await User.findById(claims.sub).lean();
  if (!user?.active || user.sessionVersion !== claims.ver)
    throw new AppError(401, 'INVALID_SESSION', 'The session is invalid or expired.');
  req.user = {
    id: String(user._id),
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    sessionVersion: user.sessionVersion,
  };
  next();
};
export const requirePasswordChanged: RequestHandler = (req, _res, next) => {
  if (currentUser(req).mustChangePassword)
    throw new AppError(403, 'PASSWORD_CHANGE_REQUIRED', 'Change your initial password first.');
  next();
};
