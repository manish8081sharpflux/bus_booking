CREATE TABLE IF NOT EXISTS operators (
    id BIGSERIAL PRIMARY KEY,

    mobile VARCHAR(10) NOT NULL UNIQUE,

    travels_name VARCHAR(100) NOT NULL,
    owner_name VARCHAR(80) NOT NULL,
    business_background VARCHAR(100) NOT NULL,

    pincode VARCHAR(6) NOT NULL,
    country VARCHAR(50) NOT NULL DEFAULT 'India',
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,

    account_holder_name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(18) NOT NULL,
    ifsc_code VARCHAR(11) NOT NULL,
    branch_name VARCHAR(100) NOT NULL,

    gst_registered BOOLEAN NOT NULL DEFAULT FALSE,
    gstin VARCHAR(15),
    pan_number VARCHAR(10) NOT NULL,
    legal_business_name VARCHAR(150) NOT NULL,
    billing_address TEXT NOT NULL,

    pan_card_path TEXT NOT NULL,
    owner_id_proof_path TEXT NOT NULL,
    bank_proof_path TEXT NOT NULL,
    gst_certificate_path TEXT,
    business_registration_path TEXT NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending',

    rejection_reason TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT operators_status_check
        CHECK (status IN ('pending', 'approved', 'rejected'))
);