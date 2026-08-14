BEGIN;
UPDATE bus_seats SET side = 'SIDE' WHERE side = 'CENTER';
COMMIT;
