# SARH · Orders Console

A local operations console built with **React + Vite + TypeScript** and **Express + Mongoose + MongoDB**. It supports Arabic/English, persistent dark/light display themes, a 50,000-order seeded dataset, prefix search, numbered pagination, agent management, and retry-safe order creation.

- App: **http://localhost:5173**
- Swagger playground: **http://localhost:4000/docs/**
- OpenAPI: **http://localhost:4000/openapi.json** ([source](backend/src/docs/openapi.json))

## Run locally

Requirements: Node.js **24+**, npm, Docker Desktop with Compose. MongoDB uses localhost port **27018**, API **4000**, frontend **5173**. Use **localhost:5173**, as configured in the allowed browser origins.

```sh
npm ci
npm run setup
npm run db:up
npm run backend:seed
npm run dev
```

`setup` installs backend/frontend dependencies from their lockfiles and creates an ignored `backend/.env` with a random secret if absent. The seed requires an empty application orders collection and refuses to overwrite existing data. **On the prepared local checkout, the DB is already seeded: skip `backend:seed`.** Stop `npm run dev` with Ctrl+C; `npm run db:stop` stops MongoDB while preserving its volume. The initial MongoDB image/dependency downloads depend on the network; cached setup and seed run locally without hosted services.

| Account | Email | Password |
|---|---|---|
| Admin | `admin@sarh.local` | `SarhDemo2026!` |
| Agent | `agent@sarh.local` | `SarhDemo2026!` |

The login screen has buttons to fill these development accounts. Dark mode is the default; the sun/moon control switches themes and remembers only that display preference. Seeded customer names are complete Arabic or English names, never mixed-script combinations. Newly created agents must change their initial password before accessing the console. All money is integer halalas on the server and displayed as SAR; all dates are UTC instants displayed in `Asia/Riyadh`.

## What to try

### R1 — Find an order, including rapid filter changes

1. Sign in, then search the **beginning** of a customer name/email (for example `ah`, `omar.17`, or `أحم`). The placeholder states this scope.
2. Change Pending → Processing → Cancelled quickly. Only the latest selection's rows may appear; old rows are replaced by loading, and controls remain usable.
3. Change date/amount sorting, use numbered pages or Go to page, refresh, and use browser Back. Search/filter/sort/page live in the URL; a changed search/filter/sort resets the page to 1.
4. Open order details. Admin can soft-delete with confirmation; Agent cannot call the delete API.

Each request returns at most 100 rows (UI uses 50) and an exact count. `useRemote` aborts previous requests **and** ignores their stale success/failure, including transports that do not honor cancellation. Tests resolve three filter responses in reverse order to prove the guard. Search is debounced for 300ms. No full-table download or client-side filtering of all orders.

### R2 — Create once, retry safely

1. Open New order. The server prepares/resumes one active attempt for this agent.
2. Fill customer name/email, choose up to five distinct products from the searchable picker, and enter quantities. The server loads catalog prices, calculates the total, and snapshots product names/prices.
3. If a price changed since selection, review the returned new prices and confirm again. If the network result is unknown, use Check save status or Retry same submission; the form stays locked until that uncertainty is resolved.
4. A received success shows the order ID and prepares the next form automatically. Refresh restores the server's attempt/result; unsent browser fields are not persisted.

The attempt and final order are one document. Conditional state transitions plus real unique indexes prevent concurrent retries from committing two orders. Reusing a committed key with different content returns 409. Soft deletion retains the key, so an old retry cannot recreate a removed order. A deliberately new operation with identical customer/items is allowed: this guarantee addresses duplicate delivery of an operation, not duplicate business intent.

Run the standalone database/HTTP proof:

```sh
npm --prefix backend run proof:duplicates
```

It fires **eight identical requests in parallel**, asserts exactly one `201`, seven `200` replays, one shared order ID, and exactly one committed DB record. It also checks replay after soft deletion and recovery of the same active attempt. Tests use an isolated `sarh_test_*` database, not the 50,000-row application database.

### User management

