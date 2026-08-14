BEGIN;

-- Buses submitted before the verification workflow was connected remained DRAFT.
-- Advance only records that satisfy the minimum review package; incomplete drafts stay editable.
UPDATE buses b
SET status = 'PENDING_APPROVAL', updated_at = NOW()
WHERE b.status = 'DRAFT'
  AND EXISTS (SELECT 1 FROM bus_compliance c WHERE c.bus_id = b.id)
  AND (SELECT COUNT(*) FROM bus_seats s WHERE s.bus_id = b.id AND s.is_active) = b.seat_capacity
  AND NOT EXISTS (
    SELECT 1
    FROM (VALUES ('RC'), ('INSURANCE'), ('PERMIT'), ('FITNESS'), ('FRONT_PHOTO')) required(document_type)
    WHERE NOT EXISTS (
      SELECT 1 FROM bus_documents d
      WHERE d.bus_id = b.id AND d.document_type = required.document_type
    )
  );

COMMIT;
