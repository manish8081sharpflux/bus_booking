BEGIN;

INSERT INTO platform_users (id, auth_user_id, role, full_name, mobile, email, is_active, created_at, updated_at)
VALUES ('b0111c8e-206f-4a2d-907f-22d8b5f615aa'::uuid, 'demo-customer-002', 'CUSTOMER', 'Demo Customer 2', '+919900000002', 'demo2@busgo.test', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO operators (id, owner_user_id, legal_name, display_name, registration_number, tax_identifier, support_mobile, support_email, address, status, approved_at, created_at, updated_at)
VALUES ('93d95e91-cad5-4ad1-bb8c-6f0504b2f5f0'::uuid,
        'b0111c8e-206f-4a2d-907f-22d8b5f615aa'::uuid,
        'Demo Travel Labs Pvt Ltd', 'Demo Travel', 'DEMOP-9901', 'DEMO-PAN-9901', '+919900000003', 'demo.travel@busgo.test',
        '{"city":"Pune","state":"Maharashtra","address":"Demo Travel Office"}'::jsonb,
        'APPROVED', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO buses (id, operator_id, registration_number, name, bus_type, manufacturer, model, manufacture_year, seat_capacity, amenities, status, created_at, updated_at)
VALUES ('e523e7c8-ab8d-4f2e-a42a-2d48de4f3a91'::uuid,
        '93d95e91-cad5-4ad1-bb8c-6f0504b2f5f0'::uuid,
        'MH12DEMO9901', 'Demo City Express', 'AC_SEATER', 'Volvo', '9400 B8R', 2025, 24,
        '["AC","WiFi","Charging","CCTV"]'::jsonb,
        'ACTIVE', NOW(), NOW())
ON CONFLICT (registration_number) DO NOTHING;

INSERT INTO routes (id, operator_id, source_city, destination_city, distance_km, estimated_duration_minutes, is_active, created_at, updated_at)
VALUES ('6b2075a8-9e34-4d5d-9a6a-93cf2d2dc8f4'::uuid,
        '93d95e91-cad5-4ad1-bb8c-6f0504b2f5f0'::uuid,
        'Pune', 'Mumbai', 180, 240, TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trips (id, operator_id, bus_id, route_id, service_number, departure_at, arrival_at, status, base_fare, currency, created_at, updated_at)
VALUES ('38f75b5d-9222-4a6f-b7ef-d1f2f0ec8a2c'::uuid,
        '93d95e91-cad5-4ad1-bb8c-6f0504b2f5f0'::uuid,
        'e523e7c8-ab8d-4f2e-a42a-2d48de4f3a91'::uuid,
        '6b2075a8-9e34-4d5d-9a6a-93cf2d2dc8f4'::uuid,
        'DEMO-9901', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', NOW() + INTERVAL '1 day' + INTERVAL '5 hours', 'SCHEDULED', 1499.00, 'INR', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO trip_stops (id, trip_id, stop_order, city, location_name, address, is_boarding_allowed, is_dropping_allowed, created_at)
VALUES ('9d4fb943-b516-42f5-9e2f-7b4b89a70385'::uuid, '38f75b5d-9222-4a6f-b7ef-d1f2f0ec8a2c'::uuid, 1, 'Pune', 'Pune', 'Pune city stop', TRUE, FALSE, NOW()),
       ('d27dabe0-590d-45c2-b53e-e0d9b4f7f86f'::uuid, '38f75b5d-9222-4a6f-b7ef-d1f2f0ec8a2c'::uuid, 2, 'Mumbai', 'Mumbai', 'Mumbai city stop', FALSE, TRUE, NOW())
ON CONFLICT (trip_id, stop_order) DO NOTHING;

INSERT INTO bus_seats (id, bus_id, seat_number, deck, row_number, column_number, seat_type, is_window, is_female_reserved, is_active)
SELECT gen_random_uuid(), 'e523e7c8-ab8d-4f2e-a42a-2d48de4f3a91'::uuid, x::text, 1, ((x - 1) / 4) + 1, ((x - 1) % 4) + 1, 'SEATER', ((x - 1) % 4) IN (0, 3), FALSE, TRUE
FROM generate_series(1, 24) AS x
ON CONFLICT (bus_id, seat_number) DO NOTHING;

INSERT INTO trip_seat_inventory (trip_id, bus_seat_id, status, updated_at)
SELECT '38f75b5d-9222-4a6f-b7ef-d1f2f0ec8a2c'::uuid, bs.id, 'AVAILABLE', NOW()
FROM bus_seats bs
WHERE bs.bus_id = 'e523e7c8-ab8d-4f2e-a42a-2d48de4f3a91'::uuid
ON CONFLICT (trip_id, bus_seat_id) DO NOTHING;

COMMIT;

SELECT b.name AS bus_name,
       b.registration_number,
       o.display_name AS operator_name,
       r.source_city,
       r.destination_city,
       t.service_number,
       t.id AS trip_id,
       t.departure_at AT TIME ZONE 'Asia/Kolkata' AS departure_local,
       t.arrival_at AT TIME ZONE 'Asia/Kolkata' AS arrival_local,
       t.base_fare,
       (SELECT count(*) FROM trip_seat_inventory i WHERE i.trip_id = t.id AND i.status = 'AVAILABLE') AS available_seats,
       (SELECT location_name FROM trip_stops ts WHERE ts.trip_id = t.id AND ts.is_boarding_allowed = TRUE ORDER BY stop_order LIMIT 1) AS boarding_point,
       (SELECT location_name FROM trip_stops ts WHERE ts.trip_id = t.id AND ts.is_dropping_allowed = TRUE ORDER BY stop_order LIMIT 1) AS dropping_point
FROM trips t
JOIN buses b ON b.id = t.bus_id
JOIN operators o ON o.id = t.operator_id
JOIN routes r ON r.id = t.route_id
WHERE t.id = '38f75b5d-9222-4a6f-b7ef-d1f2f0ec8a2c'::uuid;
