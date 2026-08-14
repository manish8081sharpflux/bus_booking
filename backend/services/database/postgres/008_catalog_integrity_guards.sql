BEGIN;

CREATE OR REPLACE FUNCTION catalog_assert_trip_stop_sequence() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE previous_departure TIMESTAMPTZ; next_arrival TIMESTAMPTZ;
BEGIN
  SELECT scheduled_departure_at INTO previous_departure FROM catalog_trip_stops WHERE trip_instance_id = NEW.trip_instance_id AND sequence_number = NEW.sequence_number - 1;
  SELECT scheduled_arrival_at INTO next_arrival FROM catalog_trip_stops WHERE trip_instance_id = NEW.trip_instance_id AND sequence_number = NEW.sequence_number + 1;
  IF previous_departure IS NOT NULL AND NEW.scheduled_arrival_at < previous_departure THEN RAISE EXCEPTION 'Trip stop time precedes the prior stop departure' USING ERRCODE = 'check_violation'; END IF;
  IF next_arrival IS NOT NULL AND NEW.scheduled_departure_at > next_arrival THEN RAISE EXCEPTION 'Trip stop departure follows the next stop arrival' USING ERRCODE = 'check_violation'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER catalog_trip_stop_sequence_guard BEFORE INSERT OR UPDATE ON catalog_trip_stops FOR EACH ROW EXECUTE FUNCTION catalog_assert_trip_stop_sequence();

CREATE OR REPLACE FUNCTION catalog_assert_assignment_tenant() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE trip_organization UUID; resource_organization UUID;
BEGIN
  SELECT operator_organization_id INTO trip_organization FROM catalog_trip_instances WHERE id = NEW.trip_instance_id;
  IF TG_TABLE_NAME = 'catalog_trip_vehicle_assignments' THEN SELECT operator_organization_id INTO resource_organization FROM fleet_vehicles WHERE id = NEW.vehicle_id;
  ELSE SELECT operator_organization_id INTO resource_organization FROM fleet_staff_profiles WHERE id = NEW.staff_id;
  END IF;
  IF trip_organization IS NULL OR resource_organization IS NULL OR trip_organization <> resource_organization THEN RAISE EXCEPTION 'Trip assignments must remain within the operator organization' USING ERRCODE = 'insufficient_privilege'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER catalog_trip_vehicle_assignment_tenant_guard BEFORE INSERT OR UPDATE ON catalog_trip_vehicle_assignments FOR EACH ROW EXECUTE FUNCTION catalog_assert_assignment_tenant();
CREATE TRIGGER catalog_trip_staff_assignment_tenant_guard BEFORE INSERT OR UPDATE ON catalog_trip_staff_assignments FOR EACH ROW EXECUTE FUNCTION catalog_assert_assignment_tenant();

COMMIT;
