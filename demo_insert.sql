BEGIN;

WITH op AS (
  INSERT INTO operators (owner_user_id, legal_name, display_name, registration_number, support_mobile, support_email, address, status)
  VALUES ('71000000-0000-0000-0000-000000000001'::uuid, 'Demo Travel Pvt Ltd', 'Demo Travel', 'OP-DEMO-1001', '+919999999999', 'demo@travels.local', '{"city":"Pune","state":"Maharashtra"}'::jsonb, 'APPROVED')
  ON CONFLICT (owner_user_id, legal_name) DO NOTHING
  RETURNING id
),
ins_bus AS (
  INSERT INTO buses (operator_id, registration_number, name, bus_type, manufacturer, model, manufacture_year, seat_capacity, amenities, status)
  SELECT o.id, 'MH12DEMO9901', 'Demo City Express', 'AC Sleeper', 'Ashok Leyland', 'Sleeper Deluxe', 2024, 24, '[]'::jsonb, 'ACTIVE'
  FROM operators o
  WHERE o.owner_user_id = '71000000-0000-0000-0000-000000000001'::uuid AND o.legal_name = 'Demo Travel Pvt Ltd'
  ON CONFLICT (registration_number) DO NOTHING
  RETURNING id, operator_id
),
ins_route AS (
  INSERT INTO routes (operator_id, source_city, destination_city, distance_km, estimated_duration_minutes, is_active)
  SELECT o.id, 'Pune', 'Mumbai', 192.5, 420, TRUE
  FROM operators o
  WHERE o.owner_user_id = '71000000-0000-0000-0000-000000000001'::uuid AND o.legal_name = 'Demo Travel Pvt Ltd'
  ON CONFLICT DO NOTHING
  RETURNING id, operator_id
),
ins_trip AS (
  INSERT INTO trips (operator_id, bus_id, route_id, service_number, departure_at, arrival_at, boarding_closes_at, status, base_fare, currency)
  SELECT o.id, b.id, r.id, 'DEMO-9901', '2026-08-12 07:30:00+05:30'::timestamptz, '2026-08-12 14:40:00+05:30'::timestamptz, '2026-08-12 07:00:00+05:30'::timestamptz, 'SCHEDULED', 1499.00, 'INR'
  FROM operators o
  JOIN buses b ON b.registration_number = 'MH12DEMO9901'
  JOIN routes r ON r.operator_id = o.id AND r.source_city = 'Pune' AND r.destination_city = 'Mumbai'
  WHERE o.owner_user_id = '71000000-0000-0000-0000-000000000001'::uuid AND o.legal_name = 'Demo Travel Pvt Ltd'
  ON CONFLICT DO NOTHING
  RETURNING id, trip_id
)
INSERT INTO trip_stops (trip_id, stop_order, city, location_name, address, is_boarding_allowed, is_dropping_allowed)
SELECT t.id, 1, 'Pune', 'Pune', 'Pune City Terminal', TRUE, FALSE
FROM trips t
JOIN buses b ON b.id = t.bus_id
WHERE b.registration_number = 'MH12DEMO9901' AND t.service_number = 'DEMO-9901'
ON CONFLICT (trip_id, stop_order) DO NOTHING;

INSERT INTO trip_stops (trip_id, stop_order, city, location_name, address, is_boarding_allowed, is_dropping_allowed)
SELECT t.id, 2, 'Mumbai', 'Mumbai', 'Mumbai Central Terminal', FALSE, TRUE
FROM trips t
JOIN buses b ON b.id = t.bus_id
WHERE b.registration_number = 'MH12DEMO9901' AND t.service_number = 'DEMO-9901'
ON CONFLICT (trip_id, stop_order) DO NOTHING;

INSERT INTO bus_seats (bus_id, seat_number, deck, row_number, column_number, seat_type, is_window, is_female_reserved, is_active, is_accessible)
SELECT b.id, x::text, 1, ((x - 1) / 4) + 1, ((x - 1) % 4) + 1, 'SEATER', ((x - 1) % 4) IN (0, 3), FALSE, TRUE, FALSE
FROM buses b
CROSS JOIN generate_series(1, 24) AS x
WHERE b.registration_number = 'MH12DEMO9901'
ON CONFLICT (bus_id, seat_number) DO NOTHING;

INSERT INTO trip_seat_inventory (trip_id, bus_seat_id, status, updated_at)
SELECT t.id, bs.id, 'AVAILABLE', NOW()
FROM trips t
JOIN buses b ON b.id = t.bus_id
JOIN bus_seats bs ON bs.bus_id = b.id
WHERE b.registration_number = 'MH12DEMO9901' AND t.service_number = 'DEMO-9901'
ON CONFLICT (trip_id, bus_seat_id) DO NOTHING;

COMMIT;

SELECT b.name AS bus_name,
       b.registration_number,
       o.display_name AS operator_name,
       r.source_city,
       r.destination_city,
       t.service_number,
       t.departure_at AT TIME ZONE 'Asia/Kolkata' AS departure_local,
       t.arrival_at AT TIME ZONE 'Asia/Kolkata' AS arrival_local,
       t.base_fare,
       (SELECT COUNT(*) FROM trip_seat_inventory i WHERE i.trip_id = t.id AND i.status = 'AVAILABLE') AS available_seats,
       (SELECT location_name FROM trip_stops ts WHERE ts.trip_id = t.id AND ts.is_boarding_allowed = TRUE ORDER BY stop_order LIMIT 1) AS boarding_point,
       (SELECT location_name FROM trip_stops ts WHERE ts.trip_id = t.id AND ts.is_dropping_allowed = TRUE ORDER BY stop_order LIMIT 1) AS dropping_point
FROM trips t
JOIN buses b ON b.id = t.bus_id
JOIN operators o ON o.id = t.operator_id
JOIN routes r ON r.id = t.route_id
WHERE b.registration_number = 'MH12DEMO9901' AND t.service_number = 'DEMO-9901';
