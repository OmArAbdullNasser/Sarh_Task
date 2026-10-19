import type { Request, Response } from 'express';
import { objectId } from '../../lib/validation.js';
import { createAgentInput, listUsersInput } from './user.validation.js';
import * as service from './user.service.js';
export async function list(req: Request, res: Response) {
  const query = listUsersInput.parse(req.query);
  res.json(await service.listAgents(query.page, query.pageSize));
}
export async function create(req: Request, res: Response) {
  res.status(201).json({ user: await service.createAgent(createAgentInput.parse(req.body)) });
}
export async function deactivate(req: Request, res: Response) {
  res.json({ user: await service.deactivateAgent(objectId.parse(req.params.id)) });
}
