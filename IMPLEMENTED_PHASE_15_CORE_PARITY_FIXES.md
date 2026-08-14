# Phase 15 - Core Customer Parity Fixes

Implemented after Phase 14 audit:
- Native multi-passenger checkout: one passenger record per selected seat.
- DEMO payment failure no longer navigates to a confirmed ticket.
- Native booking management with cancellation quote, cancellation reason, refund status, reschedule, review and support entry points.
- Native rescheduling using existing backend options, replacement inventory, boarding/drop selection, fare-difference quote and confirmation.
- Native completed-trip rating/review submission.
- Native customer support ticket creation and ticket history.
- Native search filters for bus type, departure window and rating sort.
- Broken web `/guest-booking` navigation removed until a secure guest retrieval flow is implemented.
- Added automated mobile parity QA checks.

Validation performed in the audit environment:
- Native smoke test: PASS.
- QA suite: 16/16 PASS.
- Targeted TypeScript syntax scan: no TS syntax/parser errors in modified TSX files. Full typecheck still requires the Expo/React Native dependencies to be installed.
