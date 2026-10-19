import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { orderRoutes } from './modules/orders/order.routes.js';
import { productRoutes } from './modules/products/product.routes.js';
import { authenticate, requirePasswordChanged } from './middleware/authenticate.js';
import { csrfProtection } from './middleware/csrf.js';
import { errorHandler } from './middleware/error-handler.js';
import { docsRoutes } from './docs/docs.routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(docsRoutes);
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api', csrfProtection);
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.get('/api/health', (_req, res) => {
    const ok = mongoose.connection.readyState === 1;
    res.status(ok ? 200 : 503).json({ ok });
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/orders', authenticate, requirePasswordChanged, orderRoutes);
  app.use('/api/products', authenticate, requirePasswordChanged, productRoutes);
  app.use('/api/users', authenticate, requirePasswordChanged, userRoutes);
  app.use((_req, res) => { res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }); });
  app.use(errorHandler);
  return app;
}
