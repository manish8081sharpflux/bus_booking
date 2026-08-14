BEGIN;

CREATE TABLE IF NOT EXISTS operator_cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL UNIQUE REFERENCES operators(id) ON DELETE CASCADE,
  rules JSONB NOT NULL DEFAULT '[{"hoursBefore":24,"refundPercent":90},{"hoursBefore":12,"refundPercent":75},{"hoursBefore":6,"refundPercent":50},{"hoursBefore":2,"refundPercent":25},{"hoursBefore":0,"refundPercent":0}]'::jsonb,
  reschedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reschedule_cutoff_hours NUMERIC(6,2) NOT NULL DEFAULT 4 CHECK (reschedule_cutoff_hours >= 0),
  reschedule_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reschedule_fee >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE booking_reschedules ADD COLUMN IF NOT EXISTS new_origin_stop_id UUID REFERENCES trip_stops(id);
ALTER TABLE booking_reschedules ADD COLUMN IF NOT EXISTS new_destination_stop_id UUID REFERENCES trip_stops(id);
ALTER TABLE booking_reschedules ADD COLUMN IF NOT EXISTS new_seat_ids UUID[];
ALTER TABLE booking_reschedules ADD COLUMN IF NOT EXISTS reschedule_fee NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE booking_reschedules ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE booking_reschedules ADD COLUMN IF NOT EXISTS payment_required NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE booking_reschedules ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS promotion_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promotion_id UUID NOT NULL REFERENCES pricing_promotions(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES platform_users(id),
  discount_amount NUMERIC(12,2) NOT NULL CHECK(discount_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS promotion_redemptions_promotion_idx ON promotion_redemptions(promotion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS promotion_redemptions_customer_idx ON promotion_redemptions(customer_id, promotion_id, created_at DESC);

ALTER TABLE pricing_promotions ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE pricing_promotions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pricing_promotions ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES operators(id) ON DELETE CASCADE;
ALTER TABLE pricing_promotions ADD COLUMN IF NOT EXISTS route_id UUID REFERENCES routes(id) ON DELETE CASCADE;

UPDATE pricing_promotions SET title = CASE WHEN discount_type='PERCENTAGE' THEN discount_value::text || '% off' ELSE '₹' || discount_value::text || ' off' END WHERE title IS NULL;
UPDATE pricing_promotions SET description = 'Save on eligible BusGo bookings.' WHERE description IS NULL;

COMMIT;
