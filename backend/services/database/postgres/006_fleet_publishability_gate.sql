BEGIN;

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
        SELECT 1
        FROM unnest(ARRAY['REGISTRATION', 'PERMIT', 'INSURANCE', 'FITNESS_CERTIFICATE', 'POLLUTION_CERTIFICATE']) AS required(document_type)
        WHERE NOT EXISTS (
          SELECT 1 FROM fleet_vehicle_documents document
          WHERE document.vehicle_id = vehicle.id
            AND document.document_type = required.document_type
            AND document.status = 'VALID'
            AND document.malware_scan_status = 'CLEAN'
            AND (document.expires_at IS NULL OR document.expires_at >= at_time)
        )
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

COMMIT;

-- Rollback: restore the prior implementation from migration 005 only if no trip publication depends on mandatory-document enforcement.
