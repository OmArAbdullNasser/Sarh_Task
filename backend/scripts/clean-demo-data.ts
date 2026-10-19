import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { env } from '../src/config/env.js';
import { Order } from '../src/modules/orders/order.model.js';
import { User } from '../src/modules/users/user.model.js';
import { normalizeSearch } from '../src/lib/text.js';
import { demoCustomer } from './demo-customers.js';

if (env.NODE_ENV !== 'development') throw new Error('Demo cleanup is development-only.');
const apply = process.argv.includes('--apply');
try {
  await connectDatabase();
  if (mongoose.connection.name !== 'sarh_orders')
    throw new Error('Cleanup only supports the local sarh_orders database.');
  const agent = await User.findOne({ email: 'agent@sarh.local' }).orFail().lean();
  const seedFilter = {
    state: 'committed' as const,
    createdBy: agent._id,
    customerEmail: /^(omar|ahmed|sara|nour|customer)\.\d+@example\.com$/,
  };
  const fixtureFilter = {
    state: 'committed' as const,
    customerName: 'تجربة واجهة صرح',
    customerEmail: 'ui.demo@example.com',
  };
  const [seeded, uiFixture] = await Promise.all([
    Order.countDocuments(seedFilter),
    Order.countDocuments(fixtureFilter),
  ]);
  console.log(
    JSON.stringify({ mode: apply ? 'apply' : 'preview', seededNames: seeded, uiFixture }),
  );
  if (apply) {
    const backup = {
      orders: await Order.find({ $or: [seedFilter, fixtureFilter] })
        .select('_id customerName customerEmail customerNameSearch customerEmailSearch')
        .lean(),
      users: await User.find({ email: { $in: ['admin@sarh.local', 'agent@sarh.local'] } })
        .select('_id name')
        .lean(),
    };
    await mkdir('.local', { recursive: true });
    const backupPath = `.local/demo-names-${Date.now()}.json`;
    await writeFile(backupPath, JSON.stringify(backup), { flag: 'wx', mode: 0o600 });
    console.log(`Local name backup: ${backupPath}`);
    const before = await Order.aggregate([
      { $match: { state: 'committed' } },
      { $group: { _id: null, count: { $sum: 1 }, totalMinor: { $sum: '$totalMinor' } } },
    ]);
    let operations = [];
    for await (const order of Order.find(seedFilter).select('_id customerEmail').lean().cursor()) {
      const index = Number(order.customerEmail!.match(/\.(\d+)@example\.com$/)![1]);
      const customer = demoCustomer(index);
      operations.push({
        updateOne: {
          filter: { _id: order._id, customerEmail: order.customerEmail },
          update: {
            $set: {
              ...customer,
              customerNameSearch: normalizeSearch(customer.customerName),
              customerEmailSearch: normalizeSearch(customer.customerEmail),
            },
          },
        },
      });
      if (operations.length === 1000) {
        await Order.bulkWrite(operations);
        operations = [];
      }
    }
    if (operations.length) await Order.bulkWrite(operations);
    await Order.updateMany(fixtureFilter, {
      $set: {
        customerName: 'عبدالله العتيبي',
        customerEmail: 'abdullah.alotaibi@example.com',
        customerNameSearch: normalizeSearch('عبدالله العتيبي'),
        customerEmailSearch: 'abdullah.alotaibi@example.com',
      },
    });
    await User.updateOne(
      { email: 'admin@sarh.local', name: 'Demo Admin' },
      { $set: { name: 'عبدالله العتيبي' } },
    );
    await User.updateOne(
      { email: 'agent@sarh.local', name: 'Demo Agent' },
      { $set: { name: 'خالد الدوسري' } },
    );
    const after = await Order.aggregate([
      { $match: { state: 'committed' } },
      { $group: { _id: null, count: { $sum: 1 }, totalMinor: { $sum: '$totalMinor' } } },
    ]);
    assert.deepEqual(after, before, 'Cleanup must preserve order count and money.');
    const mixedNames = await Order.countDocuments({
      state: 'committed',
      $and: [{ customerName: /[A-Za-z]/ }, { customerName: /[؀-ۿ]/ }],
    });
    assert.equal(mixedNames, 0);
    assert.equal(await Order.countDocuments(fixtureFilter), 0);
    console.log(JSON.stringify({ verified: true, mixedNames, countAndMoneyPreserved: true }));
  }
} finally {
  await disconnectDatabase();
}
