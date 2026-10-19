# Submission evidence

Three screenshots are included as the assignment's screenshot alternative to a two-minute recording:

1. `01-rapid-filter-ar.png`: actual Arabic UI after Pending → Processing → Cancelled changes; Cancelled is selected and visible rows match. A screenshot cannot prove response arrival order, so the adversarial reversed-response test in `frontend/src/hooks/useRemote.test.tsx` supplies that guarantee.
2. `02-create-order-ar.png`: actual UI success after creating a customer order with Keyboard × 3 at SAR 40.00; the backend saved SAR 120.00 and the form prepared the next draft.
3. `03-duplicate-proof.png`: an HTML presentation of the **captured real test output**, not a simulated test runner. The underlying `duplicate-proof.txt` records eight parallel HTTP create calls producing one committed order, then replay/conflict/soft-delete checks.

`frontend-tests.txt` contains the frontend test run. Reproduce the proof with:

```sh
npm --prefix backend run proof:duplicates
npm --prefix frontend test
```

`verification.html` only displays the captured stdout; it does not execute tests. Screenshots were captured from the local browser on 19 October 2026. The development DB now contains 50,001 orders because of the real UI creation; a fresh seed creates exactly 50,000.

If recording instead: sign in, show the full count, change the filter three times quickly, search/sort/page, create a product-backed order, then run the duplicate-proof command and show the one-record assertion. Keep the recording around two minutes. No recording, upload or email submission has been performed automatically.
