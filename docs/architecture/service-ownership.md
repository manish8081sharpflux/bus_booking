# Service Ownership and Responsibility Matrix

## Tenant model

An `operator_organization` is the tenancy boundary. A user can be a `SUPER_ADMIN`, a `CUSTOMER`, or a member of one or more operator organizations as `OPERATOR_ADMIN` or `OPERATOR_STAFF`. Every operator resource includes `organization_id`; membership and scope are checked for every command and read.

| Feature | Owner | Writes | Consumes | Notes |
| --- | --- | --- | --- | --- |
| Credentials, MFA, sessions, roles | Identity | identity records | user lifecycle | Issues short-lived access tokens and rotating refresh tokens. |
| Operator organization/staff | Operator | organizations, memberships, compliance | identity events | Only Super Admin approves organizations. |
| Buses and seat layouts | Operations/Fleet module | buses, layouts | organization events | Operator-admin scoped. |
| Routes, stops, trips | Operations/Catalog module | routes, stops, trips | fleet events | Publishes catalog changes. |
| Holds and seat state | Operations/Inventory module | trip seat inventory | booking/payment events | Sole writer for seat availability. |
| Search | Search | denormalized documents | catalog, price, inventory, review events | Read-only API for customers. |
| Promotions/pricing | Operations/Pricing module | fare rules, promotions | catalog events | Snapshot price into booking. |
| Booking/tickets | Booking module | booking, passengers, ticket | inventory/payment events | Owns booking state machine. |
| Payments/refunds/settlement | Payment | payment, refund, ledger, payout | booking events | Provider webhooks are handled here only. |
| Notification | Notification | templates, delivery log | domain events | Owns provider retry and delivery status. |
| Live trip tracking | Tracking | current location/history | trip events | Emits delayed/arrival alerts. |
| Reviews/support | Customer Care | reviews, cases | completed-trip events | Review eligibility derives from booking events. |
| Analytics/audit | Reporting | rollups, immutable audit projections | all domain events | Never the source of operational truth. |

## Consumers decision

Remove the generic `consumers` service after its current placeholder work is migrated. A single worker hides ownership, makes unrelated failures share a deployment and consumer group, and encourages direct cross-domain writes. Each owning service consumes its own events; `notification-service`, `search-service`, and `reporting-service` run dedicated workers. A temporary `projection-worker` is acceptable only while it has one named projection owner, one topic family, its own idempotency store, and a retirement date.

## Candidate versioned internal packages

- `@bus/contracts`: versioned HTTP DTOs, Kafka event envelopes, error codes, and JSON schemas; never service repositories.
- `@bus/authz`: JWT verification interfaces, principal types, policy helpers; identity remains token issuer.
- `@bus/observability`: structured logging, correlation IDs, metrics, tracing, redaction.
- `@bus/config`: typed environment validation and safe defaults.
- `@bus/testkit`: ephemeral Postgres/Kafka fixtures, contract-test helpers, and event assertions.
- `@bus/ui`: design tokens and reusable UI primitives for web/admin/mobile, without business API calls.
