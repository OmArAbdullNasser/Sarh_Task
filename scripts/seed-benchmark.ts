import { ObjectId } from 'mongodb';
import { client, orders, type Order } from './benchmark-db.ts';

// Deterministic synthetic fixtures, not customer data. Never touches application collections.
let state = 20261019;
const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
const pick = <T>(values: T[]): T => values[Math.floor(random() * values.length)];
const first = ['Omar', 'Ahmed', 'Mohamed', 'Sara', 'Nour', 'Mariam', 'Khaled', 'Youssef', 'عمر', 'أحمد', 'سارة', 'مريم'];
const last = ['Hassan', 'Ali', 'Mostafa', 'Ibrahim', 'Farouk', 'Salem', 'حسن', 'علي', 'إبراهيم'];
const states = ['pending', 'processing', 'completed', 'cancelled'];

try {
  await client.connect();
  if (await orders.estimatedDocumentCount() !== 0) {
    throw new Error('Benchmark collection is not empty; refusing to overwrite existing data.');
  }
  for (let batch = 0; batch < 50; batch++) {
    const docs: Order[] = [];
    for (let offset = 0; offset < 1000; offset++) {
      const index = batch * 1000 + offset;
      const name = `${pick(first)} ${pick(last)}`;
      const items = Array.from({ length: 1 + Math.floor(random() * 5) }, () => {
        const productId = Math.floor(random() * 30);
        return {
          productId, name: `Product ${productId}`,
          quantity: 1 + Math.floor(random() * 5), unitPriceMinor: 500 + productId * 1375,
        };
      });
      docs.push({
        _id: new ObjectId(index.toString(16).padStart(24, '0')),
        customerName: name,
        customerEmail: `${pick(['omar', 'ahmed', 'sara', 'nour', 'customer'])}.${index}@${pick(['example.com', 'example.net', 'example.org'])}`,
        status: pick(states),
        totalMinor: items.reduce((sum, item) => sum + item.quantity * item.unitPriceMinor, 0),
        createdAt: new Date(Date.UTC(2026, 0, 1) + Math.floor(random() * 290 * 86400000)),
        deletedAt: random() < 0.05 ? new Date('2026-10-18T00:00:00Z') : null,
        items,
      });
    }
    await orders.insertMany(docs);
  }
  console.log(JSON.stringify({ database: orders.namespace, count: await orders.countDocuments({}) }));
} finally { await client.close(); }
