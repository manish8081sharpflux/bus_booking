BEGIN;

ALTER TABLE refunds
  ADD COLUMN IF NOT EXISTS operation_key TEXT;

ALTER TABLE refunds
  DROP CONSTRAINT IF EXISTS refunds_operation_key_format_chk;

ALTER TABLE refunds
  ADD CONSTRAINT refunds_operation_key_format_chk
  CHECK (
    operation_key IS NULL
    OR operation_key ~ '^[A-Za-z0-9_-]{10,200}$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS refunds_operation_key_unique_idx
  ON refunds(operation_key)
  WHERE operation_key IS NOT NULL;

COMMIT;