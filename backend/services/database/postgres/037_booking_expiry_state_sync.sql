BEGIN;

CREATE OR REPLACE FUNCTION release_expired_seat_holds()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  -- First make the booking lifecycle match the expired payment window.
  UPDATE bookings
  SET status='EXPIRED',
      updated_at=NOW()
  WHERE status='PENDING_PAYMENT'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- Segment allocations are authoritative for point-to-point seat occupancy.
  DELETE FROM trip_seat_segment_allocations
  WHERE status='HELD'
    AND expires_at < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;

  -- Keep legacy/full-trip inventory in sync as well.
  UPDATE trip_seat_inventory
  SET status='AVAILABLE',
      hold_token=NULL,
      hold_expires_at=NULL,
      booking_id=NULL,
      updated_at=NOW()
  WHERE status='HELD'
    AND hold_expires_at < NOW();

  RETURN released_count;
END
$$;

COMMIT;