# BusGo Phase 5 — OTA Maturity

This phase closes more of the redBus/AbhiBus-style Admin → Operator → Customer workflow.

## Implemented
- Operator-specific cancellation and reschedule policy persistence.
- Operator cancellation-policy APIs and a dedicated responsive operator Policy page.
- Customer cancellation quote now uses the operator policy instead of hard-coded percentages.
- Reschedule eligibility/options and quote APIs for confirmed future bookings.
- Reschedule quote checks route compatibility, cutoff, seat availability and fare difference.
- Customer My Bookings receives review state and can submit/edit 1–5 star reviews in a proper modal.
- Customer search receives ratings, review counts, boarding/drop points and supports richer rating/price/boarding/drop filters.
- Promotion usage enforcement: global usage limit, per-customer limit and optional route/operator eligibility.
- Promotion redemption is recorded when a booking is created.
- Admin Promotions page with create, activate/pause and search/filter UI.
- Admin promotion APIs protected by SUPER_ADMIN.
- Migration `021_ota_maturity.sql`.

## New APIs
Booking service:
- `GET /api/bookings/:id/reschedule/options`
- `POST /api/bookings/:id/reschedule/quote`
- Existing cancellation quote now resolves operator-specific rules.

Operator service:
- `GET /api/operators/:operatorId/cancellation-policy`
- `PUT /api/operators/:operatorId/cancellation-policy`

Admin:
- `GET /api/admin/promotions`
- `POST /api/admin/promotions`
- `PATCH /api/admin/promotions/:id/status`

## Reschedule behavior in this phase
The API provides eligible replacement trips and an exact quote. It validates the operator policy, route, cutoff, requested replacement seats, new stop order, fare difference and reschedule fee. The final payment-backed seat move should only be completed after the fare-difference payment/refund transaction succeeds; this phase deliberately does not pretend that money movement is complete before the provider confirms it.
