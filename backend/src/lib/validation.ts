import { z } from 'zod';
export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/).transform(s => s.toLowerCase());
export const password = z.string().min(12).max(128);
export const email = z.string().trim().max(254).email().transform(s => s.toLowerCase());
export const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
};
