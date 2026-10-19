import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate.js';
import * as controller from './auth.controller.js';
export const authRoutes = Router();
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_ATTEMPTS', message: 'Try again later.' } },
});
authRoutes.post('/login', loginLimit, controller.login);
authRoutes.use(authenticate);
authRoutes.get('/me', controller.me);
authRoutes.post('/logout', controller.logout);
authRoutes.post('/change-password', loginLimit, controller.changePassword);
