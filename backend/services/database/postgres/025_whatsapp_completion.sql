BEGIN;

ALTER TABLE whatsapp_booking_sessions
  ADD COLUMN IF NOT EXISTS language VARCHAR(8) NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS previous_state TEXT,
  ADD COLUMN IF NOT EXISTS previous_context JSONB,
  ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;

ALTER TABLE whatsapp_message_events
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_whatsapp_events_phone_created
  ON whatsapp_message_events(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_provider_status
  ON whatsapp_message_events(provider_status, updated_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_support_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  booking_reference TEXT,
  reason TEXT NOT NULL,
  conversation_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','ASSIGNED','RESOLVED','CLOSED')),
  assigned_to TEXT,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_handoffs_status ON whatsapp_support_handoffs(status,created_at DESC);

COMMIT;
