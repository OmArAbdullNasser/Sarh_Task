import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';

export const cookieName = 'sarh_session';
const claims = z.object({
  sub: z.string().regex(/^[a-f0-9]{24}$/),
  ver: z.number().int().nonnegative(),
});
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};
export function issueSession(res: Response, id: string, version: number) {
  const token = jwt.sign({ ver: version }, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: id,
    expiresIn: '8h',
    issuer: 'sarh-api',
    audience: 'sarh-console',
  });
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 });
}
export function clearSession(res: Response) {
  res.clearCookie(cookieName, cookieOptions);
}
export function verifySession(token: string) {
  return claims.parse(
    jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'sarh-api',
      audience: 'sarh-console',
    }),
  );
}
