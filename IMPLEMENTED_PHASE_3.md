# BusGo Phase 3 implementation

This phase adds the production-oriented operational foundation requested after Phase 2.

## Implemented

- Payment provider abstraction with `DEMO` and Razorpay modes.
- Authenticated payment-order creation and server-side payment signature verification endpoints.
- Authenticated customer booking history, ticket access and cancellation ownership checks.
- Provider refund creation during cancellation, persisted in `refunds`.
- Notification worker with outbox polling, retries, attempt history and console/webhook provider adapters.
- Operator staff/driver management tables, API and responsive operator UI.
- Driver/conductor trip assignment API.
- Secured tracking writer endpoint using JWT role or device key.
- Persisted GPS history plus authenticated live-location/history reads.
- Settlement-period generation and mark-paid admin APIs.
- Migration `019_production_operations.sql` for staff, assignments, settlement records, webhook events, refund metadata and notification attempts.

## Environment configuration

Booking service:

```env
PAYMENT_PROVIDER=DEMO
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

Tracking service:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bus_booking
TRACKING_DEVICE_KEY=replace-with-a-long-random-secret
```

Notification service:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/bus_booking
SMS_PROVIDER=CONSOLE
SMS_WEBHOOK_URL=
EMAIL_PROVIDER=CONSOLE
EMAIL_WEBHOOK_URL=
WHATSAPP_PROVIDER=CONSOLE
WHATSAPP_WEBHOOK_URL=
```

Use `CONSOLE` for local development. Switch each channel to `WEBHOOK` and supply the URL for a provider adapter/gateway.

## Payment API flow

1. `POST /bookings/:id/payment/order` (customer bearer token)
2. Render provider checkout using returned order/public key.
3. `POST /bookings/:id/payment/verify` with `providerOrderId`, `providerPaymentId`, `signature`, `method`.
4. Server verifies the signature before confirming booking/inventory.

The old `/payment/complete` endpoint remains temporarily for backward-compatible local DEMO testing and should be removed after the customer UI has fully migrated to the provider checkout flow.

## Production deployment note

Actual provider success requires real Razorpay credentials, real notification provider endpoints and a secure tracking device key. The repository intentionally does not contain secrets.
