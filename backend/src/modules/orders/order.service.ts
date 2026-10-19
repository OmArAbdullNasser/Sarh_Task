import { createHash, randomUUID } from 'node:crypto';
import { Types, type QueryFilter } from 'mongoose';
import { Order } from './order.model.js';
import { Product } from '../products/product.model.js';
import { AppError, isDuplicateKey } from '../../lib/errors.js';
import { escapeRegex, normalizeSearch } from '../../lib/text.js';
import type { ListOrders, Submission } from './order.validation.js';

const visible = { state: 'committed' as const, deletedAt: null };
const publicFields =
  '_id createdBy customerName customerEmail status items totalMinor currency createdAt deletedAt';
const canonical = (input: Submission) => ({
  customerName: input.customerName,
  customerEmail: input.customerEmail,
  items: [...input.items].sort((a, b) => a.productId.localeCompare(b.productId)),
});
const fingerprint = (input: Submission) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(input)))
    .digest('hex');

export async function listOrders(query: ListOrders) {
  const filter: QueryFilter<unknown> = { ...visible };
  if (query.status) filter.status = query.status;
  if (query.search) {
    const prefix = `^${escapeRegex(normalizeSearch(query.search))}`;
    filter.$or = [
      { customerNameSearch: { $regex: prefix } },
      { customerEmailSearch: { $regex: prefix } },
    ];
  }
  const direction = query.direction === 'asc' ? 1 : -1;
  const [data, total] = await Promise.all([
    Order.find(filter)
      .select(publicFields)
      .sort({ [query.sortBy]: direction, _id: direction })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean(),
    Order.countDocuments(filter),
  ]);
  return {
    data,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  };
}
export async function getOrder(id: string) {
  const order = await Order.findOne({ _id: id, ...visible })
    .select(publicFields)
    .lean();
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
  return order;
}
export async function deleteOrder(id: string) {
  const result = await Order.updateOne(
    { _id: id, ...visible },
    { $set: { deletedAt: new Date() } },
  );
  if (!result.matchedCount) throw new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');
}

export async function currentAttempt(userId: string) {
  return Order.findOne({ createdBy: userId, activeAttempt: true })
    .select('_id operationKey state submission createdAt deletedAt updatedAt')
    .lean();
}
export async function prepareAttempt(userId: string, previousAttemptId?: string) {
  const current = await currentAttempt(userId);
  if (current) {
    if (!previousAttemptId || String(current._id) !== previousAttemptId) return current;
    if (current.state !== 'committed')
      throw new AppError(
        409,
        'ATTEMPT_UNRESOLVED',
        'Resolve the current attempt before starting another order.',
      );
    // Acknowledge a known success. Delayed calls with the old ID cannot release a newer attempt.
    await Order.updateOne(
      { _id: current._id, createdBy: userId, activeAttempt: true, state: 'committed' },
      { $set: { activeAttempt: false } },
    );
  }
  try {
    const attempt = await Order.create({
      operationKey: randomUUID(),
      createdBy: new Types.ObjectId(userId),
      state: 'draft',
      activeAttempt: true,
    });
    return { _id: attempt._id, operationKey: attempt.operationKey, state: attempt.state };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    const winner = await currentAttempt(userId);
    if (!winner) throw error;
    return winner;
  }
}

async function resultForAttempt(id: string, userId: string, hash: string) {
  const existing = await Order.findOne({ _id: id, createdBy: userId }).lean();
  if (!existing) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found.');
  if (existing.requestHash !== hash)
    throw new AppError(
      409,
      'IDEMPOTENCY_CONFLICT',
      'This attempt belongs to a different submission.',
    );
  if (existing.state !== 'committed')
    throw new AppError(409, 'ATTEMPT_UNRESOLVED', 'Retry this same attempt.');
  return { order: await Order.findById(id).select(publicFields).lean(), replayed: true };
}

