# Architecture-First Implementation Phases

## Phase 0 - Stop unsafe expansion

1. Add CI for lint, type-check, unit, integration, contract, build, dependency/security scans.
2. Introduce migration runner, secrets validation, structured logging/redaction, graceful shutdown, readiness checks, and correlation IDs.
3. Block direct service browser access; route clients through gateway `/v1`.
4. Fix unauthenticated booking/tracking, weak JWT defaults, OTP exposure, and organization-level authorization before enabling new features.

## Phase 1 - Identity, tenancy, and database reconciliation

1. Migrate roles to target role/membership model with backward-compatible `ADMIN`/`OPERATOR`/`USER` mapping.
2. Make `operator_organization` and membership the single tenancy model.
3. Select one identity source of truth; add sessions/refresh, MFA, audit events, and permission policies.
4. Apply versioned schema migrations with backfill and rollback runbooks.

## Phase 2 - Operations foundation

1. Build operations modules for fleet, catalog/scheduling, pricing, and inventory holds.
2. Publish catalog/inventory events through transactional outbox; build idempotent search projection.
3. Deliver operator-admin/staff portal APIs and screens with scoped policies.

## Phase 3 - Customer booking vertical slice

1. Implement trip search, seat map, hold, passenger details, pricing snapshot, booking intent, and expiry.
2. Add payment provider integration with verified webhooks and refunds.
3. Confirm bookings, issue tickets, notify customers, and show booking history.

## Phase 4 - Realtime and operations

1. Secure driver/device tracking ingestion, realtime customer location feed, ETA, delay and boarding notifications.
2. Add Super Admin governance, compliance, audit search, support and review workflows.

## Phase 5 - Reporting and production

1. Build event-driven analytics, settlement/reconciliation, dashboards, and export controls.
2. Deploy KRaft Kafka, managed databases, backups, network segmentation, observability, autoscaling, and disaster recovery.

## ADR proposals

| ID | Proposal | Decision to validate |
| --- | --- | --- |
| ADR-001 | Gateway-only public API | Adopt immediately. |
| ADR-002 | Organization membership as tenant boundary | Adopt immediately. |
| ADR-003 | Modular operations service before Fleet/Catalog/Inventory split | Adopt initially. |
| ADR-004 | Transactional outbox plus consumer inbox | Adopt for all domain events. |
| ADR-005 | KRaft for new Kafka deployments | Adopt; retain ZooKeeper only until the current local topology is replaced. |
| ADR-006 | Contract-first internal packages | Adopt before TypeScript service rollout. |
| ADR-007 | One identity source of truth | Decide PostgreSQL vs Mongo before migration. |
| ADR-008 | Payment and settlement co-located initially | Adopt, then extract settlement only for finance scale/regulation. |
