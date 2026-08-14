# Phase 5 validation

Validated in the implementation workspace:

- Node syntax checks passed for all modified booking-service and operator-service JS files.
- New TSX files were parsed with TypeScript's compiler; no TypeScript syntax/parser diagnostics were reported. Full frontend/admin typecheck was not run because the generated archive intentionally does not include node_modules.
- API gateway already proxies `/api/bookings`, `/api/operators`, and `/api/admin`, so the new endpoints require no additional gateway mount.

Before local testing:
1. Run migration `021_ota_maturity.sql`.
2. Install frontend/admin dependencies if node_modules is absent.
3. Start PostgreSQL/Redis and backend services.
4. Test operator policy save, admin promotion create/activate, customer review, advanced filters, and reschedule with a confirmed future booking.
5. For positive reschedule fare differences, DEMO provider completes the local flow. Real provider mode intentionally requires provider-backed additional-payment completion rather than silently marking money as paid.
