# BusGo Phase 6 — Trip Operations & Disruption Management

This phase closes another set of OTA-style operational gaps.

## Operator
- Trip Control Center (`/operator/trips/:tripId/operations`)
- Trip-specific boarding/dropping point editing: landmark, contact, scheduled time, boarding/drop permission
- Seat blocking/reopening for operational inventory control (booked/held seats protected)
- Dynamic fare rule configuration foundation: weekend, occupancy, last-minute, date rules
- Trip cancellation with reason, inventory release and affected-booking cancellation

## Customer
- Refund status API for each owned booking
- Booking-linked support ticket creation
- Customer support ticket history

## Admin
- Admin can cancel future trips with a mandatory reason
- Support ticket APIs for queue, assignment/status and resolution
- Fixed an invalid duplicate icon token in the admin sidebar config

## Database
Migration `022_trip_operations_and_support.sql` adds trip fare rules, disruption records and structured support tickets, and enriches trip stops.

## Important
Dynamic fare rules are now configurable and persisted. The next pricing pass should apply the rule evaluator during search/seat-map/booking price calculation with immutable price quotes so a fare cannot change during checkout.
test
