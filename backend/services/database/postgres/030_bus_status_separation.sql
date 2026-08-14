BEGIN;

ALTER TABLE buses
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN IF NOT EXISTS operational_status TEXT NOT NULL DEFAULT 'INACTIVE';

UPDATE buses SET
  approval_status = CASE
    WHEN status::text = 'REJECTED' THEN 'REJECTED'
    WHEN status::text = 'PENDING_APPROVAL' THEN 'PENDING_APPROVAL'
    ELSE 'APPROVED'
  END,
  operational_status = CASE
    WHEN status::text = 'ACTIVE' THEN 'ACTIVE'
    WHEN status::text = 'SUSPENDED' THEN 'SUSPENDED'
    WHEN status::text = 'RETIRED' THEN 'RETIRED'
    ELSE 'INACTIVE'
  END;

ALTER TABLE buses DROP CONSTRAINT IF EXISTS buses_approval_status_check;
ALTER TABLE buses ADD CONSTRAINT buses_approval_status_check
  CHECK (approval_status IN ('PENDING_APPROVAL', 'APPROVED', 'REJECTED'));
ALTER TABLE buses DROP CONSTRAINT IF EXISTS buses_operational_status_check;
ALTER TABLE buses ADD CONSTRAINT buses_operational_status_check
  CHECK (operational_status IN ('INACTIVE', 'ACTIVE', 'MAINTENANCE', 'SUSPENDED', 'RETIRED'));

COMMIT;
