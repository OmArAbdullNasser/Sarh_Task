import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
import type { Filter, Sort } from 'mongodb';
import { client, database, orders, type Order } from './benchmark-db.ts';

const normalize = (s: string) => s.normalize('NFC').trim().toLowerCase();
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const scenarios = [
  { name: 'first-page', text: '', page: 1 },
  { name: 'deep-page-900', text: '', page: 900 },
  { name: 'common-name-ah', text: 'ah', page: 1 },
  { name: 'specific-email', text: 'omar.17', page: 1 },
  { name: 'arabic-name', text: 'أحم', page: 1 },
  { name: 'missing-result', text: 'zzzz-no-customer', page: 1 },
  { name: 'status-amount', text: 'om', page: 1, status: 'completed', amount: true },
  { name: 'single-letter', text: 'a', page: 1 },
  { name: 'common-name-page-100', text: 'ah', page: 100 },
  { name: 'literal-dot', text: '.', page: 1 },
];
const out = 'benchmark-results/prefix';
const round = (n: number) => Math.round(n * 100) / 100;
const percentile = (a: number[], p: number) => [...a].sort((x,y)=>x-y)[Math.ceil(a.length*p)-1];
const rows: any[] = [];
try {
  await client.connect();
  assert.equal(await orders.countDocuments({}), 50000);
  // Only the isolated benchmark collection is updated. Original values are preserved.
  const all = await orders.find({}).toArray();
  for (let start=0; start<all.length; start+=1000) {
    await orders.bulkWrite(all.slice(start,start+1000).map(doc=>({updateOne:{
      filter:{_id:doc._id}, update:{$set:{customerNameSearch:normalize(doc.customerName),customerEmailSearch:normalize(doc.customerEmail)}}
    }})));
  }
  await orders.dropIndexes();
  await orders.createIndex({deletedAt:1,createdAt:-1,_id:-1});
  await orders.createIndex({deletedAt:1,status:1,createdAt:-1,_id:-1});
  await orders.createIndex({deletedAt:1,totalMinor:-1,_id:-1});
  await orders.createIndex({deletedAt:1,status:1,totalMinor:-1,_id:-1});
  await mkdir(out,{recursive:true});
  for (const mode of ['substring','prefix']) {
    if(mode==='prefix') {
      await orders.createIndex({deletedAt:1,customerNameSearch:1});
      await orders.createIndex({deletedAt:1,customerEmailSearch:1});
    }
    for (const scenario of scenarios) {
      const query = normalize(scenario.text);
      const filter: Filter<Order> = {deletedAt:null};
      if(scenario.status) filter.status=scenario.status;
      if(query) filter.$or=mode==='prefix'
        ? [{customerNameSearch:{$regex:`^${escapeRegex(query)}`}},{customerEmailSearch:{$regex:`^${escapeRegex(query)}`}}]
        : [{customerName:{$regex:escapeRegex(query),$options:'i'}},{customerEmail:{$regex:escapeRegex(query),$options:'i'}}];
      const sort: Sort = scenario.amount?{totalMinor:-1,_id:-1}:{createdAt:-1,_id:-1};
      const cursor=()=>orders.find(filter,{projection:{items:0,customerNameSearch:0,customerEmailSearch:0}})
        .sort(sort).skip((scenario.page-1)*50).limit(50);
      // Check each search's own semantics; substring and prefix intentionally return different sets.
      const expected=all.filter(d=>d.deletedAt===null&&(!scenario.status||d.status===scenario.status)&&
        (!query||[d.customerName,d.customerEmail].some(s=>mode==='prefix'?normalize(s).startsWith(query):normalize(s).includes(query))))
        .sort((a,b)=>(scenario.amount?b.totalMinor-a.totalMinor:b.createdAt.getTime()-a.createdAt.getTime())||b._id.toHexString().localeCompare(a._id.toHexString()));
      const run=async()=>{
        const start=performance.now();
        const [docs,total]=await Promise.all([cursor().toArray(),orders.countDocuments(filter)]);
        const ms=performance.now()-start;
        assert.equal(total,expected.length);
        assert.deepEqual(docs.map(d=>d._id.toHexString()),expected.slice((scenario.page-1)*50,scenario.page*50).map(d=>d._id.toHexString()));
        return ms;
      };
      await run(); await run();
      const samples=[];
      for(let i=0;i<20;i++) samples.push(await run());
      const concurrent=[];
      for(let i=0;i<3;i++) concurrent.push(...await Promise.all(Array.from({length:8},run)));
      const list=await cursor().explain('executionStats');
      const count=await orders.aggregate([{$match:filter},{$count:'total'}]).explain('executionStats');
      const countStats=count.executionStats??count.stages?.[0]?.$cursor?.executionStats;
      const row={mode,scenario:scenario.name,query,page:scenario.page,total:expected.length,
        medianMs:round(percentile(samples,.5)),p95Ms:round(percentile(samples,.95)),
        concurrent8P95Ms:round(percentile(concurrent,.95)),concurrent8MaxMs:round(Math.max(...concurrent)),
        listDocsExamined:list.executionStats.totalDocsExamined,listKeysExamined:list.executionStats.totalKeysExamined,
        countDocsExamined:countStats?.totalDocsExamined,countKeysExamined:countStats?.totalKeysExamined,
        samplesMs:samples.map(round),concurrentSamplesMs:concurrent.map(round)};
      rows.push(row);
      await writeFile(`${out}/${mode}-${scenario.name}-explain.json`,JSON.stringify({list,count},null,2));
      console.log(JSON.stringify({...row,samplesMs:undefined,concurrentSamplesMs:undefined}));
    }
  }
  const build=await database.admin().command({buildInfo:1});
  await writeFile(`${out}/results.json`,JSON.stringify({generatedAt:new Date().toISOString(),node:process.version,mongo:build.version,
    count:50000,samples:20,warmups:2,concurrency:8,concurrentRounds:3,indexes:await orders.indexes(),rows,
    limitations:'Warm cache, direct driver, synthetic data, substring measured before adding prefix indexes. Different matching semantics. Not HTTP or a sustained load test.'},null,2));
} finally {await client.close();}
