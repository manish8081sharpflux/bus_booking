BEGIN;

-- Align the fleet lifecycle with the product workflow.
ALTER TYPE bus_status ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TABLE buses ADD COLUMN IF NOT EXISTS deck_type TEXT NOT NULL DEFAULT 'SINGLE';
ALTER TABLE buses ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE buses ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES platform_users(id);
ALTER TABLE buses ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS bus_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bus_id UUID NOT NULL UNIQUE REFERENCES buses(id) ON DELETE CASCADE,
  registration_date DATE, insurance_number TEXT NOT NULL, insurance_expiry DATE NOT NULL,
  permit_number TEXT NOT NULL, permit_expiry DATE NOT NULL, fitness_certificate_number TEXT NOT NULL,
  fitness_expiry DATE NOT NULL, puc_number TEXT, puc_expiry DATE, verification_status TEXT NOT NULL DEFAULT 'PENDING',
  verified_by UUID REFERENCES platform_users(id), verified_at TIMESTAMPTZ, rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS bus_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, file_path TEXT NOT NULL, original_file_name TEXT NOT NULL, mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL, verification_status TEXT NOT NULL DEFAULT 'PENDING', rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(bus_id, document_type)
);

CREATE TABLE IF NOT EXISTS route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_order SMALLINT NOT NULL CHECK(stop_order > 0), city TEXT NOT NULL, location_name TEXT NOT NULL,
  address TEXT, is_boarding_allowed BOOLEAN NOT NULL DEFAULT TRUE, is_dropping_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(route_id, stop_order)
);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION generate_trip_inventory(p_trip_id UUID) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE inserted_count INTEGER;
BEGIN
  INSERT INTO trip_seat_inventory(trip_id, bus_seat_id, status)
  SELECT p_trip_id, bs.id, 'AVAILABLE' FROM trips t JOIN bus_seats bs ON bs.bus_id=t.bus_id
  WHERE t.id=p_trip_id AND bs.is_active ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT; RETURN inserted_count;
END $$;

CREATE OR REPLACE FUNCTION release_expired_seat_holds() RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE released_count INTEGER;
BEGIN
  UPDATE trip_seat_inventory SET status='AVAILABLE', hold_token=NULL, hold_expires_at=NULL, booking_id=NULL, updated_at=NOW()
  WHERE status='HELD' AND hold_expires_at < NOW();
  GET DIAGNOSTICS released_count = ROW_COUNT; RETURN released_count;
END $$;

COMMIT;
