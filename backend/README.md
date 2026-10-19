# SARH backend

Express + TypeScript + Mongoose, organized by feature. Money is stored in integer halalas, currency is SAR, and dates are UTC instants. The future UI displays them in `Asia/Riyadh` in Arabic or English.

## Local setup

From the project root:

```sh
npm run db:up
cd backend
npm ci
npm run setup
npm run seed
npm run dev
```

Node.js 24+ and Docker Desktop are required. `setup` creates a private, ignored `.env` with a random JWT secret; an existing file is preserved. `.env.example` documents the configuration. MongoDB binds only to localhost on port 27018. The database is `sarh_orders`, separate from performance fixtures and tests.

The seed creates 50,000 orders, each with 1–5 distinct product lines, plus 20 products and two demo users. If any order/attempt records already exist, it logs a skip message and exits successfully without changing users, products, or orders. It does not resume a partially completed seed. This is a development seed, never a production provisioning process.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@sarh.local` | `SarhDemo2026!` |
| Agent | `agent@sarh.local` | `SarhDemo2026!` |

The seeded accounts are ready for the walkthrough. Agents created by the admin must change their initial password before using orders, products, or user management.

```sh
npm run typecheck
npm test
npm run proof:duplicates
npm run build
npm start
```

`dev` and `start` are alternatives. The server listens on `http://localhost:4000`; `GET /api/health` checks the DB connection. Integration tests create a unique `sarh_test_*` database on local port 27018 and remove only that test database afterward. They use the real Express app and real MongoDB, not mocked persistence.

## Swagger: try the API in your browser

Open **http://localhost:4000/docs/**. The standalone OpenAPI 3.0.3 file is `src/docs/openapi.json`, also served at **http://localhost:4000/openapi.json** for import into an API client.

1. Expand **Auth → POST /api/auth/login**, select **Try it out**, choose the seeded Admin or Agent example, then **Execute**.
2. The browser stores the HttpOnly cookie automatically. Do not use Authorize to paste a cookie.
3. Try **GET /api/products** and **GET /api/orders** immediately.
4. For order creation, prepare an attempt, copy its ID/key, copy a real product ID/price, and submit. Repeat the identical request to observe the same order ID and `replayed: true`.

Swagger adds `X-SARH-Request: 1` and uses the same server origin, preserving the existing CSRF and authentication checks. If using the displayed cURL command outside the browser, add an allowed `Origin` and use your client's cookie jar; browsers manage those headers/cookies themselves. The spec documents all 15 operations, schemas, query bounds, examples, errors, admin restrictions, and recovery behavior. Assets are served locally without CDN dependencies.

## File responsibilities

```text
src/app.ts                 Express configuration, routes, error handling
src/server.ts              Database startup, HTTP listener, shutdown
src/config/                Environment and DB/index initialization
src/middleware/            Authentication, authorization, CSRF, errors
src/lib/                   Password hashing, validation primitives, small helpers
src/modules/auth/          Login, logout, first password change
src/modules/users/         Admin-managed agents
src/modules/products/      Bounded product picker endpoint
src/modules/orders/        Prefix listing, durable attempts, creation, soft delete
scripts/                   Local config and development seed
tests/integration.test.ts  HTTP + MongoDB behavior tests
```

Routes select middleware; controllers parse Zod input and return HTTP responses; services implement rules and call Mongoose models. Small product lookup stays in its route rather than creating empty layers. There is no generic repository or service framework.

## API contract

All routes except health and login require the `sarh_session` cookie. Do not put tokens in URLs or browser localStorage. Responses containing application data use `Cache-Control: no-store`.

Every non-read request, including login, must include:

```http
Origin: http://localhost:5173
X-SARH-Request: 1
Content-Type: application/json
```

`APP_ORIGINS` also permits `http://localhost:4000` by default. The future Vite app should proxy `/api` to Express so the browser uses a single origin. This server does not enable cross-origin credential sharing. A production HTTPS deployment must configure its exact origin and sets Secure cookies through `NODE_ENV=production`.

