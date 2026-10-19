import { z } from 'zod';
import { email, password, pagination } from '../../lib/validation.js';
export const createAgentInput = z
  .object({ name: z.string().trim().min(1).max(100), email, password })
  .strict();
export const listUsersInput = z.object(pagination).strict();
