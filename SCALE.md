# Five million orders, three developers, two countries

The current application is one Express service, one MongoDB database, and a React/Vite frontend. It uses embedded order lines, a single-document idempotent creation flow, normalized prefix search, partial indexes, and numbered offset pages with exact counts. Local 50,000-row measurements are a starting point, not evidence that five million rows will meet an SLA.

## Change where measurements show pressure

First agree on peak agents, read/write rates, p95 targets, retention, recovery objectives, and acceptable network latency from both countries. Measure actual query shapes and documents/keys examined, not only the first page. Keep API compute close to the database; serve versioned static assets through a CDN if external hosting becomes permitted. Use one primary write region initially; two countries alone do not justify active-active writes. Display `Asia/Riyadh` consistently and store UTC instants.

Deep offset pages and precise filtered counts are the first behaviors I would revisit. Propose stable `(createdAt, _id)` or `(totalMinor, _id)` cursor navigation and bounded date ranges; explain that arbitrary page-number jumps cannot be preserved unchanged. Count only when useful, cache counts only if a documented staleness window is acceptable, and show the scope of the result. Confirm through query plans whether status/search combinations need different compound indexes; remove redundant indexes to limit storage and write cost.

Keep prefix search until real agents need middle-word, fuzzy, or ranked matching. If they do, evaluate a dedicated indexed search capability on representative data. An asynchronous search projection needs a durable change stream/outbox, retries, lag metrics, and rebuild tooling; it is not a second database that we casually dual-write. Do not silently weaken order correctness to make search immediate.

## Keep the parts that remain useful

Retain the modular monolith: three developers can own feature boundaries without service deployment overhead. Keep server-calculated integer money, product snapshots, strict validation, database uniqueness, role enforcement, and request cancellation/current-result guards. Use a MongoDB replica set for resilience, monitored backups with restore drills, TLS, secret management, structured redacted logs, request IDs, error/latency dashboards, and alerts on creation failures and recovery attempts. These are production additions, not features claimed in the local demo.

The existing account lookup enforces immediate disable/version revocation. Add cache only with an explicit revocation-delay policy. Replace the process-local rate limiter if running multiple API instances. If agents need simultaneous independent order forms or per-device logout, introduce deliberate workflow/session changes rather than stretching the current one-attempt/version model.

## Retention and boundaries

Agree on soft-delete and abandoned-attempt retention. Keep a compact operation-result identity for the promised retry window, and never expire keys while claiming an unlimited replay guarantee. Archive by policy with an audit trail and validate restore behavior.

I would refuse speculative microservices, custom database replication, active-active multi-region order writes, or a second search store without an operating owner and measured need. I would also refuse irreversible “delete all cancelled” without a clear purpose, retention decision, preview, and recovery plan. The team needs a system it can operate and explain, not infrastructure that consumes its capacity.
