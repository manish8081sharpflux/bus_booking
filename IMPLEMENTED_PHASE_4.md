# BusGo Phase 4 — OTA Booking Experience

Implemented the next customer-facing maturity phase for the Admin/Operator/User bus-booking workflow.

## Included
- Multiple boarding and dropping point selection in checkout.
- Boarding/drop metadata foundation: landmark, coordinates, contact and scheduled time.
- Active offers API and a real customer Offers page (replaces placeholder).
- Coupon validation and server-side discount recalculation; client values are never trusted.
- Coupon snapshot stored on bookings (`coupon_code`, `discount_amount`, `promotion_id`).
- Seed development offers `BUSGO10` and `FIRST100`.
- Cancellation quote API with time-based refund policy; My Bookings shows refund/fee before confirmation.
- Actual cancellation refund amount follows the cancellation quote instead of always refunding the full captured amount.
- Customer reviews data model and authenticated completed-trip review endpoint.
- Search results now receive aggregate operator rating/review count and structured boarding/drop points.

## Migration
Run database migration `020_ota_booking_experience.sql` before testing this phase.

## New/extended APIs
- `GET /api/bookings/offers`
- `POST /api/bookings/coupons/validate`
- `GET /api/bookings/:id/cancellation-quote` (authenticated)
- `POST /api/bookings/:id/review` (authenticated; completed confirmed journeys only)
- `GET /api/bookings/trips/:tripId/seats` now returns `boardingPoints` and `droppingPoints`.
- `POST /api/bookings` accepts `couponCode` and validates/recalculates the discount server-side.

## Cancellation policy currently configured
- >= 24h: 90% refund
- >= 12h: 75% refund
- >= 6h: 50% refund
- >= 2h: 25% refund
- < 2h: no refund

This is a default BusGo policy and can later be replaced by operator-specific policy rules already represented in the wider schema.
