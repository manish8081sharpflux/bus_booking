BEGIN;

INSERT INTO platform_users (id, auth_user_id, role, full_name, mobile, email, is_active, created_at, updated_at)
VALUES ('9f3c0a80-12d1-4df5-9a81-2dca7f6e1a11'::uuid, 'demo-customer-001', 'CUSTOMER', 'Demo Customer', '+919900000001', 'demo.customer@busgo.test', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO operators (id, owner_user_id, legal_name, display_name, registration_number, tax_identifier, support_mobile, support_email, address, status, approved_at, created_at, updated_at)
VALUES ('4b44b697-6f41-4711-9e50-8f101b2d8ec2'::uuid,
        '9f3c0a80-12d1-4df5-9a81-2dca7f6e1a11'::uuid,
        'Demo Fleet Pvt Ltd', 'Demo Fleet', 'DEMO-OP-9001', 'DEMO-PAN-9001', '+919900000002', 'support@busgo.test',
        '{"city":"Pune","state":"Maharashtra","address":"Demo Hub"}'::jsonb,
        'APPROVED', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO buses (id, operator_id, registration_number, name, bus_type, manufacturer, model, manufacture_year, seat_capacity, amenities, status, created_at, updated_at)
VALUES ('7ec35bf9-c8e4-4a72-a0fc-4486432d6e88'::uuid,
        '4b44b697-6f41-4711-9e50-8f101b2d8ec2'::uuid,
        'MH12DEMO9001', 'Demo Express', 'AC_SEATER', 'Volvo', '9400 B8R', 2024, 24,
        '["AC","WiFi","Charging","CCTV"]'::jsonb,
        'ACTIVE', NOW(), NOW())
ON CONFLICT (registration_number) DO NOTHING;

INSERT INTO routes (id, operator_id, source_city, destination_city, distance_km, estimated_duration_minutes, is_active, created_at, updated_at)
VALUES ('0d9b0b6d-4e09-444e-91ee-a8f31e7e7d44'::uuid,
        '4b44b697-6f41-4711-9e50-8f101b2d8ec2'::uuid,
        'Pune', 'Mumbai', 180, 240, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trips (id, operator_id, bus_id, route_id, service_number, departure_at, arrival_at, status, base_fare, currency, created_at, updated_at)
VALUES ('a93d4a0d-66af-4519-bfe4-12a2f2d5b2d6'::uuid,
        '4b44b697-6f41-4711-9e50-8f101b2d8ec2'::uuid,
        '7ec35bf9-c8e4-4a72-a0fc-4486432d6e88'::uuid,
        '0d9b0b6d-4e09-444e-91ee-a8f31e7e7d44'::uuid,
        'DEMO-9001', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', NOW() + INTERVAL '1 day' + INTERVAL '5 hours', 'SCHEDULED', 1299.00, 'INR', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trip_stops (id, trip_id, stop_order, city, location_name, address, is_boarding_allowed, is_dropping_allowed, created_at)
VALUES ('de2a2a72-c72b-4dbd-87a8-f918feae6d70'::uuid, 'a93d4a0d-66af-4519-bfe4-12a2f2d5b2d6'::uuid, 1, 'Pune', 'Pune Swargate', 'Swargate, Pune', TRUE, FALSE, NOW()),
       ('f0f3074c-2f8d-49f9-a203-f2d6443d9b1d'::uuid, 'a93d4a0d-66af-4519-bfe4-12a2f2d5b2d6'::uuid, 2, 'Mumbai', 'Mumbai Central', 'Mumbai Central, Mumbai', FALSE, TRUE, NOW())
ON CONFLICT (trip_id, stop_order) DO NOTHING;

INSERT INTO bus_seats (id, bus_id, seat_number, deck, row_number, column_number, seat_type, is_window, is_female_reserved, is_active)
SELECT gen_random_uuid(), '7ec35bf9-c8e4-4a72-a0fc-4486432d6e88'::uuid, x::text, 1, ((x - 1) / 4) + 1, ((x - 1) % 4) + 1, 'SEATER', ((x - 1) % 4) IN (0, 3), FALSE, TRUE
FROM generate_series(1, 24) AS x
ON CONFLICT (bus_id, seat_number) DO NOTHING;

INSERT INTO trip_seat_inventory (trip_id, bus_seat_id, status, updated_at)
SELECT 'a93d4a0d-66af-4519-bfe4-12a2f2d5b2d6'::uuid, bs.id, 'AVAILABLE', NOW()
FROM bus_seats bs
WHERE bs.bus_id = '7ec35bf9-c8e4-4a72-a0fc-4486432d6e88'::uuid
ON CONFLICT (trip_id, bus_seat_id) DO NOTHING;

COMMIT;

SELECT b.name AS bus_name,
       b.registration_number,
       b.bus_type,
       o.display_name AS operator_name,
       r.source_city,
       r.destination_city,
       t.id AS trip_id,
       t.service_number,
       t.departure_at,
       t.arrival_at,
       t.base_fare,
       COUNT(i.bus_seat_id) FILTER (WHERE i.status = 'AVAILABLE')::int AS available_seats
FROM buses b
JOIN operators o ON o.id = b.operator_id
JOIN routes r ON r.operator_id = o.id
JOIN trips t ON t.bus_id = b.id AND t.route_id = r.id
LEFT JOIN trip_seat_inventory i ON i.trip_id = t.id
WHERE b.registration_number = 'MH12DEMO9001'
GROUP BY b.name, b.registration_number, b.bus_type, o.display_name, r.source_city, r.destination_city, t.id, t.service_number, t.departure_at, t.arrival_at, t.base_fare;
