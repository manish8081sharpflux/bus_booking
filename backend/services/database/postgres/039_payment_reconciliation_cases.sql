BEGIN;

CREATE TABLE IF NOT EXISTS payment_reconciliation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  webhook_event_id UUID REFERENCES payment_webhook_events(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN','RESOLVED')),
  occurrence_count INTEGER NOT NULL DEFAULT 1
    CHECK (occurrence_count > 0),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_reconciliation_one_open_case_idx
  ON payment_reconciliation_cases(payment_id)
  WHERE status='OPEN';

CREATE INDEX IF NOT EXISTS payment_reconciliation_status_time_idx
  ON payment_reconciliation_cases(status,last_seen_at DESC);

COMMIT;