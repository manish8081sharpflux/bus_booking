# Target-State Architecture

## Design principles

- Start with bounded modules and extract a service only for independent scaling, security, release cadence, or data ownership.
- The API gateway is the only public backend entry point. Browser and mobile clients never call internal service ports.
- PostgreSQL is partitioned by service-owned schema/database credentials; no service directly writes another service's tables.
- Commands use authenticated synchronous HTTP only where the caller needs the result. Integration events use Kafka with versioned envelopes and transactional outboxes.
- Every tenant-scoped command verifies both role and object membership.

## Proposed runtime boundaries

| Domain | Initial deployment boundary | Extract when |
| --- | --- | --- |
| Identity/Auth | `identity-service` | Keep separate now: credentials, sessions, MFA, and authorization are security-critical. |
| Operator | `operator-service` | Keep separate; owns organizations, staff memberships, compliance status. |
| Fleet + Catalog/Scheduling + Inventory | `operations-service` modular monolith | Split Fleet/Catalog from Inventory when seat-hold throughput or operational team ownership warrants it. Inventory must retain exclusive hold/commit authority. |
| Search | `search-service` | Keep separate read model; it consumes published trip, fare, availability, and review events. |
| Pricing/Promotions | Module in `operations-service` | Extract when rule evaluation, partner campaigns, or dynamic pricing become independently scaled. |
| Booking + Ticketing | `booking-service` modular boundary | Extract Ticketing only when QR validation/partner distribution requires separate scaling. |
| Payment + Settlement | `payment-service` modular boundary | Keep together initially because refunds, fees, ledger, and reconciliation are tightly coupled. |
| Notification | `notification-service` | Extract now once external SMS/email/push delivery is enabled. |
| Tracking | `tracking-service` | Keep separate for high-frequency telemetry and websocket/SSE fan-out. |
| Review + Support | Module in `customer-care-service` | Extract only for independently operated support tooling or high moderation volume. |
| Analytics + Audit/Compliance | `reporting-service` with immutable audit module | Separate read/reporting workloads; audit write capture remains in each command service's outbox. |

## System diagram

```mermaid
flowchart LR
  Customer[Customer Web / Mobile] --> Gateway[API Gateway / BFF]
  Admin[Super Admin / Operator Portal] --> Gateway
  Gateway --> Identity[Identity Service]
  Gateway --> Operator[Operator Service]
  Gateway --> Operations[Operations: Fleet, Catalog, Inventory, Pricing]
  Gateway --> Booking[Booking and Ticketing]
  Gateway --> Payment[Payment and Settlement]
  Gateway --> Search[Search Read API]
  Gateway --> Tracking[Tracking + Realtime]
  Gateway --> Care[Customer Care: Reviews + Support]
  Identity --> IdentityDB[(Identity DB)]
  Operator --> OperatorDB[(Operator DB)]
  Operations --> OperationsDB[(Operations DB)]
  Booking --> BookingDB[(Booking DB)]
  Payment --> PaymentDB[(Payment DB)]
  Search --> SearchDB[(Search Read Model)]
  Tracking --> Redis[(Redis)]
  Booking --> Kafka[(Kafka)]
  Operations --> Kafka
  Payment --> Kafka
  Tracking --> Kafka
  Kafka --> Search
  Kafka --> Notify[Notification Service]
  Kafka --> Reporting[Reporting Service]
  Notify --> Providers[Email / SMS / Push Providers]
```

## Container diagram

```mermaid
flowchart TB
  subgraph Edge
    Gateway[Gateway: auth, rate limits, routing, correlation]
  end
  subgraph Commands
    Identity
    Operator
    Operations
    Booking
    Payment
    Tracking
  end
  subgraph Async
    Kafka
    Notification
    Search
    Reporting
  end
  Gateway --> Commands
  Commands <--> Kafka
  Kafka --> Async
```

## Booking sequence

```mermaid
sequenceDiagram
  participant C as Customer
  participant G as Gateway
  participant B as Booking
  participant I as Inventory
  participant P as Payment
  participant K as Kafka
  C->>G: Create booking intent (idempotency key)
  G->>B: authenticated command
  B->>I: hold selected seats
  I-->>B: hold token, expiry, fare snapshot
  B->>B: transaction: intent + outbox
  B-->>C: pending payment + payment session
  C->>P: provider checkout
  P->>P: validate signed provider webhook
  P->>K: payment.captured.v1
  K->>B: payment event
  B->>I: commit hold
  B->>K: booking.confirmed.v1
```

## Payment sequence

```mermaid
sequenceDiagram
  participant B as Booking
  participant P as Payment
  participant X as Provider
  participant K as Kafka
  B->>P: create payment order (idempotency key)
  P->>P: transaction: payment + outbox
  P->>X: create provider order
  X-->>P: order identifier
  X->>P: signed webhook
  P->>P: verify signature + deduplicate
  P->>K: payment.captured.v1 or payment.failed.v1
```

## Cancellation sequence

```mermaid
sequenceDiagram
  participant C as Customer
  participant B as Booking
  participant P as Payment
  participant I as Inventory
  participant K as Kafka
  C->>B: cancel booking
  B->>B: validate owner and cancellation policy
  B->>P: request refund when eligible
  P->>K: refund.completed.v1
  K->>B: refund completed
  B->>I: release booked seats
  B->>K: booking.cancelled.v1
```
