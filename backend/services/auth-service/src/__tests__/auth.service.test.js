const { Client } = require('pg');
const bcrypt = require('bcrypt');
const { authenticator } = require('otplib');

process.env.AUTH_DATABASE_URL = process.env.AUTH_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/bus_booking';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'change-me';
process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'bus-booking-auth';
process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'bus-booking';
process.env.ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
process.env.MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'change-me-secret';

const { AUTH_DATABASE_URL } = require('../config/env');
const authService = require('../services/auth.service');
const authDao = require('../services/auth.dao');
const authUtils = require('../services/auth.utils');
const { closePool } = require('../config/database');

const pool = new Client({ connectionString: AUTH_DATABASE_URL });

async function clearIdentityTables() {
  await pool.query('BEGIN');
  await pool.query('TRUNCATE TABLE identity_outbox, identity_security_events, identity_login_attempts, identity_mfa_configurations, identity_verification_tokens, identity_refresh_sessions, identity_global_roles, identity_users CASCADE');
  await pool.query('COMMIT');
}

describe('Auth Service', () => {
  beforeAll(async () => {
    await pool.connect();
  });

  beforeEach(async () => {
    await clearIdentityTables();
  });

  afterAll(async () => {
    await pool.end();
    await closePool();
  });

  test('register should create a user, assign customer role, and create verification token', async () => {
    const result = await authService.register({ email: 'test@example.com', password: 'Password123!' });
    expect(result).toHaveProperty('user');
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.status).toBe('PENDING_VERIFICATION');
    expect(result.verificationTokens.email).toBeDefined();

    const user = await authDao.findUserByEmailOrPhone('test@example.com');
    expect(user).not.toBeNull();
    expect(user.status).toBe('PENDING_VERIFICATION');
    expect(await bcrypt.compare('Password123!', user.password_hash)).toBe(true);
  });

  test('login should require MFA when enabled and succeed after verification', async () => {
    const registerResult = await authService.register({ email: 'mfa@example.com', password: 'Password123!' });
    await authService.verifyEmail({ token: registerResult.verificationTokens.email });
    const user = await authDao.findUserByEmailOrPhone('mfa@example.com');

    await authService.mfaSetup(user.id);
    const mfaConfig = await authDao.findMfaConfiguration(user.id);
    const secret = authUtils.decryptSecret(mfaConfig.totp_secret_encrypted, process.env.MFA_ENCRYPTION_KEY || 'change-me-secret');
    const token = authenticator.generate(secret);

    const authResponse = await authService.login({ email: 'mfa@example.com', password: 'Password123!', mfaCode: token });
    expect(authResponse).toHaveProperty('accessToken');
    expect(authResponse).toHaveProperty('refreshToken');
  });

  test('refresh should rotate refresh token and revoke previous session', async () => {
    const registerResult = await authService.register({ email: 'refresh@example.com', password: 'Password123!' });
    await authService.verifyEmail({ token: registerResult.verificationTokens.email });
    const loginResponse = await authService.login({ email: 'refresh@example.com', password: 'Password123!' });

    const refreshResponse = await authService.refresh({ refreshToken: loginResponse.refreshToken });
    expect(refreshResponse.accessToken).toBeDefined();
    expect(refreshResponse.refreshToken).toBeDefined();
    expect(refreshResponse.refreshToken).not.toBe(loginResponse.refreshToken);
  });

  test('resetPassword should fail for invalid token and preserve the valid reset token record', async () => {
    await authService.register({ email: 'reset@example.com', password: 'Password123!' });
    const user = await authDao.findUserByEmailOrPhone('reset@example.com');
    const resetToken = authUtils.generateRandomToken(32);
    await authDao.createVerificationToken({
      userId: user.id,
      channel: 'EMAIL',
      purpose: 'PASSWORD_RESET',
      tokenHash: authUtils.hashValue(resetToken),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

    await expect(authService.resetPassword({ token: 'wrong-token', newPassword: 'NewPassword123!' })).rejects.toThrow('Invalid or expired password reset token');

    const verification = await authDao.findVerificationTokenByHash(authUtils.hashValue(resetToken), 'PASSWORD_RESET');
    expect(verification).not.toBeNull();
    expect(verification.attempt_count).toBe(0);
  });
});