BEGIN;

CREATE TABLE IF NOT EXISTS operator_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  mobile VARCHAR(20) NOT NULL,
  email CITEXT,
  role TEXT NOT NULL CHECK (role IN ('DRIVER','CONDUCTOR','MANAGER','SUPPORT')),
  license_number TEXT,
  license_expiry DATE,
  emergency_contact VARCHAR(20),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ON_LEAVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(operator_id, mobile)
);
CREATE INDEX IF NOT EXISTS operator_staff_operator_idx ON operator_staff(operator_id,status);

CREATE TABLE IF NOT EXISTS trip_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES operator_staff(id) ON DELETE RESTRICT,
  assignment_role TEXT NOT NULL CHECK (assignment_role IN ('DRIVER','CONDUCTOR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(trip_id, staff_id, assignment_role)
);

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS provider_payload JSONB NOT NULL DEFAULT '{}'::JSONB;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS operator_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL REFERENCES operators(id),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  refund_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  adjustment_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','APPROVED','PROCESSING','PAID','FAILED')),
  payout_reference TEXT,
  failure_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(operator_id,period_start,period_end)
);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider,provider_event_id)
);

CREATE TABLE IF NOT EXISTS notification_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notification_outbox(id) ON DELETE CASCADE,
  attempt_no INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('SENT','FAILED')),
  response_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_id,attempt_no)
);

COMMIT;
