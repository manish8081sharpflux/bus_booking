-- Repeatable local test data: 10 approved operators and 40 buses.
-- Bus distribution: 10 pending verification, 20 active, 5 rejected, 5 draft.

WITH operator_numbers AS (
  SELECT generate_series(1, 10) AS n
)
INSERT INTO platform_users (
  id, auth_user_id, role, full_name, mobile, email, is_active, created_at, updated_at
)
SELECT
  ('71000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'seed-operator-' || lpad(n::text, 2, '0'),
  'OPERATOR',
  'Test Operator ' || lpad(n::text, 2, '0'),
  '+91910000' || lpad(n::text, 4, '0'),
  'operator' || lpad(n::text, 2, '0') || '@busgo.test',
  TRUE,
  make_timestamptz(2026, 8, LEAST(n, 10), 9, 0, 0, 'Asia/Kolkata'),
  make_timestamptz(2026, 8, LEAST(n, 10), 9, 0, 0, 'Asia/Kolkata')
FROM operator_numbers
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  mobile = EXCLUDED.mobile,
  email = EXCLUDED.email,
  is_active = TRUE,
  updated_at = EXCLUDED.updated_at;

WITH operator_numbers AS (
  SELECT generate_series(1, 10) AS n
)
INSERT INTO operators (
  id, owner_user_id, legal_name, display_name, registration_number,
  tax_identifier, support_mobile, support_email, address, status,
  approved_at, created_at, updated_at
)
SELECT
  ('72000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  ('71000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  'BusGo Test Travels ' || lpad(n::text, 2, '0') || ' Private Limited',
  (ARRAY['Deccan Express','Konkan Connect','Western Wheels','Metro Rider','Sahyadri Travels','Royal Roadways','CityLink Coaches','Highway Star','GreenLine Mobility','Sunrise Tours'])[n],
  'TEST-OP-2026-' || lpad(n::text, 3, '0'),
  'TESTPAN' || lpad(n::text, 3, '0'),
  '+91920000' || lpad(n::text, 4, '0'),
  'support' || lpad(n::text, 2, '0') || '@busgo.test',
  jsonb_build_object(
    'line1', (10 + n)::text || ', Test Transport Nagar',
    'city', (ARRAY['Pune','Mumbai','Nashik','Nagpur','Kolhapur','Aurangabad','Thane','Solapur','Satara','Amravati'])[n],
    'state', 'Maharashtra', 'pincode', '4110' || lpad(n::text, 2, '0'), 'testData', true
  ),
  'APPROVED',
  make_timestamptz(2026, 8, LEAST(n + 1, 15), 11, 0, 0, 'Asia/Kolkata'),
  make_timestamptz(2026, 8, LEAST(n, 10), 9, 15, 0, 'Asia/Kolkata'),
  make_timestamptz(2026, 8, LEAST(n + 1, 15), 11, 0, 0, 'Asia/Kolkata')
FROM operator_numbers
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  status = 'APPROVED',
  approved_at = EXCLUDED.approved_at,
  updated_at = EXCLUDED.updated_at;

WITH bus_numbers AS (
  SELECT
    n,
    ((n - 1) / 4) + 1 AS operator_n,
    ((n - 1) % 4) + 1 AS fleet_n
  FROM generate_series(1, 40) AS n
)
INSERT INTO buses (
  id, operator_id, registration_number, name, bus_type, manufacturer,
  model, manufacture_year, seat_capacity, amenities, status, deck_type,
  rejection_reason, created_at, updated_at
)
SELECT
  ('73000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  ('72000000-0000-0000-0000-' || lpad(operator_n::text, 12, '0'))::uuid,
  'MH' || lpad((10 + operator_n)::text, 2, '0') || 'TG' || lpad((2600 + n)::text, 4, '0'),
  (ARRAY['City Seater','Night Sleeper','Premium Coach','Intercity Express'])[fleet_n] || ' ' || lpad(n::text, 2, '0'),
  (ARRAY['AC Seater','AC Sleeper','Volvo Multi-Axle','Non-AC Seater'])[fleet_n],
  (ARRAY['Tata','Ashok Leyland','Volvo','Eicher'])[fleet_n],
  (ARRAY['Starbus Ultra','Viking','9400 B8R','Skyline Pro'])[fleet_n],
  2021 + (n % 5),
  (ARRAY[24,32,36,40])[fleet_n],
  CASE fleet_n
    WHEN 1 THEN '["Charging Point","Water Bottle","CCTV"]'::jsonb
    WHEN 2 THEN '["Blanket","Reading Light","Charging Point","GPS"]'::jsonb
    WHEN 3 THEN '["WiFi","Water Bottle","Entertainment","GPS","CCTV"]'::jsonb
    ELSE '["Water Bottle","First Aid Box"]'::jsonb
  END,
  CASE
    WHEN n <= 10 THEN 'PENDING_APPROVAL'::bus_status
    WHEN n <= 30 THEN 'ACTIVE'::bus_status
    WHEN n <= 35 THEN 'REJECTED'::bus_status
    ELSE 'DRAFT'::bus_status
  END,
  CASE WHEN fleet_n = 2 THEN 'DOUBLE' ELSE 'SINGLE' END,
  CASE WHEN n BETWEEN 31 AND 35 THEN 'Test rejection: insurance document is unclear.' ELSE NULL END,
  make_timestamptz(2026, 8, 1 + ((n - 1) % 10), 10, 0, 0, 'Asia/Kolkata'),
  make_timestamptz(2026, 8, 1 + ((n - 1) % 10), 12, 0, 0, 'Asia/Kolkata')
FROM bus_numbers
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  amenities = EXCLUDED.amenities,
  status = EXCLUDED.status,
  rejection_reason = EXCLUDED.rejection_reason,
  updated_at = EXCLUDED.updated_at;

WITH bus_numbers AS (
  SELECT n, ((n - 1) % 4) + 1 AS fleet_n
  FROM generate_series(1, 40) AS n
)
INSERT INTO bus_compliance (
  bus_id, registration_date, insurance_number, insurance_expiry,
  permit_number, permit_expiry, fitness_certificate_number, fitness_expiry,
  puc_number, puc_expiry, verification_status, created_at, updated_at
)
SELECT
  ('73000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  make_date(2021 + (n % 5), 1 + (n % 12), 1 + (n % 20)),
  'TEST-INS-2026-' || lpad(n::text, 4, '0'), DATE '2027-08-31',
  'TEST-PERMIT-2026-' || lpad(n::text, 4, '0'), DATE '2027-12-31',
  'TEST-FIT-2026-' || lpad(n::text, 4, '0'), DATE '2027-08-31',
  'TEST-PUC-2026-' || lpad(n::text, 4, '0'), DATE '2027-02-28',
  CASE WHEN n BETWEEN 11 AND 30 THEN 'VERIFIED' WHEN n BETWEEN 31 AND 35 THEN 'REJECTED' ELSE 'PENDING' END,
  make_timestamptz(2026, 8, 1 + ((n - 1) % 10), 10, 30, 0, 'Asia/Kolkata'),
  make_timestamptz(2026, 8, 1 + ((n - 1) % 10), 12, 0, 0, 'Asia/Kolkata')
FROM bus_numbers
ON CONFLICT (bus_id) DO UPDATE SET
  verification_status = EXCLUDED.verification_status,
  updated_at = EXCLUDED.updated_at;

WITH document_types(document_type) AS (
  VALUES ('RC'), ('INSURANCE'), ('PERMIT'), ('FITNESS'), ('PUC'),
         ('FRONT_PHOTO'), ('SIDE_PHOTO'), ('INTERIOR_PHOTO')
), bus_numbers AS (
  SELECT generate_series(1, 35) AS n
)
INSERT INTO bus_documents (
  bus_id, document_type, file_path, original_file_name, mime_type,
  file_size, verification_status, rejection_reason, created_at, updated_at
)
SELECT
  ('73000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
  document_type,
  '/test-seed/august-2026/bus-' || lpad(n::text, 2, '0') || '/' || lower(document_type) || '.pdf',
  'test_bus_' || lpad(n::text, 2, '0') || '_' || lower(document_type) || '.pdf',
  CASE WHEN document_type LIKE '%PHOTO' THEN 'image/jpeg' ELSE 'application/pdf' END,
  125000 + (n * 1000),
  CASE WHEN n BETWEEN 11 AND 30 THEN 'VERIFIED' WHEN n BETWEEN 31 AND 35 THEN 'REJECTED' ELSE 'PENDING' END,
  CASE WHEN n BETWEEN 31 AND 35 AND document_type = 'INSURANCE' THEN 'Image is unclear; upload a readable copy.' ELSE NULL END,
  make_timestamptz(2026, 8, 1 + ((n - 1) % 10), 11, 0, 0, 'Asia/Kolkata'),
  make_timestamptz(2026, 8, 1 + ((n - 1) % 10), 12, 0, 0, 'Asia/Kolkata')
FROM bus_numbers CROSS JOIN document_types
ON CONFLICT (bus_id, document_type) DO UPDATE SET
  file_path = EXCLUDED.file_path,
  verification_status = EXCLUDED.verification_status,
  rejection_reason = EXCLUDED.rejection_reason,
  updated_at = EXCLUDED.updated_at;

WITH bus_data AS (
  SELECT
    b.id AS bus_id,
    b.seat_capacity,
    generate_series(1, b.seat_capacity) AS seat_n
  FROM buses b
  WHERE b.id >= '73000000-0000-0000-0000-000000000001'::uuid
    AND b.id <= '73000000-0000-0000-0000-000000000040'::uuid
)
INSERT INTO bus_seats (
  bus_id, seat_number, deck, row_number, column_number,
  seat_type, is_window, is_female_reserved, is_active
)
SELECT
  bus_id,
  seat_n::text,
  1,
  ((seat_n - 1) / 4) + 1,
  ((seat_n - 1) % 4) + 1,
  'SEATER',
  ((seat_n - 1) % 4) IN (0, 3),
  FALSE,
  TRUE
FROM bus_data
ON CONFLICT (bus_id, seat_number) DO UPDATE SET is_active = TRUE;

DO $$
DECLARE operator_count INTEGER; bus_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO operator_count FROM operators
  WHERE id BETWEEN '72000000-0000-0000-0000-000000000001'::uuid AND '72000000-0000-0000-0000-000000000010'::uuid;
  SELECT COUNT(*) INTO bus_count FROM buses
  WHERE id BETWEEN '73000000-0000-0000-0000-000000000001'::uuid AND '73000000-0000-0000-0000-000000000040'::uuid;
  IF operator_count <> 10 OR bus_count <> 40 THEN
    RAISE EXCEPTION 'Seed verification failed: expected 10 operators/40 buses, got %/%', operator_count, bus_count;
  END IF;
  RAISE NOTICE 'Seed complete: % test operators and % test buses', operator_count, bus_count;
END $$;
