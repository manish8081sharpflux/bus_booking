# Phase 8 — WhatsApp Booking

Implemented a WhatsApp-first booking channel on top of the Phase 7 pricing/booking engine.

## Customer WhatsApp flow

`HI/MENU → BOOK → source → destination → date → bus → seat(s) → boarding → dropping → passengers → coupon → price quote → confirm → 10-minute seat hold → secure checkout link → payment → WhatsApp confirmation`

Other commands:

- `STATUS <PNR>` — booking status for the same WhatsApp mobile number
- `RESET` — restart conversation
- `HELP` — show supported commands

## Backend

New `whatsapp-service` on port `4700`:

- `GET /webhook` — Meta webhook verification
- `POST /webhook` — inbound messages, interactive replies, deduplication and booking state machine
- Meta request signature validation when `WHATSAPP_APP_SECRET` is configured
- Database-backed 30-minute conversation sessions
- Duplicate inbound-message protection using WhatsApp message IDs
- Uses the existing booking-service for search, inventory, immutable pricing quotes and booking creation

The API gateway exposes the webhook at `/api/whatsapp/webhook`. It proxies this route before JSON parsing so Meta's raw-body signature can be verified correctly.

## Secure WhatsApp checkout

A random 256-bit checkout token is generated after the seat hold. Only its SHA-256 hash is stored in PostgreSQL.

Frontend route:

`/whatsapp-checkout/:token`

Booking-service endpoints:

- `GET /bookings/whatsapp/checkout/:token`
- `POST /bookings/whatsapp/checkout/:token/order`
- `POST /bookings/whatsapp/checkout/:token/verify`
- `POST /bookings/whatsapp/checkout/:token/demo-complete`

The real-provider path uses the existing payment provider and server-side signature verification. DEMO remains available for local testing only.

## UI

The BusGo customer home page now has a **Book on WhatsApp** entry. Configure:

`VITE_BUSGO_WHATSAPP_NUMBER=91XXXXXXXXXX`

## Database

Run migration `024_whatsapp_booking.sql`. It adds:

- `whatsapp_booking_sessions`
- `whatsapp_message_events`
- `whatsapp_checkout_tokens`

## Meta configuration

Set values in `backend/services/whatsapp-service/.env`:

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_GRAPH_API_VERSION`
- `WHATSAPP_PAYMENT_BASE_URL`

Configure your public callback URL as:

`https://YOUR_DOMAIN/api/whatsapp/webhook`

For local testing without Meta credentials, outbound messages are logged to the console.

## Production note

The Graph API version is deliberately environment-configurable. Set it to the version supported by your current Meta app rather than depending on the example default forever. Business-initiated WhatsApp notifications outside the customer-service window should use approved Meta templates.
