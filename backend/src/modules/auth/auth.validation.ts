import { z } from 'zod';
import { email, password } from '../../lib/validation.js';
export const loginInput = z.object({ email, password: z.string().min(1).max(128) }).strict();
export const changePasswordInput = z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict()
  .refine(v => v.currentPassword !== v.newPassword, { message: 'Choose a different password.', path: ['newPassword'] });
