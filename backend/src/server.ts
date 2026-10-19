import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

await connectDatabase();
const server = createApp().listen(env.PORT, '127.0.0.1', () => console.log(`SARH API listening on http://localhost:${env.PORT}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => {
  server.close(() => { void disconnectDatabase().then(() => process.exit(0)); });
  setTimeout(() => process.exit(1), 10000).unref();
});
