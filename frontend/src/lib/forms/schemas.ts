import { z } from 'zod/v4';
const required = z.string().trim().min(1, 'validationRequired');
const email = required.max(254, 'validationEmail').email('validationEmail');
const password = z
  .string()
  .min(12, 'validationPasswordLength')
  .max(128, 'validationPasswordLength');
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'validationRequired').max(128, 'validationPasswordLength'),
});
export const agentSchema = z.object({
  name: required.max(100, 'validationNameMax'),
  email,
  password,
});
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'validationRequired').max(128, 'validationPasswordLength'),
    newPassword: password,
    confirm: z.string().min(1, 'validationRequired'),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'validationPasswordMatch',
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    path: ['newPassword'],
    message: 'validationDifferentPassword',
  });
export const orderSchema = z
  .object({
    customerName: required.max(150, 'validationNameMax'),
    customerEmail: email,
    items: z
      .array(
        z.object({
          productId: required,
          quantity: z
            .number({ error: 'validationQuantity' })
            .int('validationQuantity')
            .min(1, 'validationQuantity')
            .max(1000, 'validationQuantity'),
          expectedUnitPriceMinor: z.number().int().positive('validationProductRequired'),
        }),
      )
      .min(1)
      .max(5),
  })
  .superRefine((v, ctx) => {
    const seen = new Set<string>();
    v.items.forEach((item, index) => {
      if (item.productId && seen.has(item.productId))
        ctx.addIssue({
          code: 'custom',
          path: ['items', index, 'productId'],
          message: 'validationDuplicateProduct',
        });
      seen.add(item.productId);
    });
  });
export const pageSchema = (max: number) =>
  z.object({
    page: z
      .number({ error: 'validationPageRange' })
      .int('validationPageRange')
      .min(1, 'validationPageRange')
      .max(max, 'validationPageRange'),
  });
