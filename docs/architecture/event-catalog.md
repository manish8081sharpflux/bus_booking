# Event Catalog

## Current topics

| Topic | Producers | Consumers | Current payload/state |
| --- | --- | --- | --- |
| `booking.events` | booking-service | search-service, consumers | `booking.created` and `booking.cancelled`; no version, event ID, schema, or atomic outbox. |
| `tracking.events` | tracking-service | consumers | `tracking.updated`; no version, event ID, schema, or durable handler. |

## Target event envelope

```json
{
  "eventId": "uuid",
  "eventType": "booking.confirmed.v1",
  "occurredAt": "2026-08-04T00:00:00.000Z",
  "producer": "booking-service",
  "aggregate": { "type": "booking", "id": "uuid", "version": 4 },
  "organizationId": "uuid-or-null",
  "correlationId": "uuid",
  "data": {}
}
```

## Target topics

| Topic | Events | Required consumers |
| --- | --- | --- |
| `identity.events` | `user.created.v1`, `membership.changed.v1` | operator, reporting |
| `catalog.events` | `bus.published.v1`, `trip.published.v1`, `trip.cancelled.v1` | search, notification, reporting |
| `inventory.events` | `seat.held.v1`, `hold.expired.v1`, `seats.committed.v1`, `seats.released.v1` | booking, search, reporting |
| `booking.events` | `booking.pending_payment.v1`, `booking.confirmed.v1`, `booking.cancelled.v1` | payment, notification, ticketing, reporting |
| `payment.events` | `payment.captured.v1`, `payment.failed.v1`, `refund.completed.v1` | booking, settlement, notification, reporting |
| `tracking.events` | `trip.location_updated.v1`, `trip.delayed.v1`, `trip.arrived.v1` | notification, reporting |
| `customer-care.events` | `review.created.v1`, `case.opened.v1` | search, reporting |

## Delivery rules

- Write domain state and outbox record in one local transaction; publish asynchronously with retry.
- Consumers store `event_id` in an inbox/processed-events table before side effects, making repeats safe.
- Partition by aggregate ID, reject obsolete aggregate versions, and use retries plus a dead-letter topic with alerting.
- Never put secrets, credentials, full payment data, OTPs, or unnecessary PII in events.
