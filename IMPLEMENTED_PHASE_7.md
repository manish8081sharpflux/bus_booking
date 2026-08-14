# BusGo Phase 7 — Immutable Dynamic Pricing & Checkout Quotes

This phase closes the pricing-consistency gap between search, seat selection, checkout, booking and payment.

## Implemented

### Dynamic pricing evaluator
- Supports `WEEKEND`, `OCCUPANCY`, `LAST_MINUTE`, and `DATE` rules.
- Supports percentage and fixed-amount adjustments.
- Applies active rules in priority order.
- Captures each applied rule, before/after fare and delta.
- Search result starting fares and seat-map fares now use the same evaluator.

### Operator pricing UI
Trip Control Center now lets an operator configure the condition for each rule:
- weekend days,
- occupancy percentage range,
- hours before departure,
- specific travel date,
- adjustment type/value,
- priority,
- active/inactive state.

The backend validates rule ranges before saving.

### Immutable pricing quote
New endpoint:

```http
POST /api/bookings/pricing/quote
```

Input:

```json
{
  "tripId": "...",
  "originStopId": "...",
  "destinationStopId": "...",
  "seatIds": ["..."],
  "couponCode": "BUSGO10"
}
```

The server validates current availability, evaluates dynamic pricing, applies eligible coupon rules, stores a pricing snapshot and returns a five-minute quote.

### Booking consumes the quote
Creating a booking now requires `quoteId`.

The backend verifies that the quoted trip, stops and seats exactly match the booking request and that the quote is still valid and unused. It then stores the frozen pricing snapshot on the booking and passenger fare lines.

Changes to occupancy, pricing rules or fares after quote creation cannot change the amount for that checkout.

### Checkout UI
The customer review step now shows:
- quote reference,
- base seat subtotal,
- demand/timing adjustment,
- coupon discount,
- final payable amount,
- quote expiry,
- number of dynamic rules applied.

The booking button stays disabled until a valid server-side quote exists.

### Search UI
Search results show dynamically evaluated starting fares. A `Live fare` indicator appears when dynamic rules affect the displayed starting fare.

## Database
Run migration:

```text
023_immutable_pricing_quotes.sql
```

It adds:
- `booking_price_quotes`,
- immutable pricing snapshot fields on `bookings`,
- base/dynamic pricing breakdown on `booking_passengers`.

## Pricing lifecycle

```text
Operator fare + dynamic rules
          ↓
Search estimated live fare
          ↓
Seat map live fare
          ↓
Customer selects seats/stops
          ↓
POST /pricing/quote
          ↓
Server creates immutable 5-minute quote
          ↓
Customer reviews exact amount
          ↓
Create booking with quoteId
          ↓
Seats held for 10 minutes
          ↓
Payment uses booking's frozen total
```

## Validation completed
- Node syntax checks passed for modified backend JavaScript.
- Pricing evaluator was executed with occupancy + last-minute rules and produced the expected stacked fare.
- Modified customer/operator TSX files passed TypeScript syntax transpilation.
- Full frontend typecheck was not possible in the extracted package because dependencies/node_modules are intentionally absent.
