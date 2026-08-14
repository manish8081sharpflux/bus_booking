BEGIN;

ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS promotion_id UUID;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS customer_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES platform_users(id),
  operator_id UUID NOT NULL REFERENCES operators(id),
  trip_id UUID NOT NULL REFERENCES trips(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK(status IN ('PUBLISHED','HIDDEN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS customer_reviews_operator_idx ON customer_reviews(operator_id,status,created_at DESC);
CREATE INDEX IF NOT EXISTS customer_reviews_trip_idx ON customer_reviews(trip_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS booking_reschedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  old_trip_id UUID NOT NULL REFERENCES trips(id),
  new_trip_id UUID NOT NULL REFERENCES trips(id),
  old_total NUMERIC(12,2) NOT NULL,
  new_total NUMERIC(12,2) NOT NULL,
  fare_difference NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'REQUESTED' CHECK(status IN ('REQUESTED','PAYMENT_PENDING','CONFIRMED','FAILED','CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO pricing_promotions(code,status,discount_type,discount_value,max_discount_amount,starts_at,ends_at,usage_limit,per_user_limit,eligibility)
VALUES
 ('BUSGO10','ACTIVE','PERCENTAGE',10,150,NOW()-INTERVAL '1 day',NOW()+INTERVAL '180 days',10000,5,'{"minBookingAmount":500}'::jsonb),
 ('FIRST100','ACTIVE','FIXED',100,100,NOW()-INTERVAL '1 day',NOW()+INTERVAL '180 days',5000,1,'{"minBookingAmount":699}'::jsonb)
ON CONFLICT(code) DO NOTHING;

COMMIT;
