import { User, publicUserFields } from '../users/user.model.js';
import { AppError } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import type { AuthUser } from '../../middleware/authenticate.js';

// Same work factor even when an email does not exist, to reduce timing disclosure.
const dummyHash = hashPassword('unused-dummy-password');
export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash').lean();
  const matches = await verifyPassword(password, user?.passwordHash ?? await dummyHash);
  if (!user?.active || !matches) throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.');
  return user;
}
export async function logout(user: AuthUser) {
  await User.updateOne({ _id: user.id, sessionVersion: user.sessionVersion }, { $inc: { sessionVersion: 1 } });
}
export async function changePassword(user: AuthUser, currentPassword: string, newPassword: string) {
  const stored = await User.findById(user.id).select('+passwordHash').lean();
  if (!stored || !await verifyPassword(currentPassword, stored.passwordHash)) {
    throw new AppError(400, 'WRONG_PASSWORD', 'The current password is incorrect.');
  }
  const updated = await User.findOneAndUpdate({ _id: user.id, active: true, sessionVersion: user.sessionVersion }, {
    $set: { passwordHash: await hashPassword(newPassword), mustChangePassword: false }, $inc: { sessionVersion: 1 },
  }, { returnDocument: 'after', runValidators: true }).lean();
  if (!updated) throw new AppError(401, 'INVALID_SESSION', 'Sign in again.');
  return updated;
}
export async function me(id: string) { return User.findById(id).select(publicUserFields).lean(); }
