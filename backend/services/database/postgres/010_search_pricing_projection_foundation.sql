BEGIN;

CREATE TYPE pricing_promotion_status AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');
CREATE TYPE pricing_coupon_reservation_status AS ENUM ('RESERVED', 'CONSUMED', 'RELEASED', 'EXPIRED');

CREATE TABLE pricing_tax_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), country_id UUID REFERENCES catalog_countries(id), code TEXT NOT NULL, percentage NUMERIC(7,4) NOT NULL CHECK (percentage >= 0), fixed_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0), effective_from TIMESTAMPTZ NOT NULL, effective_to TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE TABLE pricing_fee_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), operator_organization_id UUID REFERENCES operator_organizations(id), code TEXT NOT NULL, display_name TEXT NOT NULL, percentage NUMERIC(7,4) NOT NULL DEFAULT 0 CHECK (percentage >= 0), fixed_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0), effective_from TIMESTAMPTZ NOT NULL, effective_to TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (effective_to IS NULL OR effective_to > effective_from)
);
CREATE TABLE pricing_segment_fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), trip_instance_id UUID NOT NULL REFERENCES catalog_trip_instances(id) ON DELETE CASCADE, seat_kind fleet_seat_kind NOT NULL, origin_stop_sequence SMALLINT NOT NULL CHECK (origin_stop_sequence > 0), destination_stop_sequence SMALLINT NOT NULL CHECK (destination_stop_sequence > origin_stop_sequence), base_fare NUMERIC(12,2) NOT NULL CHECK (base_fare >= 0), currency CHAR(3) NOT NULL DEFAULT 'INR', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (trip_instance_id, seat_kind, origin_stop_sequence, destination_stop_sequence)
);
CREATE TABLE pricing_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), code CITEXT NOT NULL UNIQUE, status pricing_promotion_status NOT NULL DEFAULT 'DRAFT', discount_type TEXT NOT NULL CHECK (discount_type IN ('FIXED', 'PERCENTAGE')), discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0), max_discount_amount NUMERIC(12,2), starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, usage_limit INTEGER, per_user_limit INTEGER, budget_amount NUMERIC(12,2), budget_consumed NUMERIC(12,2) NOT NULL DEFAULT 0, eligibility JSONB NOT NULL DEFAULT '{}'::JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (ends_at > starts_at), CHECK (budget_amount IS NULL OR budget_amount >= 0)
);
CREATE TABLE pricing_coupon_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), promotion_id UUID NOT NULL REFERENCES pricing_promotions(id), customer_id UUID NOT NULL REFERENCES identity_users(id), booking_id UUID, idempotency_key UUID NOT NULL UNIQUE, reserved_discount_amount NUMERIC(12,2) NOT NULL CHECK (reserved_discount_amount >= 0), status pricing_coupon_reservation_status NOT NULL DEFAULT 'RESERVED', expires_at TIMESTAMPTZ NOT NULL, consumed_at TIMESTAMPTZ, released_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX pricing_coupon_active_customer_idx ON pricing_coupon_reservations (promotion_id, customer_id, booking_id) WHERE status = 'RESERVED';
CREATE INDEX pricing_coupon_expiry_idx ON pricing_coupon_reservations (expires_at) WHERE status = 'RESERVED';

CREATE TABLE search_projection_inbox (
  event_id UUID PRIMARY KEY, event_type TEXT NOT NULL, aggregate_id UUID NOT NULL, aggregate_version BIGINT, processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), projection_version INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE search_projection_checkpoints (
  projection_name TEXT PRIMARY KEY, last_event_occurred_at TIMESTAMPTZ, last_rebuild_at TIMESTAMPTZ, projection_version INTEGER NOT NULL DEFAULT 1, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE search_cache_invalidations (
  id BIGSERIAL PRIMARY KEY, cache_tag TEXT NOT NULL, event_id UUID NOT NULL UNIQUE, invalidated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_recent_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE, origin_city_id UUID REFERENCES catalog_cities(id), origin_stop_id UUID REFERENCES catalog_stops(id), destination_city_id UUID REFERENCES catalog_cities(id), destination_stop_id UUID REFERENCES catalog_stops(id), travel_date DATE NOT NULL, passenger_count SMALLINT NOT NULL DEFAULT 1 CHECK (passenger_count > 0), return_date DATE, searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), CHECK (return_date IS NULL OR return_date >= travel_date)
);
CREATE TABLE customer_saved_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), customer_id UUID NOT NULL REFERENCES identity_users(id) ON DELETE CASCADE, origin_city_id UUID REFERENCES catalog_cities(id), origin_stop_id UUID REFERENCES catalog_stops(id), destination_city_id UUID REFERENCES catalog_cities(id), destination_stop_id UUID REFERENCES catalog_stops(id), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (customer_id, origin_city_id, origin_stop_id, destination_city_id, destination_stop_id)
);
CREATE TABLE analytics_route_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), origin_city_id UUID NOT NULL REFERENCES catalog_cities(id), destination_city_id UUID NOT NULL REFERENCES catalog_cities(id), travel_date DATE, anonymized_search_count INTEGER NOT NULL CHECK (anonymized_search_count >= 0), score NUMERIC(12,6) NOT NULL, computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (origin_city_id, destination_city_id, travel_date)
);

CREATE TABLE search_ranking_explanations (
  code TEXT PRIMARY KEY, public_label TEXT NOT NULL, explanation TEXT NOT NULL, is_sponsored BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO search_ranking_explanations (code, public_label, explanation) VALUES
  ('RECOMMENDED', 'Recommended', 'Best overall balance of price, duration, reliability, and available seats.'),
  ('ARRIVAL_CONFIDENCE', 'High arrival confidence', 'Based on published schedule reliability and current service conditions.'),
  ('PUNCTUALITY', 'Punctual operator', 'Based on anonymized historical departure and arrival performance.'),
  ('BOARDING_CLARITY', 'Clear boarding details', 'The boarding point has verified landmark, contact, and navigation information.'),
  ('VERIFIED_AMENITIES', 'Verified amenities', 'Amenities were verified for this vehicle configuration.'),
  ('FLEXIBLE_CANCELLATION', 'Flexible cancellation', 'This trip has a comparatively more flexible published cancellation policy.')
ON CONFLICT (code) DO NOTHING;

COMMIT;
