BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'operator_cancellation_policies'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'operator_cancellation_policies'
      AND column_name = 'operator_id'
  ) THEN
    ALTER TABLE operator_cancellation_policies
      RENAME TO operator_cancellation_policies_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS operator_cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID NOT NULL UNIQUE REFERENCES operators(id) ON DELETE CASCADE,
  rules JSONB NOT NULL DEFAULT '[{"hoursBefore":24,"refundPercent":90},{"hoursBefore":12,"refundPercent":75},{"hoursBefore":6,"refundPercent":50},{"hoursBefore":2,"refundPercent":25},{"hoursBefore":0,"refundPercent":0}]'::jsonb,
  reschedule_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reschedule_cutoff_hours NUMERIC(6,2) NOT NULL DEFAULT 4 CHECK (reschedule_cutoff_hours >= 0),
  reschedule_fee NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (reschedule_fee >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
