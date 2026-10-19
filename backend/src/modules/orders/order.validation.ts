import { z } from 'zod';
import { email, objectId, pagination } from '../../lib/validation.js';
export const orderStatuses = ['pending', 'processing', 'completed', 'cancelled'] as const;
const amountBound = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(0).max(Number.MAX_SAFE_INTEGER))
  .optional();
export const listOrdersInput = z
  .object({
    ...pagination,
    search: z.string().trim().max(254).default(''),
    status: z.enum(orderStatuses).optional(),
    minTotalMinor: amountBound,
    maxTotalMinor: amountBound,
    sortBy: z.enum(['createdAt', 'totalMinor']).default('createdAt'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()
  .refine(
    (v) =>
      v.minTotalMinor === undefined ||
      v.maxTotalMinor === undefined ||
      v.minTotalMinor <= v.maxTotalMinor,
    { message: 'Minimum total must not exceed maximum.', path: ['maxTotalMinor'] },
  );
export const prepareAttemptInput = z.object({ previousAttemptId: objectId.optional() }).strict();
export const submissionInput = z
  .object({
    customerName: z.string().trim().min(1).max(150),
    customerEmail: email,
    items: z
      .array(
        z
          .object({
            productId: objectId,
            quantity: z.number().int().min(1).max(1000),
            expectedUnitPriceMinor: z.number().int().min(1).max(100000000),
          })
          .strict(),
      )
      .min(1)
      .max(5),
  })
  .strict()
  .refine(
    (input) => new Set(input.items.map((item) => item.productId)).size === input.items.length,
    { message: 'Combine duplicate products into one line.', path: ['items'] },
  );
export const createOrderInput = z.object({ attemptId: objectId, order: submissionInput }).strict();
export const idempotencyKey = z.string().uuid();
export type Submission = z.infer<typeof submissionInput>;
export type ListOrders = z.infer<typeof listOrdersInput>;
