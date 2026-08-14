BEGIN;

CREATE TABLE operator_members (
  operator_id UUID NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL CHECK (membership_role IN ('OWNER', 'MANAGER', 'DISPATCHER')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (operator_id, user_id)
);

CREATE INDEX operator_members_user_idx ON operator_members (user_id, operator_id);

CREATE TABLE inventory_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('BUS', 'TRIP', 'SEAT_INVENTORY')),
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  publish_attempts INTEGER NOT NULL DEFAULT 0 CHECK (publish_attempts >= 0),
  last_error TEXT
);

CREATE INDEX inventory_outbox_dispatch_idx
  ON inventory_outbox (occurred_at)
  WHERE published_at IS NULL;

COMMIT;

-- Rollback (run manually only after all dependent consumers are removed):
-- DROP TABLE IF EXISTS inventory_outbox;
-- DROP TABLE IF EXISTS operator_members;
