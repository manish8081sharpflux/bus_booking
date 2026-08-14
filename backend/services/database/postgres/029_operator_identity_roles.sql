ALTER TABLE identity_roles DROP CONSTRAINT IF EXISTS identity_roles_code_check;
ALTER TABLE identity_roles ADD CONSTRAINT identity_roles_code_check CHECK (code IN (
  'SUPER_ADMIN','OPERATOR_ADMIN','OPERATOR_STAFF','CUSTOMER','MANAGER','BOOKING_STAFF',
  'DRIVER','CONDUCTOR','ACCOUNTANT','ROUTE_MANAGER','SUPPORT'
));

INSERT INTO identity_roles(code) VALUES
 ('MANAGER'),('BOOKING_STAFF'),('DRIVER'),('CONDUCTOR'),('ACCOUNTANT'),('ROUTE_MANAGER'),('SUPPORT')
ON CONFLICT(code) DO NOTHING;

INSERT INTO identity_role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM identity_roles r JOIN identity_permissions p ON
 (r.code='MANAGER' AND p.code IN ('operator.read','fleet.manage','catalog.manage','trip.manage','inventory.manage','booking.read','booking.manage','staff.manage','analytics.read','boarding.manage')) OR
 (r.code='BOOKING_STAFF' AND p.code IN ('booking.read','booking.manage','boarding.manage')) OR
 (r.code='DRIVER' AND p.code IN ('trip.operate','boarding.read')) OR
 (r.code='CONDUCTOR' AND p.code IN ('trip.operate','booking.read','boarding.manage')) OR
 (r.code='ACCOUNTANT' AND p.code IN ('booking.read','refund.manage','analytics.read')) OR
 (r.code='ROUTE_MANAGER' AND p.code IN ('operator.read','catalog.manage','trip.manage','inventory.manage','boarding.read')) OR
 (r.code='SUPPORT' AND p.code IN ('operator.read','booking.read','support.manage'))
ON CONFLICT DO NOTHING;
