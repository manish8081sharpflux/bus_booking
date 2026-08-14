BEGIN;

UPDATE bus_seats
SET side = 'SIDE'
WHERE side IS NULL OR side NOT IN ('LEFT', 'RIGHT', 'SIDE');

ALTER TABLE bus_seats ALTER COLUMN side SET DEFAULT 'SIDE';
ALTER TABLE bus_seats ALTER COLUMN side SET NOT NULL;
ALTER TABLE bus_seats DROP CONSTRAINT IF EXISTS bus_seats_side_check;
ALTER TABLE bus_seats ADD CONSTRAINT bus_seats_side_check
  CHECK (side IN ('LEFT', 'RIGHT', 'SIDE'));

COMMIT;
