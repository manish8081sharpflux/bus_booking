BEGIN;

DO $$
DECLARE
  duplicate_pan TEXT;
  duplicate_gstin TEXT;
BEGIN
  SELECT tax_identifier
  INTO duplicate_pan
  FROM operators
  WHERE tax_identifier IS NOT NULL
    AND BTRIM(tax_identifier) <> ''
  GROUP BY tax_identifier
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF duplicate_pan IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot enforce operator PAN uniqueness: duplicate PAN already exists.';
  END IF;

  SELECT registration_number
  INTO duplicate_gstin
  FROM operators
  WHERE registration_number IS NOT NULL
    AND BTRIM(registration_number) <> ''
  GROUP BY registration_number
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF duplicate_gstin IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot enforce operator GSTIN uniqueness: duplicate GSTIN already exists.';
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS
  operators_tax_identifier_unique_idx
ON operators (UPPER(BTRIM(tax_identifier)))
WHERE
  tax_identifier IS NOT NULL
  AND BTRIM(tax_identifier) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS
  operators_registration_number_unique_idx
ON operators (UPPER(BTRIM(registration_number)))
WHERE
  registration_number IS NOT NULL
  AND BTRIM(registration_number) <> '';

COMMIT;