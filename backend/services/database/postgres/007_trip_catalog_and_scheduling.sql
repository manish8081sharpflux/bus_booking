BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TYPE catalog_trip_status AS ENUM ('DRAFT', 'VALIDATION_FAILED', 'READY', 'PUBLISHED', 'CANCELLED', 'COMPLETED');
CREATE TYPE catalog_alert_type AS ENUM ('DELAY', 'CANCELLATION', 'STOP_CHANGE', 'RESCHEDULE');

CREATE TABLE catalog_countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), iso_code CHAR(2) NOT NULL UNIQUE, name TEXT NOT NULL, time_zone TEXT NOT NULL
);
CREATE TABLE catalog_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), country_id UUID NOT NULL REFERENCES catalog_countries(id), code TEXT NOT NULL, name TEXT NOT NULL, UNIQUE (country_id, code)
);
CREATE TABLE catalog_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), region_id UUID REFERENCES catalog_regions(id), country_id UUID NOT NULL REFERENCES catalog_countries(id), canonical_name TEXT NOT NULL, normalized_name TEXT NOT NULL, latitude NUMERIC(9,6), longitude NUMERIC(9,6), time_zone TEXT NOT NULL, UNIQUE (country_id, normalized_name)
);
CREATE TABLE catalog_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), city_id UUID NOT NULL REFERENCES catalog_cities(id), canonical_name TEXT NOT NULL, normalized_name TEXT NOT NULL, latitude NUMERIC(9,6) NOT NULL, longitude NUMERIC(9,6) NOT NULL, address TEXT, time_zone TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE (city_id, normalized_name)
);

CREATE TABLE catalog_operator_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id), canonical_stop_id UUID NOT NULL REFERENCES catalog_stops(id), point_type TEXT NOT NULL CHECK (point_type IN ('BOARDING', 'DROPPING', 'BOTH')), landmark TEXT, contact_phone VARCHAR(20), navigation_url TEXT, instructions TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (operator_organization_id, canonical_stop_id, point_type)
);

CREATE TABLE catalog_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id), public_code TEXT NOT NULL, name TEXT NOT NULL, time_zone TEXT NOT NULL, active_version_id UUID, created_by UUID NOT NULL REFERENCES identity_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (operator_organization_id, public_code)
);
CREATE TABLE catalog_route_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), route_id UUID NOT NULL REFERENCES catalog_routes(id) ON DELETE CASCADE, version_number INTEGER NOT NULL CHECK (version_number > 0), status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')), created_by UUID NOT NULL REFERENCES identity_users(id), published_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (route_id, version_number)
);
ALTER TABLE catalog_routes ADD CONSTRAINT catalog_routes_active_version_fk FOREIGN KEY (active_version_id) REFERENCES catalog_route_versions(id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE catalog_route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), route_version_id UUID NOT NULL REFERENCES catalog_route_versions(id) ON DELETE CASCADE, canonical_stop_id UUID NOT NULL REFERENCES catalog_stops(id), sequence_number SMALLINT NOT NULL CHECK (sequence_number > 0), default_arrival_offset_minutes INTEGER NOT NULL CHECK (default_arrival_offset_minutes >= 0), default_departure_offset_minutes INTEGER NOT NULL CHECK (default_departure_offset_minutes >= default_arrival_offset_minutes), allow_boarding BOOLEAN NOT NULL DEFAULT TRUE, allow_dropping BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE (route_version_id, sequence_number), UNIQUE (route_version_id, canonical_stop_id)
);
CREATE TABLE catalog_route_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), route_version_id UUID NOT NULL REFERENCES catalog_route_versions(id) ON DELETE CASCADE, from_route_stop_id UUID NOT NULL REFERENCES catalog_route_stops(id), to_route_stop_id UUID NOT NULL REFERENCES catalog_route_stops(id), sequence_number SMALLINT NOT NULL CHECK (sequence_number > 0), distance_km NUMERIC(10,2) NOT NULL CHECK (distance_km >= 0), duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 0), UNIQUE (route_version_id, sequence_number), CHECK (from_route_stop_id <> to_route_stop_id)
);

CREATE TABLE catalog_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id), route_version_id UUID NOT NULL REFERENCES catalog_route_versions(id), public_service_code TEXT NOT NULL, departure_local_time TIME NOT NULL, time_zone TEXT NOT NULL, horizon_days SMALLINT NOT NULL DEFAULT 90 CHECK (horizon_days BETWEEN 1 AND 365), status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')), version_number INTEGER NOT NULL DEFAULT 1, created_by UUID NOT NULL REFERENCES identity_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (operator_organization_id, public_service_code, version_number)
);
CREATE TABLE catalog_schedule_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), schedule_template_id UUID NOT NULL REFERENCES catalog_schedule_templates(id) ON DELETE CASCADE, starts_on DATE NOT NULL, ends_on DATE NOT NULL, monday BOOLEAN NOT NULL DEFAULT FALSE, tuesday BOOLEAN NOT NULL DEFAULT FALSE, wednesday BOOLEAN NOT NULL DEFAULT FALSE, thursday BOOLEAN NOT NULL DEFAULT FALSE, friday BOOLEAN NOT NULL DEFAULT FALSE, saturday BOOLEAN NOT NULL DEFAULT FALSE, sunday BOOLEAN NOT NULL DEFAULT FALSE, CHECK (ends_on >= starts_on), CHECK (monday OR tuesday OR wednesday OR thursday OR friday OR saturday OR sunday)
);
CREATE TABLE catalog_schedule_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), schedule_template_id UUID NOT NULL REFERENCES catalog_schedule_templates(id) ON DELETE CASCADE, service_date DATE NOT NULL, exception_type TEXT NOT NULL CHECK (exception_type IN ('ADDED', 'REMOVED', 'OVERRIDDEN')), override_departure_local_time TIME, override_route_version_id UUID REFERENCES catalog_route_versions(id), reason TEXT, created_by UUID NOT NULL REFERENCES identity_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (schedule_template_id, service_date)
);

