# Phase 12 — Automated QA & E2E Validation

Phase 12 adds a repeatable automated release gate so routine verification does not depend on manually clicking through BusGo.

## Automated coverage added

- Seat-concurrency simulation: 100 simultaneous requests for the same seat must produce exactly one winner.
- Idempotency simulation: duplicate payment/event keys execute only once.
- Meta webhook signature tamper test.
- Booking source contract tests for immutable quote locking, `FOR UPDATE`, quote consumption, payment idempotency, captured payment state and booked-seat finalization.
- Security contract tests ensuring sensitive customer booking routes use authentication.
- WhatsApp internal-service authentication checks.
- Migration integrity test: unique, sequential migrations and no temporary SQL files.
- Staging smoke runner that can automatically test a deployed environment when `STAGING_BASE_URL` is configured.
- k6 load-test definitions for trip search and WhatsApp webhook safety.

## CI

`.github/workflows/qa-gate.yml` automatically runs on pull requests and pushes to `main`:

1. `npm ci`
2. production source scan
3. Phase 12 QA suite
4. existing tests
5. typecheck
6. production builds

An optional staging-smoke job can be enabled with a GitHub Actions variable named `STAGING_BASE_URL` and run using `workflow_dispatch`.

## Commands

```bash
npm run qa
npm run qa:security
npm run qa:concurrency
npm run qa:staging
npm run ci:verify
```

## Important limit

These tests automate repository-level and staging checks. They do not prove a real Razorpay transaction, Meta message delivery, bank payout, or physical GPS device until those real provider credentials/devices are connected to staging.
