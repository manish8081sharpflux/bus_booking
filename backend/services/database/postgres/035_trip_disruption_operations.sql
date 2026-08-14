BEGIN;

ALTER TABLE trips ADD COLUMN IF NOT EXISTS declared_delay_minutes INTEGER NOT NULL DEFAULT 0 CHECK(declared_delay_minutes >= 0);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS declared_delay_reason TEXT;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS declared_delay_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS breakdown_status TEXT NOT NULL DEFAULT 'NONE' CHECK(breakdown_status IN ('NONE','REPORTED','REPLACEMENT_PENDING','RESOLVED','CANCELLED'));

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS failure_message TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS refunds_trip_cancel_booking_key ON refunds(booking_id) WHERE booking_id IS NOT NULL AND reason LIKE 'Operator trip cancellation%';

CREATE TABLE IF NOT EXISTS trip_tracker_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('GPS_DEVICE','DRIVER_PHONE','CONDUCTOR_PHONE')),
  source_identifier TEXT NOT NULL,
  assigned_by UUID REFERENCES platform_users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','INACTIVE')),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ,
  UNIQUE(trip_id,source_identifier)
);
CREATE UNIQUE INDEX IF NOT EXISTS trip_tracker_one_active_idx ON trip_tracker_assignments(trip_id) WHERE status='ACTIVE';

CREATE TABLE IF NOT EXISTS boarding_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS boarding_credentials_active_idx ON boarding_credentials(booking_id,expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS tracking_event_receipts (
  event_key TEXT PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  alerts_created INTEGER NOT NULL DEFAULT 0
);

COMMIT;