| Method | Path | Behavior |
|---|---|---|
| POST | `/api/auth/login` | `{email,password}`; sets HttpOnly cookie, returns public user |
| GET | `/api/auth/me` | Current account, including first-password-change flag |
| POST | `/api/auth/change-password` | `{currentPassword,newPassword}`; replaces current cookie, invalidates old sessions |
| POST | `/api/auth/logout` | Invalidates all existing sessions and clears cookie |
| GET | `/api/products?search=key` | At most 50 active products, name prefix search, prices in halalas |
| GET | `/api/orders` | Paginated active committed orders |
| GET | `/api/orders/:id` | One visible order |
| DELETE | `/api/orders/:id` | Admin-only soft delete |
| GET | `/api/orders/attempts/current` | Owner's current draft/submitted/committed attempt or null |
| POST | `/api/orders/attempts` | `{}` resumes/creates an attempt; see acknowledgment below |
| POST | `/api/orders` | Converts a prepared attempt into exactly one order |
| GET | `/api/users` | Admin-only paginated agent list |
| POST | `/api/users` | Admin-only `{name,email,password}`; creates agent needing password change |
| PATCH | `/api/users/:id/deactivate` | Admin-only agent deactivation; subsequent API calls fail immediately |

Orders query parameters: `search`, `status` (`pending`, `processing`, `completed`, `cancelled`), `sortBy` (`createdAt`, `totalMinor`), `direction` (`asc`, `desc`), `page` (default 1), `pageSize` (default 50, maximum 100). Unknown parameters are rejected. Sort always includes `_id` as a tie-breaker. Response: `{data,total,page,pageSize,totalPages}`.

Search matches the **beginning of the full customer name or email**, using NFC-normalized lowercase shadow fields and escaped anchored regex. It does not match an arbitrary middle substring or independently match surname tokens. Both sort directions are supported. Search/count and deep offset pages have documented limits in the performance reports.

## Create and recover an order

1. Call `POST /api/orders/attempts` with `{}` when the form is opened. The server returns `{attempt:{_id,operationKey,state}}`. Parallel calls share one active attempt per user, enforced by a partial unique index.
2. Submit `POST /api/orders` with `Idempotency-Key: <operationKey>` and the body below.
3. On success, show the order ID. To prepare the next form, call `POST /api/orders/attempts` with `{previousAttemptId:"<successful attempt id>"}`. This acknowledges that success, releases its active slot, and resumes or creates the next draft. A delayed acknowledgment cannot release a newer attempt.
4. After a timeout or refresh, first call `GET /api/orders/attempts/current`. If committed, display that result; if submitted, retry the exact saved submission with its same key; if draft, restore any saved submission for correction. No permanent browser draft is needed.

```json
{
  "attemptId": "<24-character attempt id>",
  "order": {
    "customerName": "Omar Hassan",
    "customerEmail": "omar@example.com",
    "items": [
      {
        "productId": "<24-character product id>",
        "quantity": 3,
        "expectedUnitPriceMinor": 12550
      }
    ]
  }
}
```

Expected prices detect that the price shown to the operator changed; they are not trusted prices. The server loads actual products, snapshots their names/prices, and calculates the total. Extra client amount fields, duplicate product lines, nonexistent products, invalid IDs, and invalid quantities are rejected. Definitive price/product rejection returns the attempt to draft and retains submitted data; the user can review and correct it. Network/DB uncertainty leaves a recoverable submitted attempt. Data that never reached the server cannot be restored.

The first successful commit returns `201` and `{order,replayed:false}`; retries return `200` with the same order and `replayed:true`. Reusing a committed key with different validated content returns `409 IDEMPOTENCY_CONFLICT`. Item order does not change request identity. Replays use the original stored result before checking today's prices. Deleted orders keep their operation key and return their original deleted record on replay; they are not recreated or restored.

