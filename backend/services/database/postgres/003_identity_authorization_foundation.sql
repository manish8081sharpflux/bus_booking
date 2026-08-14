BEGIN;

CREATE TYPE identity_user_status AS ENUM ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'LOCKED', 'DELETED');
CREATE TYPE verification_channel AS ENUM ('EMAIL', 'PHONE');
CREATE TYPE organization_membership_status AS ENUM ('INVITED', 'ACTIVE', 'DEACTIVATED', 'REMOVED');

CREATE TABLE identity_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_auth_user_id TEXT UNIQUE,
  email CITEXT UNIQUE,
  phone VARCHAR(20) UNIQUE,
  display_name TEXT NOT NULL,
  status identity_user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  email_verified_at TIMESTAMPTZ,
  phone_verified_at TIMESTAMPTZ,
  password_hash TEXT NOT NULL,
  failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  token_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE identity_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN ('SUPER_ADMIN', 'OPERATOR_ADMIN', 'OPERATOR_STAFF', 'CUSTOMER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_role_permissions (
  role_id UUID NOT NULL REFERENCES identity_roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES identity_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE identity_global_roles (
  user_id UUID NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES identity_roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE operator_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status operator_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (legal_name)
);

CREATE TABLE identity_organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES identity_roles(id),
  status organization_membership_status NOT NULL DEFAULT 'INVITED',
  invited_by UUID REFERENCES identity_users(id),
  accepted_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_organization_id, user_id)
);

CREATE TABLE identity_refresh_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  family_id UUID NOT NULL,
  parent_session_id UUID REFERENCES identity_refresh_sessions(id),
  user_agent TEXT,
  ip_hash TEXT,
  trusted_device_id UUID,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoke_reason TEXT,
  replaced_by_session_id UUID REFERENCES identity_refresh_sessions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);

CREATE TABLE identity_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  channel verification_channel NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('EMAIL_VERIFY', 'PHONE_VERIFY', 'PASSWORD_RESET', 'MFA_RECOVERY')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at)
);

CREATE TABLE identity_mfa_configurations (
  user_id UUID PRIMARY KEY REFERENCES identity_users(id) ON DELETE CASCADE,
  totp_secret_encrypted TEXT NOT NULL,
  enabled_at TIMESTAMPTZ,
  recovery_code_hashes JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE,
  device_hash TEXT NOT NULL,
  label TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, device_hash)
);

CREATE TABLE identity_login_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES identity_users(id) ON DELETE SET NULL,
  identifier_hash TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  succeeded BOOLEAN NOT NULL,
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_security_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES identity_users(id) ON DELETE SET NULL,
  operator_organization_id UUID REFERENCES operator_organizations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES identity_users(id) ON DELETE SET NULL,
  request_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE identity_outbox (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  request_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  publish_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX identity_outbox_unpublished_idx ON identity_outbox (occurred_at) WHERE published_at IS NULL;

CREATE INDEX identity_sessions_user_idx ON identity_refresh_sessions (user_id, expires_at DESC);
CREATE INDEX identity_sessions_family_idx ON identity_refresh_sessions (family_id);
CREATE INDEX identity_tokens_active_idx ON identity_verification_tokens (user_id, purpose, expires_at) WHERE consumed_at IS NULL;
CREATE INDEX identity_login_attempts_identifier_idx ON identity_login_attempts (identifier_hash, created_at DESC);
CREATE INDEX identity_memberships_user_idx ON identity_organization_memberships (user_id, status);

INSERT INTO identity_roles (code) VALUES
  ('SUPER_ADMIN'), ('OPERATOR_ADMIN'), ('OPERATOR_STAFF'), ('CUSTOMER')
ON CONFLICT (code) DO NOTHING;

INSERT INTO identity_permissions (code) VALUES
  ('platform.manage'), ('operator.manage'), ('operator.approve'), ('operator.read'), ('fleet.manage'),
  ('catalog.manage'), ('trip.manage'), ('inventory.manage'), ('booking.read'), ('booking.manage'),
  ('refund.manage'), ('refund.approve'), ('staff.manage'), ('analytics.read'),
  ('notification.manage'), ('review.manage'), ('support.manage')
ON CONFLICT (code) DO NOTHING;

INSERT INTO identity_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM identity_roles role
CROSS JOIN identity_permissions permission
WHERE role.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO identity_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM identity_roles role
JOIN identity_permissions permission ON permission.code IN ('operator.manage', 'operator.read', 'fleet.manage', 'catalog.manage', 'trip.manage', 'inventory.manage', 'booking.read', 'booking.manage', 'refund.manage', 'staff.manage', 'analytics.read', 'notification.manage', 'review.manage', 'support.manage')
WHERE role.code = 'OPERATOR_ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO identity_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM identity_roles role
JOIN identity_permissions permission ON permission.code IN ('operator.read', 'fleet.manage', 'catalog.manage', 'trip.manage', 'inventory.manage', 'booking.read', 'booking.manage')
WHERE role.code = 'OPERATOR_STAFF'
ON CONFLICT DO NOTHING;

INSERT INTO identity_role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM identity_roles role
JOIN identity_permissions permission ON permission.code IN ('booking.read', 'booking.manage')
WHERE role.code = 'CUSTOMER'
ON CONFLICT DO NOTHING;

COMMIT;

-- Rollback requires confirming no dependent application data exists, then drop tables in reverse dependency order.
