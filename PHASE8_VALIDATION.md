# Phase 8 validation checklist

1. Run database migration 024.
2. Start booking-service, whatsapp-service, notification-service and api-gateway.
3. Verify `GET /api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=123` returns `123`.
4. Send `BOOK` from the test WhatsApp number.
5. Complete source/destination/date selection.
6. Confirm only available seats can be selected.
7. Verify the price shown comes from the Phase 7 immutable quote.
8. Confirm booking and verify seats become HELD for ten minutes.
9. Open the generated checkout URL.
10. Complete DEMO or configured real payment.
11. Verify booking becomes CONFIRMED and seat inventory becomes BOOKED.
12. Verify a WhatsApp `BOOKING_CONFIRMED` notification is queued/sent.
13. Send `STATUS <PNR>` from the same number and confirm the booking is returned.
14. Send the same webhook message ID twice and verify it is processed only once.
15. Send a bad Meta signature with `WHATSAPP_APP_SECRET` configured and verify HTTP 401.
