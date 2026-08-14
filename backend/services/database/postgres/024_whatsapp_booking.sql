BEGIN;

CREATE TABLE IF NOT EXISTS whatsapp_booking_sessions (
  phone VARCHAR(20) PRIMARY KEY,
  state TEXT NOT NULL DEFAULT 'IDLE',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_message_events (
  message_id TEXT PRIMARY KEY,
  phone VARCHAR(20),
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND','OUTBOUND')),
  message_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'RECEIVED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_checkout_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT UNIQUE NOT NULL,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expiry ON whatsapp_booking_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_checkout_booking ON whatsapp_checkout_tokens(booking_id);

COMMIT;