Admin can list agents, add an agent with an initial password, and deactivate an agent. A new agent must change the initial password. Disabling the account rejects subsequent authenticated requests immediately, including existing sessions. Logout/password change invalidates old sessions on all devices; a successful password change issues a new cookie for the current browser.

## Verification

```sh
npm test           # backend integration tests + frontend tests
npm run typecheck  # benchmark scripts, backend, frontend
npm run build      # both applications
```

Backend tests cover real HTTP + MongoDB concurrency, recovery, prices, validation, prefix search, permissions, session revocation, CSRF, and OpenAPI validity. Frontend tests cover stale success/failure, cancellation/unmount, retry, and preserving the same create key/payload after timeout. Browser checks exercised login/logout, both languages, rapid filters, a real order creation and details, and the team-management screen. Optional O1 (slow statistics) is implemented; O2 (optimistic creation) is intentionally skipped.

Evidence is in [submission/](submission/README.md): screenshots, captured duplicate-proof output, and frontend test output. A still screenshot demonstrates the selected end state, not response timing; the reversed-response automated test supplies the timing proof. A recording can be made following that folder's walkthrough if preferred to the three screenshots.

## Architecture and indexes

```text
backend/src/
  app.ts, server.ts       App composition vs process startup
  config/                Validated environment and DB/index setup
  middleware/            Authentication, roles, CSRF, error boundary
  modules/               auth / users / products / orders
frontend/src/
  api/, hooks/           Cookie-based client and scoped read lifecycle
  components/            Shared layout, feedback, dialogs, pagination
  features/              auth / users / orders
  locales/               en.json / ar.json
```

A modular monolith: route → middleware → controller → service → Mongoose. Each feature keeps its files together; small lookups do not get empty layers. No generic repository or service framework. Detailed reasoning/history: [SYSTEM_DESIGN_NOTES.md](SYSTEM_DESIGN_NOTES.md); three final decisions: [DECISIONS.md](DECISIONS.md); Senior growth memo: [SCALE.md](SCALE.md). Endpoint contracts and recovery sequence: [backend/README.md](backend/README.md).

`order.model.ts` declares:

- Unique `operationKey` across all orders/attempts, including deleted records.
- Partial unique `createdBy` where `activeAttempt=true`, enforcing one active attempt per employee.
- Visible committed-order partial indexes for `(createdAt,_id)` and `(totalMinor,_id)`, with additional status-prefixed variants. Reverse scans support the opposite matching sort direction.
- Visible-order partial indexes on normalized `customerNameSearch` and `customerEmailSearch` for anchored prefix lookup.

Index creation finishes before accepting API traffic. Passwords and queries are not trusted because they passed TypeScript types; Zod validates requests at runtime, and database indexes enforce uniqueness.

## Performance experiment

The isolated `sarh_search_benchmark` database remains separate from `sarh_orders`. Original substring measurements and the prefix comparison are reproducible:

```sh
npm run bench:seed   # once, only if benchmark collection is empty
npm run bench:run    # original substring experiment
npm run bench:prefix
```

Do not run benchmark commands concurrently: they reset indexes on the **benchmark** collection. Reports preserve raw samples and explain plans:

- [Original experiment](benchmark-results/SUMMARY.md)
- [Prefix comparison](benchmark-results/prefix/SUMMARY.md)

On synthetic warm-cache data, prefix median was 0.71ms for a specific email and 1.30ms for an Arabic name; the broad default page plus exact count was 5.88ms. These are direct-driver measurements, **not frontend/HTTP latency**. Some plans remained expensive: status/amount combinations, deep offsets, and a literal-dot case. Prefix and substring have different matching semantics and can return different result counts. We do not infer five-million-row behavior from those numbers.

## Supplied authentication review — findings and fixes

