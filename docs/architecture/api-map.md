# API Map

## Current routes and inconsistencies

| Public intent | Current direct service route | Gateway route | Client behavior | Issue |
| --- | --- | --- | --- | --- |
| Health | `GET /health` per HTTP service | gateway only at `:4000/health` | none | No readiness/dependency health distinction. |
| Auth | `/auth/*` on 4100 | `/api/auth/*` | Admin defaults to `http://localhost:4100` | Gateway prefix differs from client default. |
| Operators | `/operators/*` on 4600 | `/api/operators/*` | Customer/admin default to 4600 | Browser bypasses gateway. |
| Booking | `/bookings/*` on 4200 | `/api/bookings/*` | no client | Public mutation and no contract. |
| Search | `/search/trips` on 4300 | `/api/search/trips` | no client | No catalogue writer. |
| Tracking | `/tracking/*` on 4400 | `/api/tracking/*` | no client | Public telemetry and location disclosure. |

## Target public API convention

- Gateway prefix: `/v1`; internal services do not expose public host ports in production.
- Resource paths use plural nouns: `/v1/organizations`, `/v1/buses`, `/v1/trips`, `/v1/bookings`, `/v1/payments`.
- Every command accepts `Idempotency-Key`; every response includes `requestId`.
- Use RFC 9457-style `application/problem+json` with stable machine error codes.
- API schemas are generated from `@bus/contracts`, versioned, and verified by provider/consumer contract tests.

## Target route groups

| Group | Gateway endpoint examples | Principal |
| --- | --- | --- |
| Identity | `/v1/auth/login`, `/v1/auth/refresh`, `/v1/me` | public/authenticated |
| Organizations | `/v1/organizations`, `/v1/organizations/:id/members` | Super Admin, Operator Admin |
| Fleet/catalog | `/v1/organizations/:id/buses`, `/v1/trips` | Operator staff by scope |
| Search | `/v1/search/trips`, `/v1/trips/:id/seat-map` | customer/public as policy permits |
| Holds/bookings | `/v1/trips/:id/seat-holds`, `/v1/bookings`, `/v1/bookings/:id/cancel` | customer/organization-scoped |
| Payments | `/v1/payments/orders`, `/v1/payments/webhooks/:provider` | customer/provider only |
| Tracking | `/v1/trips/:id/location`, `/v1/trips/:id/live` | scoped driver/customer |
