# BusGo operations hardening update

This build adds the next admin/operations layer without inventing external-provider credentials.

## Added
- SUPER_ADMIN protection on every `/admin/*` operator-service endpoint using the shared JWT verifier.
- Live Trips admin API and responsive UI.
- Operator Settlements financial overview API and UI (captured collections less refunds; payout execution is intentionally not faked).
- Support & Disputes queue derived from cancelled bookings and failed payments.
- Audit Logs admin API and UI using the existing `audit_logs` table.
- Reports & Analytics API/UI with booking totals, confirmed value, cancellation rate inputs, top routes and top operators.
- Sidebar and routing entries for all new operations pages.

## External integrations still require configuration
- Real payment gateway order/capture/webhook/refund provider credentials.
- SMS, email, WhatsApp and push provider credentials.
- Driver/device GPS client and real-time WebSocket/SSE delivery.
- Bank/payout provider for actually executing operator settlements.

## Security note
Admin APIs are no longer public. The logged-in account must carry the `SUPER_ADMIN` role in the access token.
