# Submission evidence

Three current screenshots are included as the assignment's alternative to a two-minute recording. Captured from the real local application on 19 October 2026:

1. [01-rapid-filter-ar.png](01-rapid-filter-ar.png) — **R1 rapid-filter check:** changed Pending → Processing → Cancelled quickly. Cancelled is the final selected filter; all visible rows match it, with 12,501 matching orders and 50 rows per page. This is the observed final state, not a claim that a still image proves response timing. The adversarial test in `frontend/src/hooks/useRemote.test.tsx` completes three requests in reverse order and proves that an older success/failure cannot overwrite the latest result.
2. [02-orders-overview-ar.png](02-orders-overview-ar.png) — **R1 scale and O1 overview:** the unfiltered view shows 50,004 orders, 50 rows per page, and 1,001 pages. The independent statistics panel shows global status counts and today's revenue. This is a development snapshot; the extra four orders came from earlier manual use. A fresh seed creates exactly 50,000.
3. [03-duplicate-proof.png](03-duplicate-proof.png) — **R2 duplicate proof:** a presentation of freshly captured real HTTP/MongoDB test output. Eight identical concurrent create requests yield one `201`, seven `200` replays, the same order ID, and exactly one committed record, verified by assertions. The test also checks conflicts, recovery and replay after soft deletion. It runs against an isolated test database and does not create orders in the development database.

`duplicate-proof.txt` is the actual captured proof transcript; `verification.html` presents that transcript and does not execute or simulate tests. `frontend-tests.txt` records the current frontend suite: 13 passing tests across 7 files, including reversed-response safety, integer inputs, amount ranges and statistics cancellation/error/retry.

Reproduce the checks with MongoDB running:

```sh
npm --prefix backend run proof:duplicates
npm --prefix frontend test
```

For the manual rapid-filter check, open Orders, optionally enable Slow 3G in browser Network tools, select three different status filters quickly, and wait. The selected final status and every displayed row must agree. For O1, refresh the statistics then navigate away before four seconds; its request is canceled.

If recording instead, show the full count, change filters three times quickly, search/sort/page, then run the duplicate-proof command and show the one-record assertion. Keep the recording around two minutes. No recording, remote upload or email submission has been performed automatically.
