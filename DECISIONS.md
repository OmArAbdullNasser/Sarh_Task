# Three implementation decisions

## 1. A durable creation attempt becomes the order

- Decision: keep the attempt, submitted payload/fingerprint, and final embedded order in one MongoDB document.
- The server prepares one active attempt per agent; retries use its same operation key and validated content.
- Conditional `draft → submitted → committed` updates allow one commit, with exact retries returning the existing order.
- Unique indexes enforce operation identity and the active-agent slot; soft deletion preserves both the record and key.
- Alternative considered: separate attempt and order collections coordinated with a transaction.
- Rejected because it introduces multi-document coordination and a replica-set setup for a guarantee achievable with one document.
- Cost accepted: order reads must exclude drafts; keys currently have no automatic expiry, and agents cannot run independent simultaneous attempts.
- A successful response is acknowledged before preparing the next draft; unknown results are recovered instead of blindly creating a new operation.

## 2. Prefix search on normalized fields

- Decision: match the beginning of the full customer name or email using NFC/lowercase shadow fields and escaped anchored regex.
- Indexes support both search fields; separate partial indexes support visible-order date/amount sorting with and without status.
- Alternative measured: arbitrary substring search with filter/sort indexes on the same 50,000 synthetic fixtures.
- It still scanned all active candidates for broad counts/no matches; adding ordinary indexes did not solve substring lookup.
- We also discussed n-grams/MongoDB Search and a SQLite FTS5 search sidecar; those alternatives were not implemented or benchmarked.
- Rejected the extra search infrastructure because index synchronization, failure recovery, and setup exceeded this assignment's time budget.
- Prefix improved common local cases, but status/amount combinations and deep numbered pages remain documented limits; no claim of uniform latency.
- Tradeoff: users must know the beginning of the name/email; the search placeholder explicitly describes that behavior.

## 3. Small, request-scoped React data fetching

- Decision: use a shared `useRemote` hook for bounded read endpoints, and keep mutations explicit in their feature components.
- Each URL identifies its result; changing filters resets pagination and hides data belonging to the old URL immediately.
- Cleanup aborts the previous request and independently prevents its late success or failure from updating current state.
- Search is debounced for 300ms; filters/sort/page live in the URL, while unsent order fields live only in component memory.
- Alternative considered: TanStack Query for caching, invalidation, and query lifecycle management.
- Rejected for this small scope because there is no requirement for shared background caches; a short hook with adversarial tests covers the needed behavior.
- Cost accepted: explicit refresh/invalidation and repeated reads after navigation; a growing app would justify adopting a query library.
- Tests deliberately ignore AbortSignal and complete three requests in reverse order; the latest selection still wins, and timeout retries preserve the create key/payload.

## AI use and ownership

OpenAI Codex assisted with brief analysis, design alternatives, scaffolding, code, documentation, test construction, and local browser verification. Omar selected the stack, scope, operational behavior, language support, prefix-search tradeoff, and other decisions through the recorded discussion. AI-generated output is not a substitute for Omar reviewing, understanding, defending, and modifying this code in the live interview. Specific decisions and limitations are recorded in `SYSTEM_DESIGN_NOTES.md`; implemented behavior and reproducible checks are in the source and README.
