import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().startsWith('mongodb').default('mongodb://127.0.0.1:27018/sarh_orders'),
  JWT_SECRET: z.string().min(32),
  APP_ORIGINS: z.string().default('http://localhost:5173,http://localhost:4000'),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // Field names only: never log secret values.
  throw new Error(
    `Invalid environment configuration: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`,
  );
}
export const env = parsed.data;
export const allowedOrigins = new Set(
  env.APP_ORIGINS.split(',').map((s) => new URL(s.trim()).origin),
);
