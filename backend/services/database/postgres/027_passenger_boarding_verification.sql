CREATE TABLE IF NOT EXISTS passenger_boarding_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES booking_passengers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','BOARDED','NO_SHOW')),
  verification_method TEXT CHECK (verification_method IN ('QR','OTP','MANUAL')),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES platform_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, passenger_id)
);

CREATE INDEX IF NOT EXISTS passenger_boarding_booking_status_idx
  ON passenger_boarding_verifications (booking_id, status);

INSERT INTO passenger_boarding_verifications (booking_id, passenger_id)
SELECT bp.booking_id, bp.id FROM booking_passengers bp
JOIN bookings b ON b.id=bp.booking_id AND b.status='CONFIRMED'
ON CONFLICT (booking_id, passenger_id) DO NOTHING;
