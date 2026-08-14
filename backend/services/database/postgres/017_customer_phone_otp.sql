BEGIN;

ALTER TABLE identity_verification_tokens
  DROP CONSTRAINT IF EXISTS identity_verification_tokens_purpose_check;

ALTER TABLE identity_verification_tokens
  ADD CONSTRAINT identity_verification_tokens_purpose_check
  CHECK (purpose IN ('EMAIL_VERIFY', 'PHONE_VERIFY', 'PHONE_LOGIN_OTP', 'PASSWORD_RESET', 'MFA_RECOVERY'));

CREATE INDEX IF NOT EXISTS identity_phone_login_otp_active_idx
  ON identity_verification_tokens (user_id, expires_at)
  WHERE purpose = 'PHONE_LOGIN_OTP' AND consumed_at IS NULL;

COMMIT;
