# Phase 16 — Full System Validation

Adds a release-oriented validation gate instead of new product features.

## Commands
- `npm run validate:static` — repository/migration/mobile/web/E2E readiness checks without services.
- `npm run validate:system` — static validation plus the automated QA suite.
- `npm run validate:live` — checks a running API, customer web, admin web, and anonymous booking protection.
- `npm run validate:release` — production source scan + system validation + typecheck + build.

## Live environment variables
- `BUSGO_API_URL` (default `http://127.0.0.1:4000`)
- `BUSGO_WEB_URL` (default `http://127.0.0.1:5173`)
- `BUSGO_ADMIN_URL` (default `http://127.0.0.1:5174`)

## Release rule
A release is not considered validated merely because source checks pass. Run `validate:live` against the actual local/staging stack and then run Playwright against that environment. Real payment/Meta/store-provider verification remains intentionally deferred until production credentials are supplied.
