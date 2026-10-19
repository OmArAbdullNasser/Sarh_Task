import { User, publicUserFields } from './user.model.js';
import { hashPassword } from '../../lib/password.js';
import { AppError } from '../../lib/errors.js';
export async function listAgents(page: number, pageSize: number) {
  const filter = { role: 'agent' as const };
  const [data, total] = await Promise.all([
    User.find(filter)
      .select(publicUserFields)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    User.countDocuments(filter),
  ]);
  return { data, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}
export async function createAgent(input: { name: string; email: string; password: string }) {
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: 'agent',
    active: true,
    mustChangePassword: true,
  });
  return User.findById(user._id).select(publicUserFields).lean();
}
export async function deactivateAgent(id: string) {
  const user = await User.findOneAndUpdate(
    { _id: id, role: 'agent' },
    { $set: { active: false }, $inc: { sessionVersion: 1 } },
    { returnDocument: 'after' },
  )
    .select(publicUserFields)
    .lean();
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Agent not found.');
  return user;
}
