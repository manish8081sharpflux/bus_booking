# Security Model

## Target principals and authorization

| Principal | Scope |
| --- | --- |
| `SUPER_ADMIN` | Platform-wide governance; cannot impersonate or alter financial records without audited break-glass policy. |
| `OPERATOR_ADMIN` | One or more organization memberships; manages staff, fleet, trips, fares, and assigned operational data. |
| `OPERATOR_STAFF` | Explicit permissions within organization (for example dispatch or support); no staff management by default. |
| `CUSTOMER` | Own profile, holds, bookings, tickets, payments, reviews, and support cases. |

Every resource authorization evaluates `principal`, action, organization ID, resource owner, and assigned scope. Role checks alone are insufficient.

## Required controls

- Central identity issues asymmetric or securely rotated signing keys, short-lived access tokens, rotating refresh tokens, revocation/session controls, MFA for privileged accounts, and rate-limited verification flows.
- Gateway validates JWTs, enforces TLS, CORS allowlists, request size/time limits, rate limits, request IDs, and route-level authorization before proxying.
- Services re-authorize resource ownership; service-to-service calls use workload identity, not user tokens or shared secrets.
- Validate all input with schemas; use parameterized SQL, allowlisted sort columns, output DTOs, and standardized errors.
- Encrypt secrets in a secret manager, encrypt data in transit/at rest, minimize PII, redact logs/events, and define retention/deletion policies.
- Payment webhooks verify provider signatures and idempotency; OTPs are hashed, never logged or returned, and guarded by IP/mobile/device throttles.

## Current security defects

- Default JWT secret can permit token forgery if deployed unchanged.
- Booking and tracking lack authentication/authorization.
- Operator list/read is role-wide rather than organization-scoped.
- Admin UI ships a `SupabaseAdapter` name but uses the custom auth service; its Supabase configuration is unrelated and confusing.
- Customer reCAPTCHA is client-only and does not provide server-side protection.
- CORS is not consistently enabled across services; no CSP, CSRF posture, rate limits, or secure cookie/session policy is defined.
