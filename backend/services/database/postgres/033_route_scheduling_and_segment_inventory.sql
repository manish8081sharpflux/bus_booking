BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS latitude NUMERIC(9,6);
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6);
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS arrival_offset_minutes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE route_stops ADD COLUMN IF NOT EXISTS departure_offset_minutes INTEGER NOT NULL DEFAULT 0;

ALTER TABLE route_stops DROP CONSTRAINT IF EXISTS route_stops_offset_order_check;
ALTER TABLE route_stops ADD CONSTRAINT route_stops_offset_order_check CHECK (
  arrival_offset_minutes >= 0 AND
  departure_offset_minutes >= arrival_offset_minutes
);
ALTER TABLE route_stops DROP CONSTRAINT IF EXISTS route_stops_coordinates_check;
ALTER TABLE route_stops ADD CONSTRAINT route_stops_coordinates_check CHECK (
  (latitude IS NULL AND longitude IS NULL) OR
  (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS contact_number TEXT;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS scheduled_arrival_at TIMESTAMPTZ;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS scheduled_departure_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS route_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  bus_id UUID NOT NULL REFERENCES buses(id),
  service_number TEXT NOT NULL,
  departure_time TIME NOT NULL,
  base_fare NUMERIC(12,2) NOT NULL CHECK (base_fare > 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('DAILY','WEEKDAYS','SELECTED_DAYS')),
  selected_days SMALLINT[] NOT NULL DEFAULT '{}',
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','PAUSED','ENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_on >= starts_on),
  CHECK (recurrence_type <> 'SELECTED_DAYS' OR cardinality(selected_days) > 0),
  UNIQUE (operator_id, service_number, route_id, bus_id, starts_on)
);

CREATE TABLE IF NOT EXISTS route_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES route_schedule_templates(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('CANCEL','CHANGE')),
  departure_time TIME,
  bus_id UUID REFERENCES buses(id),
  base_fare NUMERIC(12,2) CHECK (base_fare > 0),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (schedule_id, exception_date)
);

ALTER TABLE trips ADD COLUMN IF NOT EXISTS schedule_template_id UUID REFERENCES route_schedule_templates(id) ON DELETE SET NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS service_date DATE;
CREATE UNIQUE INDEX IF NOT EXISTS trips_schedule_service_date_key
  ON trips(schedule_template_id, service_date) WHERE schedule_template_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS trip_seat_segment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  bus_seat_id UUID NOT NULL REFERENCES bus_seats(id),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  origin_stop_order SMALLINT NOT NULL,
  destination_stop_order SMALLINT NOT NULL,
  segment_range INT4RANGE GENERATED ALWAYS AS
    (int4range(origin_stop_order, destination_stop_order, '[)')) STORED,
  status TEXT NOT NULL DEFAULT 'HELD' CHECK (status IN ('HELD','CONFIRMED')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (destination_stop_order > origin_stop_order),
  UNIQUE (booking_id, bus_seat_id)
);

ALTER TABLE trip_seat_segment_allocations
  DROP CONSTRAINT IF EXISTS trip_seat_segment_allocations_no_overlap;
ALTER TABLE trip_seat_segment_allocations
  ADD CONSTRAINT trip_seat_segment_allocations_no_overlap
  EXCLUDE USING gist (
    trip_id WITH =,
    bus_seat_id WITH =,
    segment_range WITH &&
  );

CREATE INDEX IF NOT EXISTS route_schedule_templates_active_idx
  ON route_schedule_templates(operator_id, starts_on, ends_on) WHERE status='ACTIVE';
CREATE INDEX IF NOT EXISTS trip_segment_allocations_lookup_idx
  ON trip_seat_segment_allocations(trip_id, bus_seat_id, origin_stop_order, destination_stop_order);

CREATE OR REPLACE FUNCTION release_expired_seat_holds() RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE released_count INTEGER;
BEGIN
  DELETE FROM trip_seat_segment_allocations
  WHERE status='HELD' AND expires_at < NOW();
  GET DIAGNOSTICS released_count = ROW_COUNT;

  UPDATE trip_seat_inventory
  SET status='AVAILABLE', hold_token=NULL, hold_expires_at=NULL, booking_id=NULL, updated_at=NOW()
  WHERE status='HELD' AND hold_expires_at < NOW();
  RETURN released_count;
END $$;

COMMIT;
