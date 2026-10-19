import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

try {
  await writeFile('.env', [
    'NODE_ENV=development', 'PORT=4000', 'MONGODB_URI=mongodb://127.0.0.1:27018/sarh_orders',
    `JWT_SECRET=${randomBytes(48).toString('hex')}`, 'APP_ORIGINS=http://localhost:5173,http://localhost:4000', '',
  ].join('\n'), { flag: 'wx', mode: 0o600 });
  console.log('Created a local .env with a generated secret. Do not commit it.');
} catch (error) {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') console.log('.env already exists; preserved.');
  else throw error;
}
