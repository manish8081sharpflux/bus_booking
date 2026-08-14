BEGIN;

CREATE TYPE fleet_vehicle_status AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED', 'RETIRED');
CREATE TYPE fleet_compliance_status AS ENUM ('PENDING', 'VALID', 'EXPIRED', 'REJECTED');
CREATE TYPE fleet_staff_role AS ENUM ('DRIVER', 'CONDUCTOR');
CREATE TYPE fleet_layout_kind AS ENUM ('SEATER', 'SLEEPER', 'SEMI_SLEEPER', 'MIXED');
CREATE TYPE fleet_seat_kind AS ENUM ('SEAT', 'SLEEPER_BERTH', 'SEMI_SLEEPER');

CREATE TABLE fleet_vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  layout_kind fleet_layout_kind NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fleet_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE RESTRICT,
  vehicle_type_id UUID NOT NULL REFERENCES fleet_vehicle_types(id),
  registration_number CITEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  manufacturing_year SMALLINT CHECK (manufacturing_year BETWEEN 1950 AND 2100),
  status fleet_vehicle_status NOT NULL DEFAULT 'DRAFT',
  suspended_reason TEXT,
  suspended_by UUID REFERENCES identity_users(id),
  suspended_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX fleet_vehicles_organization_idx ON fleet_vehicles (operator_organization_id, status);

CREATE TABLE fleet_vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('REGISTRATION', 'PERMIT', 'INSURANCE', 'FITNESS_CERTIFICATE', 'POLLUTION_CERTIFICATE')),
  document_number_encrypted TEXT,
  document_number_last4 VARCHAR(4),
  object_key TEXT NOT NULL UNIQUE CHECK (object_key !~ '^https?://'),
  declared_mime_type TEXT NOT NULL,
  detected_mime_type TEXT,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 CHAR(64) NOT NULL,
  malware_scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (malware_scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'FAILED')),
  status fleet_compliance_status NOT NULL DEFAULT 'PENDING',
  issued_at DATE,
  expires_at DATE,
  verified_by UUID REFERENCES identity_users(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vehicle_id, document_type, checksum_sha256)
);
CREATE INDEX fleet_documents_expiry_idx ON fleet_vehicle_documents (expires_at, status) WHERE expires_at IS NOT NULL;

CREATE TABLE fleet_vehicle_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE CHECK (object_key !~ '^https?://'),
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fleet_amenity_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fleet_vehicle_amenities (
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  amenity_id UUID NOT NULL REFERENCES fleet_amenity_definitions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vehicle_id, amenity_id)
);

CREATE TABLE fleet_layout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  layout_kind fleet_layout_kind NOT NULL,
  deck_count SMALLINT NOT NULL CHECK (deck_count IN (1, 2)),
  created_by UUID NOT NULL REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_organization_id, name)
);

CREATE TABLE fleet_layout_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES fleet_layout_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL CHECK (version_number > 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  published_by UUID REFERENCES identity_users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, version_number)
);
CREATE UNIQUE INDEX fleet_layout_one_published_idx ON fleet_layout_versions (template_id) WHERE status = 'PUBLISHED';

CREATE TABLE fleet_layout_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_version_id UUID NOT NULL REFERENCES fleet_layout_versions(id) ON DELETE CASCADE,
  deck_number SMALLINT NOT NULL CHECK (deck_number IN (1, 2)),
  label TEXT NOT NULL,
  UNIQUE (layout_version_id, deck_number)
);

