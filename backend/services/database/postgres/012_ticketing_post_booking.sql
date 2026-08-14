BEGIN;
CREATE TYPE ticket_status AS ENUM ('ISSUED','VOID','BOARDED','NO_SHOW');
CREATE TYPE post_booking_case_status AS ENUM ('OPEN','OFFERED','SELECTED','RESOLVED','ESCALATED');

CREATE TABLE ticket_records (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL UNIQUE REFERENCES booking_records(id), ticket_number VARCHAR(32) NOT NULL UNIQUE, verification_token_hash TEXT NOT NULL UNIQUE, verification_key_id TEXT NOT NULL, status ticket_status NOT NULL DEFAULT 'ISSUED', ticket_snapshot JSONB NOT NULL, pdf_object_key TEXT CHECK (pdf_object_key IS NULL OR pdf_object_key !~ '^https?://'), html_object_key TEXT CHECK (html_object_key IS NULL OR html_object_key !~ '^https?://'), issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), boarded_at TIMESTAMPTZ, voided_at TIMESTAMPTZ);
CREATE TABLE ticket_events (
 id BIGSERIAL PRIMARY KEY, ticket_id UUID NOT NULL REFERENCES ticket_records(id), event_type TEXT NOT NULL CHECK (event_type IN ('ISSUED','DOWNLOADED','SCANNED','BOARDED','NO_SHOW','VOIDED','VERIFICATION_OFFLINE')), actor_user_id UUID REFERENCES identity_users(id), request_id UUID, scanner_device_id TEXT, metadata JSONB NOT NULL DEFAULT '{}'::JSONB, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE booking_cancellation_quotes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id), requested_seat_ids UUID[] NOT NULL, policy_snapshot JSONB NOT NULL, refund_amount NUMERIC(12,2) NOT NULL CHECK (refund_amount >= 0), expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE booking_reschedule_processes (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id), replacement_trip_id UUID NOT NULL REFERENCES catalog_trip_instances(id), old_hold_id UUID, new_hold_id UUID REFERENCES inventory_holds(id), status TEXT NOT NULL CHECK (status IN ('PENDING','INVENTORY_HELD','PAYMENT_PENDING','COMPLETED','COMPENSATING','FAILED')), price_difference NUMERIC(12,2) NOT NULL DEFAULT 0, failure_reason TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE disruption_cases (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id), booking_id UUID NOT NULL REFERENCES booking_records(id), status post_booking_case_status NOT NULL DEFAULT 'OPEN', reason TEXT NOT NULL, options JSONB NOT NULL, customer_choice TEXT, escalation_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());
CREATE TABLE ticketing_outbox (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(), booking_id UUID NOT NULL REFERENCES booking_records(id), event_type TEXT NOT NULL, payload JSONB NOT NULL, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), published_at TIMESTAMPTZ, publish_attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT);
CREATE INDEX ticket_events_ticket_idx ON ticket_events(ticket_id, occurred_at DESC);
CREATE INDEX disruption_cases_open_idx ON disruption_cases(trip_instance_id, status) WHERE status IN ('OPEN','OFFERED','ESCALATED');
COMMIT;
