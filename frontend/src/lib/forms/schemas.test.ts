import { expect, it } from 'vitest';
import { passwordSchema, pageSchema } from './schemas';
it('requires matching new passwords that differ from the current password', () => {
  const currentPassword = 'CurrentPassword123!';
  expect(
    passwordSchema.safeParse({
      currentPassword,
      newPassword: currentPassword,
      confirm: currentPassword,
    }).success,
  ).toBe(false);
  expect(
    passwordSchema.safeParse({
      currentPassword,
      newPassword: 'NewPassword123!',
      confirm: 'SomethingElse123!',
    }).success,
  ).toBe(false);
  expect(
    passwordSchema.safeParse({
      currentPassword,
      newPassword: 'NewPassword123!',
      confirm: 'NewPassword123!',
    }).success,
  ).toBe(true);
});
it('rejects empty, fractional and unavailable page numbers', () => {
  for (const page of [NaN, 0, 1.5, 11])
    expect(pageSchema(10).safeParse({ page }).success).toBe(false);
  expect(pageSchema(10).safeParse({ page: 10 }).success).toBe(true);
});
