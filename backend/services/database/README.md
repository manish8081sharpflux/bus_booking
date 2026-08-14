# Database Foundation

This directory holds versioned database definitions for the platform. Run migrations with a dedicated migration account before starting services; do not rely on individual services to create production tables during startup.

## PostgreSQL

`postgres/001_platform_schema.sql` creates the shared transactional schema used by the operator, inventory, trip, booking, payment, notification, and analytics services.

For local Docker development, run:

```bash
docker compose exec -T postgres psql -U postgres -d bus_booking < database/postgres/001_platform_schema.sql
```

Run each migration once, in filename order. Production deployments should record executed migrations in the deployment pipeline before rolling out dependent services.

## MongoDB Collections

MongoDB is reserved for document-oriented identity and read models:

| Database | Collection | Owner |
| --- | --- | --- |
| `bus_auth` | `users` | auth-service |
| `bus_search` | `tripviews` | search-service |
| `bus_notifications` | `notificationlogs`, `templates` | notification-service |
| `bus_analytics` | `daily_metrics`, `event_rollups` | analytics-service |

Mongo models and indexes should be added in the service that owns each collection. PostgreSQL IDs are UUIDs so event payloads can be safely shared across services.

## Ownership Rules

- Services may read another service's data only through its API, events, or read model.
- Foreign keys are used inside the transactional schema during the initial foundation. When services are deployed independently, keep ownership boundaries by exposing IDs and events instead of cross-service database writes.
- Booking seat allocation must use the `trip_seat_inventory` row lock in the inventory service to prevent double booking.
