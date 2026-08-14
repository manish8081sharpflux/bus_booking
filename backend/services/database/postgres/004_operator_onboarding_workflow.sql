BEGIN;

CREATE TYPE operator_onboarding_status AS ENUM (
  'DRAFT', 'PHONE_VERIFIED', 'PROFILE_SUBMITTED', 'DOCUMENTS_PENDING',
  'UNDER_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'SUSPENDED', 'REJECTED'
);
CREATE TYPE operator_document_status AS ENUM ('PENDING_UPLOAD', 'PENDING_SCAN', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');
CREATE TYPE operator_review_decision AS ENUM ('APPROVED', 'REJECTED', 'SUSPENDED', 'REINSTATED', 'CHANGES_REQUESTED');

CREATE TABLE operator_onboarding_profiles (
  operator_organization_id UUID PRIMARY KEY REFERENCES operator_organizations(id) ON DELETE CASCADE,
  status operator_onboarding_status NOT NULL DEFAULT 'DRAFT',
  legal_entity_type TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trading_name TEXT,
  registration_number TEXT,
  tax_identifier_encrypted TEXT,
  tax_identifier_last4 VARCHAR(4),
  primary_phone VARCHAR(20) NOT NULL,
  primary_email CITEXT NOT NULL,
  registered_address JSONB NOT NULL,
  operational_address JSONB NOT NULL,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operator_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('PRIMARY', 'EMERGENCY', 'FINANCE', 'OPERATIONS')),
  full_name TEXT NOT NULL,
  role_title TEXT,
  phone VARCHAR(20),
  email CITEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (phone IS NOT NULL OR email IS NOT NULL)
);
CREATE UNIQUE INDEX operator_contacts_primary_idx ON operator_contacts (operator_organization_id, contact_type) WHERE is_primary;

CREATE TABLE operator_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  account_holder_name TEXT NOT NULL,
  account_number_encrypted TEXT NOT NULL,
  account_number_last4 VARCHAR(4) NOT NULL,
  routing_code_encrypted TEXT NOT NULL,
  routing_code_last4 VARCHAR(4),
  bank_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX operator_bank_accounts_primary_idx ON operator_bank_accounts (operator_organization_id) WHERE is_primary;

CREATE TABLE operator_document_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_entity_type TEXT,
  document_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  allowed_mime_types TEXT[] NOT NULL,
  allowed_extensions TEXT[] NOT NULL,
  max_size_bytes BIGINT NOT NULL CHECK (max_size_bytes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (legal_entity_type, document_type)
);

CREATE TABLE onboarding_operator_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  requirement_id UUID REFERENCES operator_document_requirements(id),
  document_type TEXT NOT NULL,
  status operator_document_status NOT NULL DEFAULT 'PENDING_UPLOAD',
  expiry_date DATE,
  approved_by UUID REFERENCES identity_users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_organization_id, document_type)
);

CREATE TABLE operator_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES onboarding_operator_documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  object_key TEXT NOT NULL UNIQUE,
  original_file_name TEXT NOT NULL,
  declared_mime_type TEXT NOT NULL,
  detected_mime_type TEXT,
  file_extension TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 CHAR(64) NOT NULL,
  malware_scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (malware_scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'FAILED')),
  uploaded_by UUID NOT NULL REFERENCES identity_users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scanned_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ,
  UNIQUE (document_id, version_number),
  CHECK (object_key !~ '^https?://')
);

CREATE TABLE operator_review_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
  assigned_reviewer_id UUID REFERENCES identity_users(id),
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operator_review_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES operator_review_cases(id) ON DELETE CASCADE,
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  decision operator_review_decision NOT NULL,
  reason_code TEXT,
  reason TEXT,
  decided_by UUID NOT NULL REFERENCES identity_users(id),
  request_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operator_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_case_id UUID NOT NULL REFERENCES operator_review_cases(id) ON DELETE CASCADE,
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  message TEXT NOT NULL,
  requested_by UUID NOT NULL REFERENCES identity_users(id),
  resolved_by UUID REFERENCES identity_users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE operator_terms_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  terms_version TEXT NOT NULL,
  accepted_by UUID NOT NULL REFERENCES identity_users(id),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_hash TEXT,
  user_agent_hash TEXT,
  UNIQUE (operator_organization_id, terms_version)
);

CREATE TABLE operator_service_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  country_code CHAR(2) NOT NULL,
  state_code TEXT,
  city TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_organization_id, country_code, state_code, city)
);

CREATE TABLE operator_cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  policy JSONB NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL,
  effective_to TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_organization_id, version)
);

CREATE TABLE operator_branding (
  operator_organization_id UUID PRIMARY KEY REFERENCES operator_organizations(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  logo_object_key TEXT,
  primary_color CHAR(7),
  support_url TEXT,
  updated_by UUID REFERENCES identity_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (logo_object_key IS NULL OR logo_object_key !~ '^https?://'),
  CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9A-Fa-f]{6}$')
);

CREATE TABLE operator_onboarding_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  publish_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX operator_onboarding_review_queue_idx ON operator_onboarding_profiles (status, submitted_at) WHERE status IN ('UNDER_REVIEW', 'CHANGES_REQUESTED');
CREATE INDEX onboarding_operator_document_expiry_idx ON onboarding_operator_documents (expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX operator_document_versions_scan_idx ON operator_document_versions (malware_scan_status, uploaded_at);
CREATE INDEX operator_onboarding_outbox_idx ON operator_onboarding_outbox (occurred_at) WHERE published_at IS NULL;

COMMIT;

-- Rollback: remove dependent onboarding tables in reverse order only after stopping all consumers.
