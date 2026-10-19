import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import assert from 'node:assert/strict';
import type { Filter, Sort } from 'mongodb';
import { client, database, orders, type Order } from './benchmark-db.ts';

const cases = [
  { name: 'default-page-1', page: 1 },
  { name: 'default-page-900', page: 900 },
  { name: 'status-date', page: 1, status: 'pending' },
  { name: 'common-name', page: 1, text: 'ah' },
  { name: 'email-middle', page: 1, text: '17@exam' },
  { name: 'arabic-name', page: 1, text: 'حمد' },
  { name: 'missing-result', page: 1, text: 'zzzz-no-customer' },
  { name: 'search-status-amount', page: 1, text: 'ar', status: 'completed', amount: true },
  { name: 'common-email-page-500', page: 500, text: 'example' },
];
const projection = { items: 0 };
const round = (n: number) => Math.round(n * 100) / 100;
const quantile = (values: number[], p: number) => [...values].sort((a,b) => a-b)[Math.ceil(values.length*p)-1];
const rows: Record<string, unknown>[] = [];
const baselineResults = new Map<string, string>();
try {
  await client.connect();
  const count = await orders.countDocuments({});
  if (count !== 50000) throw new Error(`Expected exactly 50000 fixtures, got ${count}`);
  // Reset only indexes on this isolated benchmark collection to make reruns comparable.
  await orders.dropIndexes();
  for (const phase of ['baseline', 'indexed']) {
    if (phase === 'indexed') {
      await orders.createIndex({ deletedAt: 1, createdAt: -1, _id: -1 });
      await orders.createIndex({ deletedAt: 1, status: 1, createdAt: -1, _id: -1 });
      await orders.createIndex({ deletedAt: 1, totalMinor: -1, _id: -1 });
      await orders.createIndex({ deletedAt: 1, status: 1, totalMinor: -1, _id: -1 });
    }
    for (const scenario of cases) {
      const filter: Filter<Order> = { deletedAt: null };
      if (scenario.status) filter.status = scenario.status;
      if (scenario.text) {
        const escaped = scenario.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [ { customerName: { $regex: escaped, $options: 'i' } }, { customerEmail: { $regex: escaped, $options: 'i' } } ];
      }
      const sort: Sort = scenario.amount ? { totalMinor: -1, _id: -1 } : { createdAt: -1, _id: -1 };
      const cursor = () => orders.find(filter, { projection }).sort(sort).skip((scenario.page - 1)*50).limit(50);
      const reference = JSON.stringify({
        ids: (await cursor().toArray()).map(doc => doc._id.toHexString()),
        total: await orders.countDocuments(filter),
      });
      if (phase === 'baseline') baselineResults.set(scenario.name, reference);
      else assert.equal(reference, baselineResults.get(scenario.name), `Indexes changed results: ${scenario.name}`);
      const run = async () => {
        const start = performance.now();
        const [docs, total] = await Promise.all([cursor().toArray(), orders.countDocuments(filter)]);
        return { milliseconds: performance.now()-start, returned: docs.length, total };
      };
      await run(); // Warm-up, not a cold-cache benchmark.
      const samples = [];
      for (let i=0; i<10; i++) samples.push(await run());
      const explain = await cursor().explain('executionStats');
      const countExplain = await orders.aggregate([{ $match: filter }, { $count: 'total' }]).explain('executionStats');
      const concurrentStart = performance.now();
      const concurrent = await Promise.all(Array.from({length: 8}, run));
      const concurrencyWallMs = round(performance.now()-concurrentStart);
      const row = {
        phase, scenario: scenario.name, total: samples[0].total, returned: samples[0].returned,
        medianMs: round(quantile(samples.map(s=>s.milliseconds), 0.5)),
        p95Ms: round(quantile(samples.map(s=>s.milliseconds), 0.95)),
        concurrent8MaxMs: round(Math.max(...concurrent.map(s=>s.milliseconds))), concurrencyWallMs,
        listDocsExamined: explain.executionStats.totalDocsExamined,
        listKeysExamined: explain.executionStats.totalKeysExamined,
      };
      rows.push(row);
      await mkdir('benchmark-results/explain', {recursive:true});
      await writeFile(`benchmark-results/explain/${phase}-${scenario.name}.json`, JSON.stringify({list:explain, count:countExplain},null,2));
      console.log(JSON.stringify(row));
    }
  }
  const build = await database.admin().command({buildInfo:1});
  await writeFile('benchmark-results/results.json', JSON.stringify({
    generatedAt: new Date().toISOString(), node: process.version, mongo: build.version,
    host: {platform:os.platform(), arch:os.arch(), cpus:os.cpus().length},
    count:50000, pageSize:50, warmup:1, samples:10, concurrentRequests:8,
    notes:'Direct driver, list and exact count together; warm cache; synthetic data; not HTTP or production load. Indexes support filters and sorts, not arbitrary substring search.',
    indexes: await orders.indexes(), rows,
  },null,2));
} finally { await client.close(); }
