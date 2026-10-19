import { Router } from 'express';
import { requireAdmin } from '../../middleware/authorize.js';
import * as controller from './user.controller.js';
export const userRoutes = Router();
userRoutes.use(requireAdmin);
userRoutes.get('/', controller.list);
userRoutes.post('/', controller.create);
userRoutes.patch('/:id/deactivate', controller.deactivate);
