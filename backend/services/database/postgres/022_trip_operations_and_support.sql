BEGIN;

ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS landmark TEXT;
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS contact_number VARCHAR(20);
ALTER TABLE trip_stops ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS trip_fare_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK(rule_type IN ('DATE','WEEKEND','OCCUPANCY','LAST_MINUTE')),
  adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('PERCENTAGE','FIXED')),
  adjustment_value NUMERIC(12,2) NOT NULL,
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority SMALLINT NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS trip_fare_rules_trip_idx ON trip_fare_rules(trip_id,is_active,priority);

CREATE TABLE IF NOT EXISTS trip_disruptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  disruption_type TEXT NOT NULL CHECK(disruption_type IN ('CANCELLED','DELAYED','BUS_CHANGED','OTHER')),
  reason TEXT NOT NULL,
  delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK(delay_minutes >= 0),
  notify_customers BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES platform_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(24) NOT NULL UNIQUE,
  customer_id UUID REFERENCES platform_users(id),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES operators(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK(priority IN ('LOW','MEDIUM','HIGH','URGENT')),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','IN_PROGRESS','RESOLVED','CLOSED')),
  resolution TEXT,
  assigned_to UUID REFERENCES platform_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status,priority,created_at DESC);

COMMIT;
