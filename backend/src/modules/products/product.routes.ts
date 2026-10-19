import { Router } from 'express';
import { z } from 'zod';
import { Product } from './product.model.js';
import { normalizeSearch, escapeRegex } from '../../lib/text.js';
export const productRoutes = Router();
productRoutes.get('/', async (req, res) => {
  const { search } = z.object({ search: z.string().trim().max(100).default('') }).strict().parse(req.query);
  const data = await Product.find({ active: true, ...(search ? { nameSearch: { $regex: `^${escapeRegex(normalizeSearch(search))}` } } : {}) })
    .select('_id sku name unitPriceMinor').sort({ nameSearch: 1, _id: 1 }).limit(50).lean();
  res.json({ data, currency: 'SAR' });
});
