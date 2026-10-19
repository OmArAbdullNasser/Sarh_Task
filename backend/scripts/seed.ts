import { randomUUID } from 'node:crypto';
import { Types } from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { Product } from '../src/modules/products/product.model.js';
import { Order } from '../src/modules/orders/order.model.js';
import { hashPassword } from '../src/lib/password.js';
import { normalizeSearch } from '../src/lib/text.js';
import { demoCustomer } from './demo-customers.js';

if (env.NODE_ENV === 'production')
  throw new Error('Development seed is not allowed in production.');
let state = 20261019;
const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
const pick = <T>(values: T[]) => values[Math.floor(random() * values.length)];
async function seed() {
  const existing = await Order.countDocuments();
  if (existing > 0) {
    console.log(
      `Seed skipped: ${existing} order/attempt records already exist. Existing data was preserved. Seed only populates an empty orders collection.`,
    );
    return;
  }
  const passwordHash = await hashPassword('SarhDemo2026!');
  for (const role of ['admin', 'agent'] as const) {
    await User.updateOne(
      { email: `${role}@sarh.local` },
      {
        $setOnInsert: {
          name: role === 'admin' ? 'عبدالله العتيبي' : 'خالد الدوسري',
          email: `${role}@sarh.local`,
          role,
          passwordHash,
          active: true,
          mustChangePassword: false,
          sessionVersion: 0,
        },
      },
      { upsert: true },
    );
  }
  const agent = await User.findOne({ email: 'agent@sarh.local' }).orFail().lean();
  const productNames = [
    'Notebook',
    'Desk lamp',
    'Keyboard',
    'Mouse',
    'Monitor stand',
    'USB cable',
    'Office chair',
    'Headphones',
    'Water bottle',
    'Backpack',
    'دفتر ملاحظات',
    'مصباح مكتب',
    'لوحة مفاتيح',
    'فأرة',
    'حامل شاشة',
    'كابل شحن',
    'كرسي مكتب',
    'سماعات',
    'زجاجة مياه',
    'حقيبة',
  ];
  for (let i = 0; i < productNames.length; i++) {
    await Product.updateOne(
      { sku: `SARH-${String(i + 1).padStart(3, '0')}` },
      {
        $setOnInsert: {
          sku: `SARH-${String(i + 1).padStart(3, '0')}`,
          name: productNames[i],
          nameSearch: normalizeSearch(productNames[i]),
          unitPriceMinor: 1250 + i * 1375,
          active: true,
        },
      },
      { upsert: true },
    );
  }
  const products = await Product.find({ active: true }).lean();
  const statuses = ['pending', 'processing', 'completed', 'cancelled'] as const;
  for (let batch = 0; batch < 50; batch++) {
    const documents = Array.from({ length: 1000 }, (_, offset) => {
      const index = batch * 1000 + offset;
      const { customerName, customerEmail } = demoCustomer(index);
      const start = Math.floor(random() * products.length);
      const items = Array.from({ length: 1 + Math.floor(random() * 5) }, (_, position) => {
        const product = products[(start + position) % products.length];
        return {
          productId: product._id,
          name: product.name,
          unitPriceMinor: product.unitPriceMinor,
          quantity: 1 + Math.floor(random() * 5),
        };
      });
      const createdAt = new Date(Date.UTC(2026, 0, 1) + Math.floor(random() * 290 * 86400000));
      return {
        _id: new Types.ObjectId(),
        operationKey: randomUUID(),
        createdBy: agent._id,
        activeAttempt: false,
        state: 'committed' as const,
        customerName,
        customerEmail,
        customerNameSearch: normalizeSearch(customerName),
        customerEmailSearch: normalizeSearch(customerEmail),
        status: pick([...statuses]),
        items,
        totalMinor: items.reduce((sum, item) => sum + item.quantity * item.unitPriceMinor, 0),
        currency: 'SAR' as const,
        createdAt,
        deletedAt: null,
      };
    });
    await Order.insertMany(documents);
  }
  console.log(
    JSON.stringify({
      orders: await Order.countDocuments({ state: 'committed' }),
      products: products.length,
      users: ['admin@sarh.local', 'agent@sarh.local'],
    }),
  );
}

try {
  await connectDatabase();
  await seed();
} finally {
  await disconnectDatabase();
}
