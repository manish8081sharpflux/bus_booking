BEGIN;

ALTER TABLE payment_reconciliation_cases
  ADD COLUMN IF NOT EXISTS resolution_outcome TEXT;

ALTER TABLE payment_reconciliation_cases
  DROP CONSTRAINT IF EXISTS payment_reconciliation_resolution_outcome_chk;

ALTER TABLE payment_reconciliation_cases
  ADD CONSTRAINT payment_reconciliation_resolution_outcome_chk
  CHECK (
    resolution_outcome IS NULL
    OR resolution_outcome IN (
      'BOOKING_CONFIRMED',
      'FULLY_REFUNDED'
    )
  );

COMMIT;