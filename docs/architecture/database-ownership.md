# Database Ownership

## Current violation map

| Store | Current writers | Problem |
| --- | --- | --- |
| PostgreSQL `bus_booking` | auth menu, booking, operator, proposed platform schema | Shared database with no schema ownership, conflicting legacy/new table identities, and runtime DDL. |
| Mongo auth DB | auth-service | Appropriate owner, but credentials/identity and platform roles are incomplete. |
| Mongo search DB | search-service | Appropriate read-model owner, but its source event lacks trip data. |
| Mongo projection DB | consumers | No durable projection currently written. |
| Redis | operator OTP and tracking | Different keyspaces without documented retention, ACLs, or availability policy. |

## Target ownership

| Service | Primary store | Owns |
| --- | --- | --- |
| Identity | PostgreSQL or Mongo (choose one) | accounts, credentials, sessions, MFA, roles; do not split identity truth across both. |
| Operator | PostgreSQL `operator` schema | organizations, memberships, compliance documents metadata. |
| Operations | PostgreSQL `operations` schema | buses, layouts, routes, trips, fares, seat inventory, outbox. |
| Booking | PostgreSQL `booking` schema | booking state, passengers, ticket record, outbox. |
| Payment | PostgreSQL `payment` schema | provider refs, refunds, ledger, settlement, outbox. |
| Notification | PostgreSQL `notification` + provider state | templates, delivery attempts, outbox/inbox. |
| Tracking | Redis for live position; PostgreSQL/Timescale for history | telemetry and retention policy. |
| Search/Reporting | Mongo/OpenSearch and warehouse/read DB | projections only, rebuilt from events. |

## Migration rules

1. Introduce a migration tool and migration ledger before applying `001`/`002`; never execute runtime `CREATE TABLE` in production services.
2. Reconcile legacy `operators` and `bookings` into target records with explicit ID mapping; do not mix numeric and UUID foreign keys.
3. Backfill source-of-truth events, build projections, verify counts/checksums, then switch reads behind a feature flag.
4. Keep a rollback document per migration: compatible code first, reversible data copy, cutover, then delayed destructive cleanup.
