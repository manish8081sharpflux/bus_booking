BEGIN;

CREATE OR REPLACE FUNCTION release_expired_seat_holds()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  -- Expire bookings whose payment window has elapsed.
  UPDATE bookings
  SET status='EXPIRED',
      updated_at=NOW()
  WHERE status='PENDING_PAYMENT'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();

  -- A provider order that never captured should not remain locally active
  -- after its booking/payment window has expired.
  UPDATE payments p
  SET status='FAILED',
      failure_code=COALESCE(
        p.failure_code,
        'BOOKING_EXPIRED'
      ),
      failure_message=COALESCE(
        p.failure_message,
        'Booking payment window expired before payment capture.'
      ),
      updated_at=NOW()
  FROM bookings b
  WHERE p.booking_id=b.id
    AND p.status='PENDING'
    AND b.status='EXPIRED'
    AND b.expires_at IS NOT NULL
    AND b.expires_at < NOW();

  -- Segment allocations are authoritative for point-to-point occupancy.
  DELETE FROM trip_seat_segment_allocations
  WHERE status='HELD'
    AND expires_at < NOW();

  GET DIAGNOSTICS released_count = ROW_COUNT;

  -- Keep legacy/full-trip inventory in sync.
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