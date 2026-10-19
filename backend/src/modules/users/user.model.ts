import { Schema, model, type InferSchemaType } from 'mongoose';
const schema = new Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['admin', 'agent'], required: true },
  active: { type: Boolean, required: true, default: true },
  mustChangePassword: { type: Boolean, required: true, default: false },
  sessionVersion: { type: Number, required: true, default: 0 },
}, { timestamps: true, versionKey: false });
schema.index({ email: 1 }, { unique: true });
export type UserRecord = InferSchemaType<typeof schema>;
export const User = model('User', schema);
export const publicUserFields = '_id name email role active mustChangePassword createdAt';
