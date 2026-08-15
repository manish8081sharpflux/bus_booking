BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS bus_seats_physical_position_uq
  ON bus_seats(bus_id, deck, row_number, column_number);
COMMIT;