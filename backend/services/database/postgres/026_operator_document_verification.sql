BEGIN;

ALTER TABLE operator_documents
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES platform_users(id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS operator_documents_verification_idx
  ON operator_documents(operator_id, verification_status);

COMMIT;