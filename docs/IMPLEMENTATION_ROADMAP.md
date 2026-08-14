# RedBus-Style Platform Implementation Roadmap

This roadmap builds on the current Express microservices repository without attempting a risky rewrite. Complete each phase, deploy it behind feature flags, and only then begin the next one.

## Phase 1 - Platform Data Foundation (in progress)

Delivered in this change:

- A versioned PostgreSQL schema in `backend/services/database/postgres/001_platform_schema.sql`.
- Core entities for Super Admins, operators, buses, layouts, routes, trips, stops, inventory, bookings, payments, notifications, tracking, and audit history.
- MongoDB ownership guidance for identity, search projections, notifications, and analytics.

Next code task: add a migration runner and change existing services to consume the new UUID-based tables rather than creating isolated tables at startup.

## Phase 2 - Identity and Authorization

1. Rename backend roles to `SUPER_ADMIN`, `OPERATOR`, and `CUSTOMER`; retain a temporary mapping from existing `ADMIN` and `USER` values.
2. Add refresh tokens, password reset verification, account status, and login audit logs to auth-service.
3. Issue access tokens with role, user ID, and operator ID claims.
4. Add role and ownership middleware to every protected route.

## Phase 3 - Operator, Fleet, and Trip Management

1. Create `inventory-service` (port `4700`) as owner of buses, layouts, routes, stops, trips, and seat inventory.
2. Build operator APIs to create buses, define seat maps, create routes, schedule trips, set fares, and publish `trip.published` events.
3. Build operator dashboard pages for fleet, trip calendar, fares, occupancy, and live-trip actions.
4. Project published trips to search-service.

## Phase 4 - Customer Search and Booking

1. Extend search-service to index routes, times, prices, amenities, ratings, and available seats.
2. Add customer screens: search, trip results, trip detail, seat map, passenger form, booking confirmation, and booking history.
3. Implement inventory holds using `SELECT ... FOR UPDATE`, a hold token, and a five-minute expiry.
4. Require confirmed payment before converting held seats to booked seats; publish booking lifecycle events.

## Phase 5 - Payments and Refunds

1. Create `payment-service` (port `4800`) and own `payments` and `refunds`.
2. Start with one provider adapter (for example Razorpay for India) behind a `PaymentProvider` interface.
3. Implement payment-order creation, signed webhook validation, idempotency keys, reconciliation, cancellation refunds, and retry-safe events.
4. Never store raw card or UPI credentials; store provider identifiers and sanitized webhook payloads only.

## Phase 6 - Notifications and Real-Time Experience

1. Create `notification-service` (port `4900`) to consume booking, payment, and tracking events.
2. Deliver email, SMS, push, WhatsApp, and in-app notifications through provider adapters and the outbox table.
3. Add WebSocket/SSE gateway for trip-location updates and booking state changes.
4. Persist tracking history and expose ETA and geofence alerts.

## Phase 7 - Super Admin and Analytics

1. Add Super Admin views for operators, user moderation, trips, payments, refunds, commissions, coupons, and audit logs.
2. Create `analytics-service` (port `5000`) to consume events into MongoDB rollups and PostgreSQL reporting views.
3. Report revenue, bookings, conversion, cancellations, seat occupancy, operator performance, and notification delivery.

## Phase 8 - Mobile Foundation

1. Create `mobile/` with Expo and TypeScript.
2. Share API contracts and design tokens with the Ionic frontend.
3. Add authentication storage, trip search, seat map, booking, tickets, tracking, and push-notification registration.

## Phase 9 - Production Delivery

1. Add environment-specific Docker Compose, CI checks, migrations, secrets management, and image publishing.
2. Deploy services to Kubernetes or a managed container platform with separate databases, backups, and network policies.
3. Add OpenTelemetry tracing, structured logs, metrics, health/readiness checks, alerts, rate limits, WAF rules, and disaster-recovery runbooks.
