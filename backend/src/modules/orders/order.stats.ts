import { Order } from './order.model.js';
import { orderStatuses } from './order.validation.js';

export function saudiDayBounds(now = new Date()) {
  const offset = 3 * 60 * 60 * 1000; // Asia/Riyadh is UTC+3 throughout the year.
  const local = new Date(now.getTime() + offset);
  const start = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset,
  );
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
export async function orderStats(now = new Date()) {
  const { start, end } = saudiDayBounds(now);
  const [result] = await Order.aggregate<{
    byStatus: { _id: string; count: number }[];
    revenue: { total: number }[];
  }>([
    { $match: { state: 'committed', deletedAt: null } },
    {
      $facet: {
        byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
        revenue: [
          { $match: { status: 'completed', createdAt: { $gte: start, $lt: end } } },
          { $group: { _id: null, total: { $sum: '$totalMinor' } } },
        ],
      },
    },
  ]);
  return {
    byStatus: Object.fromEntries(
      orderStatuses.map((status) => [
        status,
        result?.byStatus.find((row) => row._id === status)?.count ?? 0,
      ]),
    ),
    revenueTodayMinor: result?.revenue[0]?.total ?? 0,
    currency: 'SAR' as const,
    timeZone: 'Asia/Riyadh',
    dayStart: start.toISOString(),
    dayEnd: end.toISOString(),
    generatedAt: now.toISOString(),
  };
}
