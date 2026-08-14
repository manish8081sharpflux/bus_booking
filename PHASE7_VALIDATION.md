# Phase 7 validation checklist

1. Run migration `023_immutable_pricing_quotes.sql`.
2. Create a scheduled trip with seat fares.
3. Add an occupancy rule, e.g. >= 70% => +10%.
4. Add a last-minute rule, e.g. <= 24 hours => +₹50.
5. Search the route and confirm the `Live fare` starting price.
6. Open the seat map and confirm matching live prices.
7. Select seats/stops and continue to review.
8. Confirm a server quote is displayed with a quote reference and expiry.
9. Change the operator fare/rules in another browser after the quote is created.
10. Create the booking before quote expiry and verify the original quoted amount is preserved.
11. Try reusing the same quote; it must be rejected.
12. Let a quote expire and try creating the booking; it must be rejected.
13. Take a selected seat in another transaction before booking; booking creation must fail without changing the quote or charging payment.
14. Complete payment and verify payment amount equals `bookings.total_amount` from the frozen quote.
