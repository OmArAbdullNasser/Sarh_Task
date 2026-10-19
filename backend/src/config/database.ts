import mongoose from 'mongoose';
import { env } from './env.js';
import { User } from '../modules/users/user.model.js';
import { Product } from '../modules/products/product.model.js';
import { Order } from '../modules/orders/order.model.js';

mongoose.set('strictQuery', true);
export async function connectDatabase() {
  await mongoose.connect(env.MONGODB_URI, { autoIndex: false, serverSelectionTimeoutMS: 10000 });
  // Await unique indexes before accepting traffic. No destructive syncIndexes().
  await Promise.all([User.createIndexes(), Product.createIndexes(), Order.createIndexes()]);
}
export async function disconnectDatabase() { await mongoose.disconnect(); }
