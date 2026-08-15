BEGIN;

ALTER TABLE operator_bank_details
  ADD COLUMN IF NOT EXISTS account_type TEXT;

ALTER TABLE operator_bank_details
  DROP CONSTRAINT IF EXISTS operator_bank_details_account_type_check;

ALTER TABLE operator_bank_details
  ADD CONSTRAINT operator_bank_details_account_type_check
  CHECK (
    account_type IS NULL OR
    account_type IN ('CURRENT', 'SAVINGS')
  );

COMMIT;