## Why duplicate creation is safe

The attempt and final order are the **same MongoDB document**. `draft → submitted` atomically stores a payload fingerprint and the validated submission; `submitted → committed` atomically writes all final order fields and embedded lines. Concurrent identical requests can help finish the same submission, but only one conditional update commits it. A real unique index reserves the operation key; another partial unique index limits the employee to one active attempt. Index creation finishes before the server accepts traffic.

There is no separate order/attempt dual write and no replica-set transaction requirement. A crash after reservation leaves a submitted document that an exact retry can complete; a crash after commit leaves the finished result to replay. A crash between acknowledging success and creating the next draft does not lose the old order; a later prepare can create the next attempt.

The guarantee covers retries of one operation, not intentionally starting a new operation with identical products/customer. Attempts and keys have no automatic expiry in this implementation; retention/cleanup is a future policy, and arbitrarily deleting old keys would weaken the replay guarantee. Catalog updates have no API in this scope; prices are checked at the server catalog read, not locked across concurrent external catalog writes.

## Security review of the supplied code

| Finding | Applied change |
|---|---|
| `jwt.decode()` accepts unverified claims | Verify HS256 signature, expiry, issuer, audience, and claim shape |
| Hard-coded shared secret | Required environment secret, random local setup, ignored real `.env` |
| Tokens accepted in query strings | Cookie-only authentication |
| Naive Authorization splitting | No Authorization fallback; one explicit authentication mechanism |
| Admin check only in React | Server-side role checks for deletion and user management |
| Plaintext-password lookup | Salted async scrypt hashing and timing-safe comparison |
| JWT without expiry | Fixed eight-hour lifetime |
| Stale user role/activity accepted | Read current role, active flag, and session version per authenticated request |
| Logout cannot revoke stateless tokens | Atomic account session-version increment invalidates all old sessions |
| Weak input boundaries and unsafe route IDs | Strict Zod request validation, bounded pages/amounts, explicit queries |
| Unhandled async/database failures | Express 5 promise error handling and centralized safe responses |
| Brute-force exposure | IP-based login/password-change limiter and generic login failure |

The HttpOnly cookie prevents JavaScript from directly reading the session token, reducing token theft via XSS; it does not stop XSS from making requests as the user. SameSite=Strict plus exact Origin checks and a required custom header protect browser writes against CSRF; production cookies also require HTTPS. This single-process demo has an in-memory rate limiter, so limits reset on restart and are not distributed across server instances.

## Product question: “Delete all cancelled orders”

Ask why deletion is needed: clutter, storage, privacy, or a retention requirement?
Clarify which records, audit obligations, who approves, and whether recovery is required.
If the goal is unclear, offer a default filter hiding cancelled orders and a preview of the affected count.
Prefer reversible archival with an agreed retention policy over an irreversible bulk-delete button.

## Current verification and gaps

Ten integration tests include OpenAPI schema validation and local Swagger assets, and cover concurrent creates, repeated prepare, exact replay after a lost response, conflicting payload, soft delete, price review, recovery of a submitted attempt, prefix search, request validation, forged/expired tokens, CSRF, server roles, forced first password change, deactivation, and logout across devices.

The bilingual frontend, rapid-filter guard tests and browser check, three-decision `DECISIONS.md`, Senior `SCALE.md`, and three submission screenshots are now present; see the root README and submission/README.md. A screen recording and remote repository publication have not been done. No optional stats or optimistic creation, product-management UI, status editing, password-reset email, or distributed infrastructure has been added. This documents backend progress, not a completed assignment.

References: [Express 5 error handling](https://expressjs.com/en/5x/guide/error-handling/), [Mongoose unique indexes vs validators](https://mongoosejs.com/docs/validation.html), [MongoDB partial indexes](https://www.mongodb.com/docs/manual/core/index-partial/).