CREATE TABLE catalog_trip_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id), schedule_template_id UUID REFERENCES catalog_schedule_templates(id), route_version_id UUID NOT NULL REFERENCES catalog_route_versions(id), public_trip_code TEXT NOT NULL, service_date DATE NOT NULL, time_zone TEXT NOT NULL, scheduled_departure_at TIMESTAMPTZ NOT NULL, scheduled_arrival_at TIMESTAMPTZ NOT NULL, status catalog_trip_status NOT NULL DEFAULT 'DRAFT', published_at TIMESTAMPTZ, cancelled_at TIMESTAMPTZ, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (scheduled_arrival_at > scheduled_departure_at), UNIQUE (operator_organization_id, public_trip_code, service_date)
);
CREATE TABLE catalog_trip_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE, route_stop_id UUID REFERENCES catalog_route_stops(id), operator_point_id UUID REFERENCES catalog_operator_points(id), sequence_number SMALLINT NOT NULL CHECK (sequence_number > 0), scheduled_arrival_at TIMESTAMPTZ NOT NULL, scheduled_departure_at TIMESTAMPTZ NOT NULL, estimated_arrival_at TIMESTAMPTZ, estimated_departure_at TIMESTAMPTZ, actual_arrival_at TIMESTAMPTZ, actual_departure_at TIMESTAMPTZ, allow_boarding BOOLEAN NOT NULL DEFAULT TRUE, allow_dropping BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE (trip_instance_id, sequence_number), CHECK (scheduled_departure_at >= scheduled_arrival_at)
);

CREATE TABLE catalog_trip_vehicle_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_instance_id UUID NOT NULL UNIQUE REFERENCES catalog_trip_instances(id) ON DELETE CASCADE, vehicle_id UUID NOT NULL REFERENCES fleet_vehicles(id), assignment_window TSTZRANGE NOT NULL, assigned_by UUID NOT NULL REFERENCES identity_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (NOT isempty(assignment_window)), EXCLUDE USING gist (vehicle_id WITH =, assignment_window WITH &&)
);
CREATE TABLE catalog_trip_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE, staff_id UUID NOT NULL REFERENCES fleet_staff_profiles(id), assignment_window TSTZRANGE NOT NULL, assigned_by UUID NOT NULL REFERENCES identity_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (NOT isempty(assignment_window)), UNIQUE (trip_instance_id, staff_id), EXCLUDE USING gist (staff_id WITH =, assignment_window WITH &&)
);
CREATE TABLE catalog_service_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE, alert_type catalog_alert_type NOT NULL, message TEXT NOT NULL, effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), details JSONB NOT NULL DEFAULT '{}'::JSONB, created_by UUID NOT NULL REFERENCES identity_users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE catalog_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), operator_organization_id UUID NOT NULL REFERENCES operator_organizations(id), aggregate_type TEXT NOT NULL CHECK (aggregate_type = 'TRIP'), aggregate_id UUID NOT NULL, event_type TEXT NOT NULL CHECK (event_type IN ('trip.created.v1', 'trip.published.v1', 'trip.modified.v1', 'trip.delayed.v1', 'trip.cancelled.v1', 'trip.completed.v1')), payload JSONB NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), published_at TIMESTAMPTZ, publish_attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT
);
CREATE INDEX catalog_trip_search_idx ON catalog_trip_instances (status, scheduled_departure_at);
CREATE INDEX catalog_trip_stops_boarding_idx ON catalog_trip_stops (trip_instance_id, allow_boarding, allow_dropping);
CREATE INDEX catalog_outbox_unpublished_idx ON catalog_outbox (occurred_at) WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION catalog_assert_trip_publication() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE assigned_vehicle UUID; trip_stop_count INTEGER;
BEGIN
  IF NEW.status <> 'PUBLISHED' OR OLD.status = 'PUBLISHED' THEN RETURN NEW; END IF;
  SELECT vehicle_id INTO assigned_vehicle FROM catalog_trip_vehicle_assignments WHERE trip_instance_id = NEW.id;
  SELECT COUNT(*) INTO trip_stop_count FROM catalog_trip_stops WHERE trip_instance_id = NEW.id;
  IF assigned_vehicle IS NULL OR trip_stop_count < 2 OR NOT fleet_vehicle_is_publishable(assigned_vehicle, NEW.scheduled_departure_at) THEN
    RAISE EXCEPTION 'Trip % cannot be published because it is incomplete or has a non-compliant vehicle', NEW.id USING ERRCODE = 'check_violation';
  END IF;
  IF EXISTS (SELECT 1 FROM catalog_trip_stops WHERE trip_instance_id = NEW.id AND scheduled_departure_at < NEW.scheduled_departure_at) THEN
    RAISE EXCEPTION 'Trip stop sequence begins before trip departure' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER catalog_trip_publication_guard BEFORE UPDATE OF status ON catalog_trip_instances FOR EACH ROW EXECUTE FUNCTION catalog_assert_trip_publication();

COMMIT;
