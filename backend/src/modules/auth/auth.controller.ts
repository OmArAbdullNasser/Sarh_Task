import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { loginInput, changePasswordInput } from './auth.validation.js';
import { issueSession, clearSession } from './auth.token.js';
import * as service from './auth.service.js';

export async function login(req: Request, res: Response) {
  const input = loginInput.parse(req.body);
  const user = await service.login(input.email, input.password);
  issueSession(res, String(user._id), user.sessionVersion);
  res.json({ user: await service.me(String(user._id)) });
}
export async function logout(req: Request, res: Response) {
  await service.logout(currentUser(req)); clearSession(res); res.status(204).end();
}
export async function me(req: Request, res: Response) { res.json({ user: await service.me(currentUser(req).id) }); }
export async function changePassword(req: Request, res: Response) {
  const input = changePasswordInput.parse(req.body);
  const user = await service.changePassword(currentUser(req), input.currentPassword, input.newPassword);
  issueSession(res, String(user._id), user.sessionVersion);
  res.json({ user: await service.me(String(user._id)) });
}