| Problem found | Implemented fix |
|---|---|
| `jwt.decode` does not verify the token | Signature verification with allowed HS256, expiry, issuer, audience, and validated claim shape |
| Hard-coded signing secret | Environment secret with random local setup; real `.env` ignored |
| Token accepted in URL query | Cookie-only authentication; query tokens ignored |
| Naive Authorization header parsing | One explicit authentication mechanism, no ambiguous fallbacks |
| Deletion authorized only by React | Backend Admin middleware; direct Agent API call returns 403 |
| Plaintext password lookup | Per-password random salt, async scrypt hash, timing-safe comparison |
| Signed token has no expiry | Eight-hour lifetime |
| Old roles/disabled accounts remain trusted | Current account role/activity/version checked on every authenticated request |
| Stateless logout cannot revoke copied tokens | Session-version increment invalidates prior tokens on all devices |
| Unvalidated input/IDs and unhandled async failures | Strict Zod boundaries and central Express 5 error handling |
| Login brute-force exposure | Process-local IP rate limit, generic login failure, dummy password hashing for unknown emails |

**Token storage:** An HttpOnly, SameSite=Strict cookie, with Secure enabled for production HTTPS, keeps JavaScript from directly reading the session token. It does not stop XSS from acting as the user; browser writes also require an exact allowed Origin and a custom request header for CSRF defense. No tokens/passwords/drafts are stored in localStorage or sessionStorage; API data uses `Cache-Control: no-store`.

## Product question — “Delete all cancelled orders”

Ask why: clutter, storage, privacy, or a defined retention requirement?
Clarify affected records, audit obligations, who approves, and whether recovery is required.
If the purpose is unclear, propose hiding cancelled orders by default with a preview of the affected count.
Prefer reversible archival under an agreed retention policy over irreversible bulk deletion.

## What I skipped and why / known limits

- **Optional O2 optimistic creation:** skipped; O1 slow statistics is the single optional task implemented.
- **Substring/fuzzy search and a second search store:** considered, but indexing/synchronization and recovery cost exceeded this scope; explicit prefix matching is implemented.
- **Product/customer management, inventory, payments, discounts, status editing, registration and reset email:** outside the agreed console slice. Twenty seeded catalog products are loaded through a bounded endpoint; a larger catalog needs server-side picker search/pagination.
- **Distributed sessions/rate limits, multi-region writes, replica-set transactions:** unnecessary for the local single-process deployment. The attempt/order uses single-document atomicity; the login limiter resets on process restart.
- **TTL cleanup:** retained keys preserve replay identity; cleanup needs an agreed retention/retry window. Abandoned attempts consume storage. Unsent form data is lost after navigation/refresh, intentionally.
- **Snapshot pagination and fully locked catalog prices:** offset pages can move while data changes; list/count are separate reads. Catalog prices are checked at read time; no product-update API is implemented.
- **Full E2E automation, a mobile/accessibility audit, and full coverage:** focused tests target the required failure modes; browser review is documented. CSS supports small screens and native dialogs provide focus trapping, but this is not a claim of a comprehensive audit.
- **Deployment/submission email:** the application runs locally; no hosted deployment or email submission has been performed.

AI assistance and Omar's decision ownership are disclosed in [DECISIONS.md](DECISIONS.md). All secrets stay out of Git; the demo password is intentionally documented for local evaluation.


## Optional O1 — slow statistics

`GET /api/orders/stats` deliberately waits four seconds using an asynchronous timer. The orders screen loads the table and statistics independently: filters, sorting, pagination and navigation remain available. Statistics show counts by status and revenue today across all visible orders, independent of list filters; revenue means completed orders **created** today in Asia/Riyadh, not a payment ledger or completion-day accounting. Deleted orders and uncommitted attempts are excluded. The snapshot shows its update time and has a refresh button; deleting an order refreshes it automatically.

The shared request hook aborts on navigation/unmount, ignores late responses, and displays an error with a manual retry button (one request per click, no automatic retry loop). The backend cancels its artificial delay on disconnect and avoids starting aggregation; an aggregation already started may finish, but its result is not sent to a disconnected client.

Manual check: reload Orders, use filters while statistics load, then navigate to New order before four seconds; Network should show the stats request canceled. To check failure/retry in Chrome DevTools, block only `*/api/orders/stats`, reload, observe the stats error while the table works, remove the block, and click Try again. API/UI tests cover the delay, Saudi midnight boundaries, continued API availability, error/retry and unmount cancellation.
