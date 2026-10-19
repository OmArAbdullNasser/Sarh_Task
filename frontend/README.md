# SARH frontend

React + Vite + TypeScript. Feature folders cover auth, orders, and agent management; shared API, feedback, pagination, and layout components stay small. Arabic/English dictionaries are in `src/locales/`, the selected language is in the URL, and CSS logical properties support RTL/LTR. Currency is SAR; date/time display is always Asia/Riyadh.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open **http://localhost:5173** with the backend running on port 4000. Vite proxies `/api` without rewriting browser Origin; the backend allows localhost:5173 and requires the application header sent by `src/api/client.ts`. The browser manages the HttpOnly cookie. Tokens, passwords and order drafts are never persisted to localStorage/sessionStorage.

- `OrdersPage`: URL query state, 300ms search debounce, status tabs, date/amount sorting, 50-row pages, direct page jump, details and admin-only removal.
- `useRemote`: abort plus a cleanup guard; only the current URL's data is displayed. No infinite scroll or full-table download.
- `CreateOrderPage`: server-owned attempt, product picker, client quantity/customer validation, price review, server totals, timeout recovery and same-key retries. A received success prepares the next draft automatically.
- `UsersPage`: admin agent listing, creation, and deactivation. Backend permissions remain authoritative.
- `AuthProvider`: session bootstrap, login/logout, session expiry handling; required password change routes users to the password page.

The picker currently loads the bounded catalog endpoint (20 seeded products, API maximum 50), then searches those locally. A larger catalog requires server-side autocomplete and pagination. Unsent fields do not survive navigation/refresh; fields that reached the backend can be restored. There is no background autosave or offline creation queue.

Tests: three adversarial read-lifecycle cases (including three filters whose responses resolve in reverse order despite ignoring abort), and a create timeout/retry case asserting identical payload/key and no new attempt until success is known. Backend integration tests cover actual database concurrency, pricing, authorization and recovery. Browser review complements these tests; it does not replace them.

## Display theme

`ThemeProvider` defaults to dark and stores only `sarh-theme` (`dark`/`light`) in localStorage. Theme controls are available in the app header and login screen. This is a non-sensitive display preference; tokens, passwords, and order drafts remain outside browser storage. Dark color overrides cover tables, forms, dialogs, picker menus, feedback and login. Customer/account avatars use a neutral user icon rather than a standalone initial.
