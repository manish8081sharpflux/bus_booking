BEGIN;

CREATE TABLE IF NOT EXISTS trip_fare_history (
  id BIGSERIAL PRIMARY KEY,
  trip_fare_id UUID NOT NULL,
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  origin_stop_id UUID NOT NULL,
  destination_stop_id UUID NOT NULL,
  seat_type TEXT NOT NULL,
  old_fare NUMERIC(12,2),
  new_fare NUMERIC(12,2),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_trip_fare_change() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND OLD.fare IS DISTINCT FROM NEW.fare THEN
    INSERT INTO trip_fare_history(trip_fare_id,trip_id,origin_stop_id,destination_stop_id,seat_type,old_fare,new_fare)
    VALUES(OLD.id,OLD.trip_id,OLD.origin_stop_id,OLD.destination_stop_id,OLD.seat_type,OLD.fare,NEW.fare);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trip_fares_audit_trigger ON trip_fares;
CREATE TRIGGER trip_fares_audit_trigger AFTER UPDATE ON trip_fares
FOR EACH ROW EXECUTE FUNCTION audit_trip_fare_change();

CREATE OR REPLACE FUNCTION protect_booking_price_quote() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.trip_id IS DISTINCT FROM NEW.trip_id
    OR OLD.origin_stop_id IS DISTINCT FROM NEW.origin_stop_id
    OR OLD.destination_stop_id IS DISTINCT FROM NEW.destination_stop_id
    OR OLD.seat_ids IS DISTINCT FROM NEW.seat_ids
    OR OLD.base_subtotal IS DISTINCT FROM NEW.base_subtotal
    OR OLD.dynamic_adjustment_amount IS DISTINCT FROM NEW.dynamic_adjustment_amount
    OR OLD.subtotal_amount IS DISTINCT FROM NEW.subtotal_amount
    OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
    OR OLD.total_amount IS DISTINCT FROM NEW.total_amount
    OR OLD.currency IS DISTINCT FROM NEW.currency
    OR OLD.pricing_snapshot IS DISTINCT FROM NEW.pricing_snapshot THEN
    RAISE EXCEPTION 'Issued booking price quotes are immutable';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS booking_price_quotes_immutable_trigger ON booking_price_quotes;
CREATE TRIGGER booking_price_quotes_immutable_trigger BEFORE UPDATE ON booking_price_quotes
FOR EACH ROW EXECUTE FUNCTION protect_booking_price_quote();

COMMIT;
