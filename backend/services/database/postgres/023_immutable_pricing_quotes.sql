BEGIN;

CREATE TABLE IF NOT EXISTS booking_price_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_reference VARCHAR(28) NOT NULL UNIQUE,
  customer_id UUID REFERENCES platform_users(id) ON DELETE SET NULL,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  origin_stop_id UUID NOT NULL REFERENCES trip_stops(id),
  destination_stop_id UUID NOT NULL REFERENCES trip_stops(id),
  seat_ids UUID[] NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  base_subtotal NUMERIC(12,2) NOT NULL CHECK(base_subtotal >= 0),
  dynamic_adjustment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal_amount NUMERIC(12,2) NOT NULL CHECK(subtotal_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK(discount_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK(total_amount >= 0),
  promotion_id UUID REFERENCES pricing_promotions(id) ON DELETE SET NULL,
  coupon_code CITEXT,
  pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK(origin_stop_id <> destination_stop_id),
  CHECK(cardinality(seat_ids) > 0)
);

CREATE INDEX IF NOT EXISTS booking_price_quotes_trip_expiry_idx
  ON booking_price_quotes(trip_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS booking_price_quotes_open_idx
  ON booking_price_quotes(expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS price_quote_id UUID REFERENCES booking_price_quotes(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dynamic_adjustment_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS base_fare_amount NUMERIC(12,2);
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS pricing_adjustment_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

COMMIT;