CREATE TABLE fleet_layout_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_version_id UUID NOT NULL REFERENCES fleet_layout_versions(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES fleet_layout_decks(id) ON DELETE CASCADE,
  seat_label VARCHAR(16) NOT NULL,
  seat_kind fleet_seat_kind NOT NULL,
  row_number SMALLINT NOT NULL CHECK (row_number > 0),
  column_number SMALLINT NOT NULL CHECK (column_number > 0),
  side TEXT NOT NULL CHECK (side IN ('LEFT', 'RIGHT', 'CENTER')),
  position TEXT NOT NULL CHECK (position IN ('WINDOW', 'AISLE', 'MIDDLE')),
  berth_level TEXT CHECK (berth_level IN ('LOWER', 'UPPER')),
  features JSONB NOT NULL DEFAULT '{}'::JSONB,
  gender_display_rule TEXT NOT NULL DEFAULT 'NONE' CHECK (gender_display_rule IN ('NONE', 'PREFER_FEMALE_ADJACENCY', 'FEMALE_ONLY_SECTION')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (layout_version_id, seat_label),
  UNIQUE (layout_version_id, row_number, column_number, deck_id),
  CHECK ((seat_kind = 'SLEEPER_BERTH' AND berth_level IS NOT NULL) OR (seat_kind <> 'SLEEPER_BERTH'))
);

CREATE TABLE fleet_vehicle_layout_assignments (
  vehicle_id UUID PRIMARY KEY REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  layout_version_id UUID NOT NULL REFERENCES fleet_layout_versions(id),
  assigned_by UUID NOT NULL REFERENCES identity_users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE fleet_staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES identity_users(id),
  staff_role fleet_staff_role NOT NULL,
  full_name TEXT NOT NULL,
  phone VARCHAR(20),
  license_number_encrypted TEXT,
  license_number_last4 VARCHAR(4),
  license_expiry_date DATE,
  license_document_object_key TEXT CHECK (license_document_object_key IS NULL OR license_document_object_key !~ '^https?://'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_organization_id, user_id, staff_role)
);
CREATE INDEX fleet_staff_license_expiry_idx ON fleet_staff_profiles (license_expiry_date) WHERE license_expiry_date IS NOT NULL;

CREATE TABLE fleet_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES fleet_staff_profiles(id) ON DELETE RESTRICT,
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE RESTRICT,
  assigned_from TIMESTAMPTZ NOT NULL,
  assigned_until TIMESTAMPTZ,
  assigned_by UUID NOT NULL REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (assigned_until IS NULL OR assigned_until > assigned_from)
);

CREATE TABLE fleet_maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  maintenance_type TEXT NOT NULL,
  description TEXT,
  scheduled_start_at TIMESTAMPTZ NOT NULL,
  scheduled_end_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  blocks_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scheduled_end_at > scheduled_start_at)
);

CREATE TABLE fleet_vehicle_unavailability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  blocks_assignment BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID NOT NULL REFERENCES identity_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE fleet_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id) ON DELETE RESTRICT,
  aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('VEHICLE', 'LAYOUT', 'COMPLIANCE')),
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('vehicle.created.v1', 'vehicle.updated.v1', 'vehicle.compliance_changed.v1', 'vehicle.suspended.v1', 'seat_layout.published.v1')),
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  publish_attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
CREATE INDEX fleet_outbox_unpublished_idx ON fleet_outbox (occurred_at) WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION fleet_vehicle_is_publishable(candidate_vehicle_id UUID, at_time TIMESTAMPTZ DEFAULT NOW())
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM fleet_vehicles vehicle
    WHERE vehicle.id = candidate_vehicle_id
      AND vehicle.status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM fleet_vehicle_documents document
        WHERE document.vehicle_id = vehicle.id
          AND (document.status <> 'VALID' OR document.malware_scan_status <> 'CLEAN' OR (document.expires_at IS NOT NULL AND document.expires_at < at_time))
      )
      AND NOT EXISTS (
        SELECT 1 FROM fleet_maintenance_records record
        WHERE record.vehicle_id = vehicle.id AND record.blocks_assignment
          AND record.scheduled_start_at <= at_time AND record.scheduled_end_at >= at_time
      )
      AND NOT EXISTS (
        SELECT 1 FROM fleet_vehicle_unavailability unavailable
        WHERE unavailable.vehicle_id = vehicle.id AND unavailable.blocks_assignment
          AND unavailable.starts_at <= at_time AND unavailable.ends_at >= at_time
      )
  );
$$;

INSERT INTO fleet_vehicle_types (code, display_name, layout_kind) VALUES
  ('SEATER', 'Seater', 'SEATER'), ('SLEEPER', 'Sleeper', 'SLEEPER'),
  ('SEMI_SLEEPER', 'Semi Sleeper', 'SEMI_SLEEPER'), ('MIXED', 'Mixed', 'MIXED')
ON CONFLICT (code) DO NOTHING;

COMMIT;
