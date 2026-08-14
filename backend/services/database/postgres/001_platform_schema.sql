BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE platform_role AS ENUM ('SUPER_ADMIN', 'OPERATOR', 'CUSTOMER');
CREATE TYPE operator_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');
CREATE TYPE bus_status AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE trip_status AS ENUM ('DRAFT', 'SCHEDULED', 'BOARDING', 'DEPARTED', 'COMPLETED', 'CANCELLED');
CREATE TYPE seat_status AS ENUM ('AVAILABLE', 'HELD', 'BOOKED', 'BLOCKED');
CREATE TYPE booking_status AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED', 'PARTIALLY_CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');
CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP', 'IN_APP');
CREATE TYPE notification_status AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED');

CREATE TABLE platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id TEXT UNIQUE NOT NULL,
  role platform_role NOT NULL DEFAULT 'CUSTOMER',
  full_name TEXT NOT NULL,
  mobile VARCHAR(20) UNIQUE NOT NULL,
  email CITEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES platform_users(id),
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  registration_number TEXT,
  tax_identifier TEXT,
  support_mobile VARCHAR(20) NOT NULL,
  support_email CITEXT,
  address JSONB NOT NULL DEFAULT '{}'::JSONB,
  status operator_status NOT NULL DEFAULT 'PENDING',
  approved_by UUID REFERENCES platform_users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (owner_user_id, legal_name)
);

CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  registration_number CITEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  bus_type TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  manufacture_year SMALLINT,
  seat_capacity SMALLINT NOT NULL CHECK (seat_capacity > 0),
  amenities JSONB NOT NULL DEFAULT '[]'::JSONB,
  status bus_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bus_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES buses(id) ON DELETE CASCADE,
  seat_number VARCHAR(10) NOT NULL,
  deck SMALLINT NOT NULL DEFAULT 1 CHECK (deck > 0),
  row_number SMALLINT NOT NULL CHECK (row_number > 0),
  column_number SMALLINT NOT NULL CHECK (column_number > 0),
  seat_type TEXT NOT NULL DEFAULT 'SEATER',
  is_window BOOLEAN NOT NULL DEFAULT FALSE,
  is_female_reserved BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (bus_id, seat_number)
);

CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  source_city TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  distance_km NUMERIC(8,2),
  estimated_duration_minutes INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_city <> destination_city)
);

CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  bus_id UUID NOT NULL REFERENCES buses(id),
  route_id UUID NOT NULL REFERENCES routes(id),
  service_number TEXT NOT NULL,
  departure_at TIMESTAMPTZ NOT NULL,
  arrival_at TIMESTAMPTZ NOT NULL,
  boarding_closes_at TIMESTAMPTZ,
  status trip_status NOT NULL DEFAULT 'DRAFT',
  base_fare NUMERIC(12,2) NOT NULL CHECK (base_fare >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (arrival_at > departure_at),
  UNIQUE (bus_id, departure_at)
);

CREATE TABLE trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  stop_order SMALLINT NOT NULL CHECK (stop_order > 0),
  city TEXT NOT NULL,
  location_name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  arrival_at TIMESTAMPTZ,
  departure_at TIMESTAMPTZ,
  is_boarding_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  is_dropping_allowed BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (trip_id, stop_order)
);

CREATE TABLE trip_fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  origin_stop_id UUID NOT NULL REFERENCES trip_stops(id),
  destination_stop_id UUID NOT NULL REFERENCES trip_stops(id),
  seat_type TEXT NOT NULL,
  fare NUMERIC(12,2) NOT NULL CHECK (fare >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  UNIQUE (trip_id, origin_stop_id, destination_stop_id, seat_type),
  CHECK (origin_stop_id <> destination_stop_id)
);

CREATE TABLE trip_seat_inventory (
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  bus_seat_id UUID NOT NULL REFERENCES bus_seats(id),
  status seat_status NOT NULL DEFAULT 'AVAILABLE',
  hold_token UUID,
  hold_expires_at TIMESTAMPTZ,
  booking_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trip_id, bus_seat_id),
  CHECK ((status <> 'HELD') OR (hold_token IS NOT NULL AND hold_expires_at IS NOT NULL))
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference VARCHAR(20) NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES platform_users(id),
  operator_id UUID NOT NULL REFERENCES operators(id),
  trip_id UUID NOT NULL REFERENCES trips(id),
  origin_stop_id UUID NOT NULL REFERENCES trip_stops(id),
  destination_stop_id UUID NOT NULL REFERENCES trip_stops(id),
  status booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  subtotal_amount NUMERIC(12,2) NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  expires_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (origin_stop_id <> destination_stop_id)
);

ALTER TABLE trip_seat_inventory
  ADD CONSTRAINT trip_seat_inventory_booking_fk
  FOREIGN KEY (booking_id) REFERENCES bookings(id) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE booking_passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  bus_seat_id UUID NOT NULL REFERENCES bus_seats(id),
  full_name TEXT NOT NULL,
  age SMALLINT CHECK (age > 0),
  gender TEXT,
  identity_type TEXT,
  identity_value TEXT,
  fare_amount NUMERIC(12,2) NOT NULL CHECK (fare_amount >= 0),
  UNIQUE (booking_id, bus_seat_id)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id),
  provider TEXT NOT NULL,
  provider_order_id TEXT,
  provider_payment_id TEXT UNIQUE,
  idempotency_key UUID NOT NULL UNIQUE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status payment_status NOT NULL DEFAULT 'PENDING',
  method TEXT,
  failure_code TEXT,
  failure_message TEXT,
  provider_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  provider_refund_id TEXT UNIQUE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status payment_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES platform_users(id),
  booking_id UUID REFERENCES bookings(id),
  channel notification_channel NOT NULL,
  template_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status notification_status NOT NULL DEFAULT 'QUEUED',
  provider_message_id TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE trip_location_history (
  id BIGSERIAL PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  speed_kph NUMERIC(6,2),
  heading NUMERIC(6,2),
  recorded_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID REFERENCES platform_users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX trips_search_idx ON trips (status, departure_at);
CREATE INDEX routes_city_idx ON routes (source_city, destination_city);
CREATE INDEX bookings_customer_idx ON bookings (customer_id, created_at DESC);
CREATE INDEX bookings_trip_idx ON bookings (trip_id, status);
CREATE INDEX inventory_hold_expiry_idx ON trip_seat_inventory (hold_expires_at) WHERE status = 'HELD';
CREATE INDEX notifications_dispatch_idx ON notification_outbox (status, scheduled_for);
CREATE INDEX location_trip_time_idx ON trip_location_history (trip_id, recorded_at DESC);
CREATE INDEX audit_entity_idx ON audit_logs (entity_type, entity_id, created_at DESC);

COMMIT;
