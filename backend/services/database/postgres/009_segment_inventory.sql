BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE inventory_allocation_status AS ENUM ('HELD', 'CONFIRMED', 'BLOCKED', 'RELEASED', 'EXPIRED', 'CANCELLED');
CREATE TYPE inventory_hold_status AS ENUM ('ACTIVE', 'CONFIRMED', 'RELEASED', 'EXPIRED', 'FAILED_PAYMENT', 'ADMIN_RELEASED');
CREATE TYPE inventory_waitlist_status AS ENUM ('WAITING', 'OFFERED', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

CREATE TABLE inventory_trip_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE,
  physical_seat_id UUID NOT NULL REFERENCES fleet_layout_seats(id),
  seat_label VARCHAR(16) NOT NULL,
  layout_version_id UUID NOT NULL REFERENCES fleet_layout_versions(id),
  inventory_version BIGINT NOT NULL DEFAULT 1,
  is_operator_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_instance_id, physical_seat_id),
  UNIQUE (trip_instance_id, seat_label)
);

CREATE TABLE inventory_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES identity_users(id),
  origin_stop_sequence SMALLINT NOT NULL CHECK (origin_stop_sequence > 0),
  destination_stop_sequence SMALLINT NOT NULL CHECK (destination_stop_sequence > origin_stop_sequence),
  idempotency_key UUID NOT NULL UNIQUE,
  status inventory_hold_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  max_expires_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  confirmed_booking_id UUID,
  version BIGINT NOT NULL DEFAULT 1,
  CHECK (expires_at <= max_expires_at),
  CHECK (max_expires_at > created_at)
);
CREATE INDEX inventory_holds_expiry_idx ON inventory_holds (expires_at) WHERE status = 'ACTIVE';

CREATE TABLE inventory_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE,
  inventory_trip_seat_id UUID NOT NULL REFERENCES inventory_trip_seats(id) ON DELETE CASCADE,
  physical_seat_id UUID NOT NULL REFERENCES fleet_layout_seats(id),
  segment_range INT4RANGE NOT NULL,
  hold_id UUID REFERENCES inventory_holds(id) ON DELETE SET NULL,
  booking_id UUID,
  status inventory_allocation_status NOT NULL,
  expires_at TIMESTAMPTZ,
  release_reason TEXT,
  version BIGINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT isempty(segment_range)),
  CHECK ((status = 'HELD' AND hold_id IS NOT NULL AND expires_at IS NOT NULL) OR status <> 'HELD'),
  CHECK ((status = 'CONFIRMED' AND booking_id IS NOT NULL) OR status <> 'CONFIRMED'),
  EXCLUDE USING gist (
    trip_instance_id WITH =,
    physical_seat_id WITH =,
    segment_range WITH &&
  ) WHERE (status IN ('HELD', 'CONFIRMED', 'BLOCKED'))
);
CREATE UNIQUE INDEX inventory_confirmed_booking_seat_idx ON inventory_allocations (booking_id, inventory_trip_seat_id) WHERE status = 'CONFIRMED';
CREATE INDEX inventory_active_allocations_idx ON inventory_allocations (trip_instance_id, inventory_trip_seat_id) WHERE status IN ('HELD', 'CONFIRMED', 'BLOCKED');

CREATE TABLE inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  movement_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id),
  allocation_id UUID REFERENCES inventory_allocations(id),
  hold_id UUID REFERENCES inventory_holds(id),
  inventory_trip_seat_id UUID REFERENCES inventory_trip_seats(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('HOLD_CREATED', 'HOLD_CHANGED', 'HOLD_RELEASED', 'HOLD_EXPIRED', 'ALLOCATION_CONFIRMED', 'ALLOCATION_CANCELLED', 'SEAT_BLOCKED', 'SEAT_UNBLOCKED', 'RECONCILIATION_RELEASE')),
  actor_user_id UUID REFERENCES identity_users(id),
  request_id UUID,
  idempotency_key UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX inventory_movements_trip_idx ON inventory_movements (trip_instance_id, occurred_at DESC);

CREATE TABLE inventory_waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES identity_users(id),
  origin_stop_sequence SMALLINT NOT NULL CHECK (origin_stop_sequence > 0),
  destination_stop_sequence SMALLINT NOT NULL CHECK (destination_stop_sequence > origin_stop_sequence),
  seat_preferences JSONB NOT NULL DEFAULT '{}'::JSONB,
  status inventory_waitlist_status NOT NULL DEFAULT 'WAITING',
  offer_hold_id UUID REFERENCES inventory_holds(id),
  offer_expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (trip_instance_id, customer_id, origin_stop_sequence, destination_stop_sequence)
);
CREATE INDEX inventory_waitlist_offer_idx ON inventory_waitlist_entries (trip_instance_id, status, created_at);

CREATE TABLE segment_inventory_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id),
  aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('HOLD', 'ALLOCATION', 'WAITLIST')),
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('seat.hold_created.v1', 'seat.hold_released.v1', 'seat.hold_expired.v1', 'seat.allocation_confirmed.v1', 'seat.allocation_released.v1', 'seat.waitlist_offered.v1')),
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  publish_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX segment_inventory_outbox_unpublished_idx ON segment_inventory_outbox (occurred_at) WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION inventory_prevent_ledger_mutation() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Inventory movement ledger is immutable' USING ERRCODE = 'insufficient_privilege'; END; $$;
CREATE TRIGGER inventory_ledger_immutable BEFORE UPDATE OR DELETE ON inventory_movements FOR EACH ROW EXECUTE FUNCTION inventory_prevent_ledger_mutation();

CREATE OR REPLACE FUNCTION inventory_assert_allocation_seat_snapshot() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE allocation_trip UUID; seat_trip UUID; expected_physical_seat UUID;
BEGIN
  SELECT trip_instance_id, physical_seat_id INTO seat_trip, expected_physical_seat FROM inventory_trip_seats WHERE id = NEW.inventory_trip_seat_id;
  allocation_trip := NEW.trip_instance_id;
  IF seat_trip IS NULL OR seat_trip <> allocation_trip OR expected_physical_seat <> NEW.physical_seat_id THEN
    RAISE EXCEPTION 'Allocation seat must belong to the inventory snapshot for its trip' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER inventory_allocation_snapshot_guard BEFORE INSERT OR UPDATE ON inventory_allocations FOR EACH ROW EXECUTE FUNCTION inventory_assert_allocation_seat_snapshot();

COMMIT;
