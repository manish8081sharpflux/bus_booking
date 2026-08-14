# BusGo WhatsApp Booking Service

Inbound WhatsApp Cloud API webhook + conversational booking workflow.

Commands: `BOOK`, `STATUS <PNR>`, `RESET`, `HELP`.

Configure the Meta webhook callback to:

`https://YOUR_DOMAIN/api/whatsapp/webhook`

Use `WHATSAPP_VERIFY_TOKEN` as the webhook verify token and subscribe the app to the `messages` field.

## Local real-WhatsApp test mode (unofficial)

For localhost-only development, BusGo can use a WhatsApp Web linked-device session instead of Meta Cloud API.
This is intentionally isolated behind `WHATSAPP_PROVIDER=webjs` and must never be used in production.

1. Copy `.env.local-web.example` to `.env` and set the existing local DB/internal-service values.
2. Install this service: `npm --prefix backend/services/whatsapp-service install`
3. Start the booking/backend dependencies, then run: `npm --prefix backend/services/whatsapp-service run start:local-whatsapp`
4. Scan the terminal QR from a **separate WhatsApp account** that will act as the BusGo test sender.
5. From the allowed customer number configured in `WHATSAPP_TEST_CUSTOMER_NUMBER`, message that sender account with `HI` or `BOOK`.

No Meta access token, Meta phone-number ID, app secret, public webhook, tunnel, or approved template is required in this mode.
The same `conversation.js` booking engine is used; only the transport changes.

Security guard: when `WHATSAPP_TEST_CUSTOMER_NUMBER` is set, messages from other phone numbers are ignored and outbound messages to other numbers are blocked.
