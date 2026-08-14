ALTER TABLE operator_staff DROP CONSTRAINT IF EXISTS operator_staff_role_check;
ALTER TABLE operator_staff ADD CONSTRAINT operator_staff_role_check
  CHECK (role IN ('MANAGER','BOOKING_STAFF','DRIVER','CONDUCTOR','ACCOUNTANT','ROUTE_MANAGER','SUPPORT'));

ALTER TABLE operator_staff ADD COLUMN IF NOT EXISTS identity_user_id UUID REFERENCES identity_users(id);
CREATE UNIQUE INDEX IF NOT EXISTS operator_staff_identity_user_idx
  ON operator_staff(identity_user_id) WHERE identity_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS operator_staff_permission_overrides (
  staff_id UUID NOT NULL REFERENCES operator_staff(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,
  granted_by UUID REFERENCES identity_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(staff_id,permission_code)
);

INSERT INTO identity_permissions(code) VALUES
 ('trip.operate'),('boarding.read'),('boarding.manage')
ON CONFLICT(code) DO NOTHING;
