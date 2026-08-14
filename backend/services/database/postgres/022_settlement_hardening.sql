BEGIN;

ALTER TABLE operators
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2);

ALTER TABLE operators
  DROP CONSTRAINT IF EXISTS operators_commission_percent_check;
ALTER TABLE operators
  ADD CONSTRAINT operators_commission_percent_check
  CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100));

ALTER TABLE operator_settlements
  ADD COLUMN IF NOT EXISTS commission_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES platform_users(id),
  ADD COLUMN IF NOT EXISTS processing_at TIMESTAMPTZ;

ALTER TABLE operator_settlements
  DROP CONSTRAINT IF EXISTS operator_settlements_commission_percent_check;
ALTER TABLE operator_settlements
  ADD CONSTRAINT operator_settlements_commission_percent_check
  CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100));

CREATE INDEX IF NOT EXISTS operator_settlements_status_idx
  ON operator_settlements(status, period_end);

COMMIT;