export async function createOrder(
  userId: string,
  attemptId: string,
  operationKey: string,
  input: Submission,
) {
  const hash = fingerprint(input);
  const owner = { _id: attemptId, createdBy: userId, operationKey };
  const existing = await Order.findOne(owner).lean();
  if (!existing) throw new AppError(404, 'ATTEMPT_NOT_FOUND', 'Attempt not found.');
  // Replays are evaluated before current product prices. Old orders keep their original prices.
  if (existing.state === 'committed') return resultForAttempt(attemptId, userId, hash);
  if (!existing.activeAttempt)
    throw new AppError(409, 'ATTEMPT_INACTIVE', 'This attempt is no longer active.');

  const reserved = await Order.findOneAndUpdate(
    { ...owner, activeAttempt: true, state: 'draft' },
    {
      $set: { state: 'submitted', requestHash: hash, submission: canonical(input) },
    },
    { returnDocument: 'after', runValidators: true },
  ).lean();
  if (!reserved) {
    const current = await Order.findOne(owner).lean();
    if (current?.state === 'committed') return resultForAttempt(attemptId, userId, hash);
    if (current?.state !== 'submitted' || current.requestHash !== hash) {
      throw new AppError(
        409,
        'IDEMPOTENCY_CONFLICT',
        'This attempt belongs to a different submission.',
      );
    }
    // Same hash: another request may finish the same deterministic submission.
  }

  try {
    const products = await Product.find({
      _id: { $in: input.items.map((item) => item.productId) },
      active: true,
    }).lean();
    const byId = new Map(products.map((product) => [String(product._id), product]));
    const items = input.items.map((item) => {
      const product = byId.get(item.productId);
      if (!product)
        throw new AppError(400, 'PRODUCT_UNAVAILABLE', 'A selected product is unavailable.', {
          productId: item.productId,
        });
      if (item.expectedUnitPriceMinor !== product.unitPriceMinor) {
        throw new AppError(
          409,
          'PRICE_CHANGED',
          'Review the current product prices before confirming.',
          {
            products: products.map((p) => ({
              productId: String(p._id),
              unitPriceMinor: p.unitPriceMinor,
            })),
          },
        );
      }
      return {
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        unitPriceMinor: product.unitPriceMinor,
      };
    });
    const totalMinor = items.reduce((sum, item) => sum + item.quantity * item.unitPriceMinor, 0);
    if (!Number.isSafeInteger(totalMinor))
      throw new AppError(400, 'INVALID_TOTAL', 'The total exceeds the supported range.');
    // One document is both the durable attempt and the final order. No cross-document dual write.
    const committed = await Order.findOneAndUpdate(
      { ...owner, state: 'submitted', requestHash: hash },
      {
        $set: {
          state: 'committed',
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerNameSearch: normalizeSearch(input.customerName),
          customerEmailSearch: normalizeSearch(input.customerEmail),
          status: 'pending',
          items,
          totalMinor,
          currency: 'SAR',
          createdAt: new Date(),
        },
      },
      { returnDocument: 'after', runValidators: true },
    )
      .select(publicFields)
      .lean();
    if (committed) return { order: committed, replayed: false };
    return resultForAttempt(attemptId, userId, hash);
  } catch (error) {
    if (
      !(error instanceof AppError) ||
      !['PRICE_CHANGED', 'PRODUCT_UNAVAILABLE', 'INVALID_TOTAL'].includes(error.code)
    )
      throw error;
    // A concurrent request may already have committed while we were reading catalog data.
    const committed = await Order.findOne({ ...owner, state: 'committed' }).lean();
    if (committed) return resultForAttempt(attemptId, userId, hash);
    // Definitive rejection: allow correction of the form, retain last submitted data for recovery.
    await Order.updateOne(
      { ...owner, state: 'submitted', requestHash: hash },
      { $set: { state: 'draft' } },
    );
    throw error;
  }
}
