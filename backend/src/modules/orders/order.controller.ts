import { setTimeout as delay } from 'node:timers/promises';
import { orderStats } from './order.stats.js';
import type { Request, Response } from 'express';
import { currentUser } from '../../middleware/authenticate.js';
import { objectId } from '../../lib/validation.js';
import {
  listOrdersInput,
  prepareAttemptInput,
  createOrderInput,
  idempotencyKey,
} from './order.validation.js';
import * as service from './order.service.js';
export async function list(req: Request, res: Response) {
  res.json(await service.listOrders(listOrdersInput.parse(req.query)));
}
export async function get(req: Request, res: Response) {
  res.json({ order: await service.getOrder(objectId.parse(req.params.id)) });
}
export async function remove(req: Request, res: Response) {
  await service.deleteOrder(objectId.parse(req.params.id));
  res.status(204).end();
}
export async function current(req: Request, res: Response) {
  res.json({ attempt: await service.currentAttempt(currentUser(req).id) });
}
export async function prepare(req: Request, res: Response) {
  const { previousAttemptId } = prepareAttemptInput.parse(req.body ?? {});
  res.json({ attempt: await service.prepareAttempt(currentUser(req).id, previousAttemptId) });
}
export async function create(req: Request, res: Response) {
  const input = createOrderInput.parse(req.body);
  const key = idempotencyKey.parse(req.get('Idempotency-Key'));
  const result = await service.createOrder(currentUser(req).id, input.attemptId, key, input.order);
  res.status(result.replayed ? 200 : 201).json(result);
}

export async function stats(_req: Request, res: Response) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  res.once('close', cancel);
  try {
    // Deliberately slow for optional task O1. Async delay never blocks other routes.
    await delay(4000, undefined, { signal: controller.signal });
    if (controller.signal.aborted) return;
    const result = await orderStats();
    if (!controller.signal.aborted) res.json(result);
  } catch (error) {
    if (!controller.signal.aborted) throw error;
  } finally {
    res.off('close', cancel);
  }
}
