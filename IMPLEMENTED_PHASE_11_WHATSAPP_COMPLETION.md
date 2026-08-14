# Phase 11 — WhatsApp Booking Completion

Implemented on top of Phase 10 production hardening.

## Completed WhatsApp capabilities

- Meta interactive reply buttons and list messages.
- Interactive bus, boarding-point and dropping-point selection.
- `MY BOOKINGS` list connected to the same booking database.
- Booking management actions from WhatsApp.
- Cancellation quote with refund amount before confirmation.
- Cancellation from WhatsApp using the same cancellation/refund rules and payment provider integration as the booking backend.
- `TRACK <PNR>` and booking tracking links.
- Secure reschedule handoff to the existing BusGo reschedule workflow.
- Support/agent handoff with booking and conversation context persisted for staff.
- English/Hindi session preference foundation (`LANGUAGE`, `ENGLISH`, `HINDI`).
- Expired conversation recovery with Continue / Start over.
- Coupon retry/skip UX.
- Meta delivery status ingestion (`sent`, `delivered`, `read`, `failed`) into `whatsapp_message_events`.
- Outbound WhatsApp message persistence.
- Trusted WhatsApp-to-booking service APIs protected by `INTERNAL_SERVICE_KEY`.
- Booking cancellation notifications are queued back to WhatsApp.
- Existing payment-success flow already queues automatic WhatsApp booking confirmation.
- Production environment validation now requires the internal service key.

## Migration

Run migration `025_whatsapp_completion.sql`.

## Required environment values

Use the same strong random `INTERNAL_SERVICE_KEY` in booking-service and whatsapp-service.

```env
INTERNAL_SERVICE_KEY=<strong-random-secret>
WHATSAPP_CUSTOMER_APP_BASE_URL=https://busgo.example.com
WHATSAPP_TRACK_BASE_URL=https://busgo.example.com/track
```

Meta production credentials remain required for real delivery.

## Important production test

1. Send `BOOK`.
2. Complete bus/seat/boarding/drop/passenger selection.
3. Pay using the returned checkout link.
4. Confirm the WhatsApp booking-success message is delivered automatically.
5. Send `MY BOOKINGS`.
6. Open that booking and test Track, Cancel and Support.
7. Confirm `whatsapp_message_events` receives SENT/DELIVERED/READ updates from Meta.
