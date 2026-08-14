BEGIN;

CREATE TABLE IF NOT EXISTS customer_saved_travellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  age SMALLINT NOT NULL CHECK (age BETWEEN 1 AND 120),
  gender TEXT NOT NULL CHECK (gender IN ('MALE','FEMALE','OTHER')),
  relation TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS customer_saved_travellers_customer_idx
  ON customer_saved_travellers(customer_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS customer_saved_travellers_identity_uq
  ON customer_saved_travellers(customer_id, LOWER(full_name), age, gender);

COMMIT;