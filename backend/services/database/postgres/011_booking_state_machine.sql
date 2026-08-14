BEGIN;

CREATE TYPE booking_lifecycle_status AS ENUM ('DRAFT','SEATS_HELD','PAYMENT_PENDING','PAYMENT_PROCESSING','CONFIRMED','PAYMENT_FAILED','HOLD_EXPIRED','CANCELLATION_PENDING','PARTIALLY_CANCELLED','CANCELLED','REFUND_PENDING','REFUNDED','PARTIALLY_REFUNDED','TRIP_CANCELLED','COMPLETED','NO_SHOW');

CREATE TABLE booking_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(24) NOT NULL UNIQUE,
  customer_id UUID REFERENCES identity_users(id),
  guest_retrieval_token_hash TEXT UNIQUE,
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id),
  trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id),
  inventory_hold_id UUID REFERENCES inventory_holds(id),
  status booking_lifecycle_status NOT NULL DEFAULT 'DRAFT',
  idempotency_key UUID NOT NULL UNIQUE,
  trip_snapshot JSONB NOT NULL,
  operator_snapshot JSONB NOT NULL,
  vehicle_snapshot JSONB NOT NULL,
  stops_snapshot JSONB NOT NULL,
  cancellation_policy_snapshot JSONB NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  expires_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (customer_id IS NOT NULL OR guest_retrieval_token_hash IS NOT NULL)
);
CREATE INDEX booking_records_customer_idx ON booking_records (customer_id, created_at DESC);
CREATE INDEX booking_records_expiry_idx ON booking_records (expires_at) WHERE status IN ('DRAFT','SEATS_HELD','PAYMENT_PENDING','PAYMENT_PROCESSING');

CREATE TABLE booking_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, full_name TEXT NOT NULL, email CITEXT, phone VARCHAR(20) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE booking_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, origin_stop_sequence SMALLINT NOT NULL, destination_stop_sequence SMALLINT NOT NULL, origin_snapshot JSONB NOT NULL, destination_snapshot JSONB NOT NULL, CHECK (destination_stop_sequence > origin_stop_sequence), UNIQUE (booking_id, origin_stop_sequence, destination_stop_sequence)
);
CREATE TABLE booking_record_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, full_name TEXT NOT NULL, age SMALLINT CHECK (age > 0), gender_display TEXT, accessibility_needs JSONB NOT NULL DEFAULT '{}'::JSONB, passenger_snapshot JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE booking_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, passenger_id UUID REFERENCES booking_record_passengers(id), inventory_allocation_id UUID REFERENCES inventory_allocations(id), seat_label VARCHAR(16) NOT NULL, seat_snapshot JSONB NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','CANCELLED')), UNIQUE (booking_id, seat_label)
);
CREATE TABLE booking_fare_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL UNIQUE REFERENCES booking_records(id) ON DELETE CASCADE, subtotal_amount NUMERIC(12,2) NOT NULL, tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0, fee_amount NUMERIC(12,2) NOT NULL DEFAULT 0, discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0, wallet_credit_amount NUMERIC(12,2) NOT NULL DEFAULT 0, payable_amount NUMERIC(12,2) NOT NULL, currency CHAR(3) NOT NULL, pricing_snapshot JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (payable_amount >= 0)
);
CREATE TABLE booking_price_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, line_type TEXT NOT NULL CHECK (line_type IN ('BASE_FARE','TAX','FEE','DISCOUNT','WALLET_CREDIT')), code TEXT, description TEXT NOT NULL, amount NUMERIC(12,2) NOT NULL, metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);
CREATE TABLE booking_status_history (
  id BIGSERIAL PRIMARY KEY, booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, from_status booking_lifecycle_status, to_status booking_lifecycle_status NOT NULL, actor_type TEXT NOT NULL, actor_user_id UUID REFERENCES identity_users(id), request_id UUID, reason_code TEXT, metadata JSONB NOT NULL DEFAULT '{}'::JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE booking_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, requested_by UUID REFERENCES identity_users(id), reason TEXT, status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','COMPLETED')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ
);
CREATE TABLE booking_cancellation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), cancellation_request_id UUID NOT NULL REFERENCES booking_cancellation_requests(id) ON DELETE CASCADE, booking_seat_id UUID NOT NULL REFERENCES booking_seats(id), status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','CANCELLED','REJECTED')), refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (refund_amount >= 0), UNIQUE (cancellation_request_id, booking_seat_id)
);
CREATE TABLE booking_refund_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, cancellation_line_id UUID REFERENCES booking_cancellation_lines(id), amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0), currency CHAR(3) NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','REQUESTED','SETTLED','FAILED')), payment_refund_id UUID, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE booking_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id) ON DELETE CASCADE, note_type TEXT NOT NULL, body TEXT NOT NULL, visibility TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (visibility IN ('CUSTOMER','INTERNAL')), created_by UUID REFERENCES identity_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE booking_idempotency_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), idempotency_key UUID NOT NULL UNIQUE, operation TEXT NOT NULL, request_hash CHAR(64) NOT NULL, response_code INTEGER, response_body JSONB, booking_id UUID REFERENCES booking_records(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), completed_at TIMESTAMPTZ
);
CREATE TABLE booking_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL UNIQUE REFERENCES booking_records(id) ON DELETE CASCADE, state TEXT NOT NULL, payment_id UUID, last_error TEXT, next_retry_at TIMESTAMPTZ, retry_count INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE booking_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id), event_type TEXT NOT NULL, payload JSONB NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), published_at TIMESTAMPTZ, publish_attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT
);
CREATE INDEX booking_outbox_unpublished_idx ON booking_outbox (occurred_at) WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION booking_assert_transition() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NOT ((OLD.status='DRAFT' AND NEW.status IN ('SEATS_HELD','HOLD_EXPIRED')) OR (OLD.status='SEATS_HELD' AND NEW.status IN ('PAYMENT_PENDING','HOLD_EXPIRED','CANCELLED')) OR (OLD.status='PAYMENT_PENDING' AND NEW.status IN ('PAYMENT_PROCESSING','PAYMENT_FAILED','HOLD_EXPIRED')) OR (OLD.status='PAYMENT_PROCESSING' AND NEW.status IN ('CONFIRMED','PAYMENT_FAILED','HOLD_EXPIRED')) OR (OLD.status='CONFIRMED' AND NEW.status IN ('CANCELLATION_PENDING','PARTIALLY_CANCELLED','CANCELLED','TRIP_CANCELLED','COMPLETED','NO_SHOW')) OR (OLD.status='CANCELLATION_PENDING' AND NEW.status IN ('PARTIALLY_CANCELLED','CANCELLED','REFUND_PENDING')) OR (OLD.status IN ('CANCELLED','PARTIALLY_CANCELLED','TRIP_CANCELLED') AND NEW.status IN ('REFUND_PENDING','REFUNDED','PARTIALLY_REFUNDED')) OR (OLD.status='REFUND_PENDING' AND NEW.status IN ('REFUNDED','PARTIALLY_REFUNDED'))) THEN RAISE EXCEPTION 'Invalid booking state transition from % to %', OLD.status, NEW.status USING ERRCODE='check_violation'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER booking_transition_guard BEFORE UPDATE OF status ON booking_records FOR EACH ROW EXECUTE FUNCTION booking_assert_transition();

COMMIT;
