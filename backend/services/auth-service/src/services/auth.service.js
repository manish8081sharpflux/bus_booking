const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
// Load the shared service environment before the JWT module captures its secret.
require('../config/env');
const { generateAccessToken } = require('../../../shared/auth/jwt');
const { ApiError } = require('../../../shared/errors');
const authDao = require('./auth.dao');
const authUtils = require('./auth.utils');
const {
  PASSWORD_BCRYPT_SALT_ROUNDS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOCKOUT_DURATION_MINUTES,
  VERIFICATION_TOKEN_TTL_MINUTES,
  MFA_ENCRYPTION_KEY,
  ADMIN_CREATION_KEY,
  JWT_AUDIENCE,
  REFRESH_TOKEN_EXPIRES_DAYS,
} = require('../config/env');

function resolveRegistrationRole({ role, adminCreationKey } = {}) {
  const normalizedRole = String(role || 'CUSTOMER').toUpperCase();
  const roleMap = {
    USER: 'CUSTOMER',
    ADMIN: 'SUPER_ADMIN',
    OPERATOR: 'OPERATOR_STAFF',
  };
  const mappedRole = roleMap[normalizedRole] || normalizedRole;
  const allowedRoles = ['SUPER_ADMIN', 'OPERATOR_ADMIN', 'OPERATOR_STAFF', 'CUSTOMER'];

  if (!allowedRoles.includes(mappedRole)) {
    throw new ApiError({
      code: 'bad_request',
      message: `Invalid role. Allowed: ${allowedRoles.join(', ')}`,
      status: 400,
    });
  }

  if (mappedRole === 'SUPER_ADMIN') {
    if (!ADMIN_CREATION_KEY) {
      throw new ApiError({
        code: 'forbidden',
        message: 'Admin creation is disabled. Set ADMIN_CREATION_KEY in auth service env.',
        status: 403,
      });
    }

    if (adminCreationKey !== ADMIN_CREATION_KEY) {
      throw new ApiError({
        code: 'forbidden',
        message: 'Invalid admin creation key',
        status: 403,
      });
    }
  }

  return mappedRole;
}

function mapUser(user) {
  return {
    id: user.id,
    email: user.email || null,
    phone: user.phone || null,
    displayName: user.display_name,
    status: user.status,
    emailVerifiedAt: user.email_verified_at,
    phoneVerifiedAt: user.phone_verified_at,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}

async function resolveRoles(userId) {
  const roles = await authDao.getUserRoles(userId);
  if (!roles || !roles.length) {
    return [{ code: 'CUSTOMER' }];
  }
  return roles;
}

async function createRefreshSession({ userId, userAgent, ipHash, trustedDeviceId, parentSessionId = null, familyId = null, client = null }) {
  const refreshToken = authUtils.generateRandomToken(64);
  const tokenHash = authUtils.hashValue(refreshToken);
  const durationDays = Number(REFRESH_TOKEN_EXPIRES_DAYS || 30);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * durationDays);
  const session = await authDao.insertRefreshSession({
    userId,
    tokenHash,
    familyId: familyId || uuidv4(),
    parentSessionId,
    expiresAt: expiresAt.toISOString(),
    userAgent: userAgent || null,
    ipHash: ipHash || null,
    trustedDeviceId: trustedDeviceId || null,
  }, client);

  return { refreshToken, session };
}

async function verifyMfaForUser(user, token) {
  const mfaConfig = await authDao.findMfaConfiguration(user.id);
  if (!mfaConfig) {
    throw new ApiError({
      code: 'forbidden',
      message: 'MFA is not configured for this account',
      status: 403,
    });
  }

  const secret = authUtils.decryptSecret(mfaConfig.totp_secret_encrypted, MFA_ENCRYPTION_KEY);
  const isTotpValid = authUtils.verifyTotp(token, secret);
  const recoveryCodeHashes = Array.isArray(mfaConfig.recovery_code_hashes) ? [...mfaConfig.recovery_code_hashes] : [];

  if (isTotpValid) {
    return { recoveryCodeHashes, usedRecoveryCode: false };
  }

  const tokenHash = authUtils.hashValue(token);
  const recoveryIndex = recoveryCodeHashes.findIndex((hash) => hash === tokenHash);

  if (recoveryIndex >= 0) {
    recoveryCodeHashes.splice(recoveryIndex, 1);
    await authDao.upsertMfaConfiguration({
      userId: user.id,
      totpSecretEncrypted: mfaConfig.totp_secret_encrypted,
      recoveryCodeHashes,
    });
    return { recoveryCodeHashes, usedRecoveryCode: true };
  }

  throw new ApiError({
    code: 'unauthorized',
    message: 'Invalid MFA token',
    status: 401,
  });
}

async function buildAuthTokens({ user, userAgent, ipHash, trustedDeviceId, parentSessionId = null, familyId = null, client = null }) {
  const roles = await resolveRoles(user.id);
  const roleIds = roles.map((role) => role.id).filter(Boolean);
  const roleCodes = roles.map((role) => role.code).filter(Boolean);
  const { refreshToken, session } = await createRefreshSession({ userId: user.id, userAgent, ipHash, trustedDeviceId, parentSessionId, familyId, client });
  const accessToken = generateAccessToken({
    userId: user.id,
    organizationId: null,
    roleIds,
    roleCodes,
    permissionVersion: user.token_version || 1,
    sessionId: session.id,
    tokenVersion: user.token_version || 1,
    audience: JWT_AUDIENCE,
  });

  return {
    accessToken,
    refreshToken,
    user: mapUser(user),
    roles: roleCodes,
    sessionId: session.id,
  };
}

class AuthService {
  async requestPhoneSignupOtp(payload = {}) {
    const mobile = String(payload.mobile || '').replace(/[\s-]/g, '');
    const displayName = String(payload.name || '').trim().replace(/\s{2,}/g, ' ');
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile)) {
      throw new ApiError({ code: 'bad_request', message: 'Enter a valid mobile number', status: 400 });
    }
    if (!/^[\p{L}\p{M} .'-]{2,80}$/u.test(displayName)) {
      throw new ApiError({ code: 'bad_request', message: 'Enter a valid full name between 2 and 80 characters', status: 400 });
    }
    let user = await authDao.findUserByEmailOrPhone(mobile);
    if (user) {
      const roles = (await resolveRoles(user.id)).map((role) => role.code);
      if (!roles.includes('CUSTOMER')) throw new ApiError({ code: 'conflict', message: 'This mobile belongs to another account type', status: 409 });
      if (user.status === 'ACTIVE' && user.phone_verified_at) {
        throw new ApiError({ code: 'conflict', message: 'Account already exists. Please sign in.', status: 409 });
      }
      await authDao.updateUser(user.id, { display_name: displayName });
      user = { ...user, display_name: displayName };
    } else {
      const passwordHash = await bcrypt.hash(authUtils.generateRandomToken(48), PASSWORD_BCRYPT_SALT_ROUNDS || 12);
      user = await authDao.withTransaction(async (client) => {
        const created = await authDao.createUser({ phone: mobile, email: null, displayName, passwordHash, status: 'PENDING_VERIFICATION' }, client);
        await authDao.assignRole(created.id, 'CUSTOMER', client);
        return created;
      });
    }
    if (process.env.NODE_ENV !== 'production') {
      const now = new Date().toISOString();
      await authDao.updateUser(user.id, { phone_verified_at: now, status: 'ACTIVE', last_login_at: now });
      return { developmentBypass: true, ...(await buildAuthTokens({ user: { ...user, phone_verified_at: now, status: 'ACTIVE' } })) };
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await authDao.createVerificationToken({ userId: user.id, channel: 'PHONE', purpose: 'PHONE_SIGNUP_OTP', tokenHash: authUtils.hashValue(`${mobile}:${otp}`), expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60000).toISOString(), maxAttempts: 5 });
    await authDao.insertIdentityOutbox({ eventType: 'identity.customer.phone_signup_otp.requested', aggregateType: 'identity_user', aggregateId: user.id, requestId: null, payload: { userId: user.id, mobile, otp, expiresInMinutes: VERIFICATION_TOKEN_TTL_MINUTES } });
    return { otpRequired: true, expiresInMinutes: VERIFICATION_TOKEN_TTL_MINUTES, message: 'OTP sent to your mobile number' };
  }

  async verifyPhoneSignupOtp(payload = {}) {
    const mobile = String(payload.mobile || '').replace(/[\s-]/g, '');
    const otp = String(payload.otp || '').trim();
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile) || !/^\d{6}$/.test(otp)) {
      throw new ApiError({ code: 'bad_request', message: 'Mobile number and 6-digit OTP are required', status: 400 });
    }
    if (process.env.NODE_ENV !== 'production') {
      const user = await authDao.findUserByEmailOrPhone(mobile);
      if (!user) throw new ApiError({ code: 'not_found', message: 'Start signup again', status: 404 });
      return buildAuthTokens({ user });
    }
    const verification = await authDao.findVerificationTokenByHash(authUtils.hashValue(`${mobile}:${otp}`), 'PHONE_SIGNUP_OTP');
    const now = new Date();
    if (!verification || verification.consumed_at || verification.attempt_count >= verification.max_attempts || new Date(verification.expires_at) <= now) {
      if (verification && !verification.consumed_at) await authDao.incrementVerificationAttempt(verification.id);
      throw new ApiError({ code: 'unauthorized', message: 'Invalid or expired OTP', status: 401 });
    }
    const user = await authDao.findUserById(verification.user_id);
    if (!user || user.phone !== mobile) throw new ApiError({ code: 'unauthorized', message: 'Invalid OTP', status: 401 });
    await authDao.consumeVerificationToken(verification.id);
    await authDao.updateUser(user.id, { phone_verified_at: now.toISOString(), status: 'ACTIVE', last_login_at: now.toISOString() });
    return buildAuthTokens({ user: { ...user, phone_verified_at: now.toISOString(), status: 'ACTIVE' } });
  }

  async requestPhoneLoginOtp(payload = {}) {
    const mobile = String(payload.mobile || '').trim();
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile)) {
      throw new ApiError({ code: 'bad_request', message: 'Enter a valid mobile number', status: 400 });
    }
    const user = await authDao.findUserByEmailOrPhone(mobile);
    if (!user) throw new ApiError({ code: 'not_found', message: 'No customer account exists for this mobile number', status: 404 });
    const roles = (await resolveRoles(user.id)).map((role) => role.code);
    if (!roles.includes('CUSTOMER')) throw new ApiError({ code: 'forbidden', message: 'Use a customer account', status: 403 });
    if (['SUSPENDED', 'DELETED', 'LOCKED'].includes(user.status)) throw new ApiError({ code: 'forbidden', message: 'Account is not allowed to sign in', status: 403 });

    if (process.env.NODE_ENV !== 'production') {
      if (!user.phone_verified_at || user.status !== 'ACTIVE') {
        await authDao.updateUser(user.id, { phone_verified_at: new Date().toISOString(), status: 'ACTIVE' });
      }
      return { developmentBypass: true, ...(await buildAuthTokens({ user: { ...user, status: 'ACTIVE' } })) };
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await authDao.createVerificationToken({
      userId: user.id, channel: 'PHONE', purpose: 'PHONE_LOGIN_OTP',
      tokenHash: authUtils.hashValue(`${mobile}:${otp}`),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
      maxAttempts: 5,
    });
    await authDao.insertIdentityOutbox({
      eventType: 'identity.customer.phone_login_otp.requested', aggregateType: 'identity_user',
      aggregateId: user.id, requestId: null, payload: { userId: user.id, mobile, otp, expiresInMinutes: VERIFICATION_TOKEN_TTL_MINUTES },
    });
    return { otpRequired: true, expiresInMinutes: VERIFICATION_TOKEN_TTL_MINUTES, message: 'OTP sent to your mobile number' };
  }

  async verifyPhoneLoginOtp(payload = {}) {
    const mobile = String(payload.mobile || '').trim();
    const otp = String(payload.otp || '').trim();
    if (!/^\+?[1-9]\d{9,14}$/.test(mobile) || !/^\d{6}$/.test(otp)) {
      throw new ApiError({ code: 'bad_request', message: 'Mobile number and 6-digit OTP are required', status: 400 });
    }
    if (process.env.NODE_ENV !== 'production') return this.requestPhoneLoginOtp({ mobile });
    const verification = await authDao.findVerificationTokenByHash(authUtils.hashValue(`${mobile}:${otp}`), 'PHONE_LOGIN_OTP');
    const now = new Date();
    if (!verification || verification.consumed_at || verification.attempt_count >= verification.max_attempts || new Date(verification.expires_at) <= now) {
      if (verification && !verification.consumed_at) await authDao.incrementVerificationAttempt(verification.id);
      throw new ApiError({ code: 'unauthorized', message: 'Invalid or expired OTP', status: 401 });
    }
    const user = await authDao.findUserById(verification.user_id);
    if (!user || user.phone !== mobile) throw new ApiError({ code: 'unauthorized', message: 'Invalid OTP', status: 401 });
    await authDao.consumeVerificationToken(verification.id);
    await authDao.updateUser(user.id, { phone_verified_at: user.phone_verified_at || now.toISOString(), status: 'ACTIVE', last_login_at: now.toISOString() });
    return buildAuthTokens({ user: { ...user, status: 'ACTIVE' } });
  }

  async register(payload = {}) {
    const requiresVerification = process.env.NODE_ENV === 'production';
    const email = payload.email ? String(payload.email).trim().toLowerCase() : null;
    const phone = payload.mobile ? String(payload.mobile).replace(/[\s-]/g, '') : null;
    const displayName = String(payload.name || payload.displayName || 'New User').trim().replace(/\s{2,}/g, ' ');
    const password = typeof payload.password === 'string' ? payload.password : '';
    const role = resolveRegistrationRole(payload);

    if (!/^[\p{L}\p{M} .'-]{2,80}$/u.test(displayName)) {
      throw new ApiError({ code: 'bad_request', message: 'Enter a valid full name between 2 and 80 characters', status: 400 });
    }

    if (email && (email.length > 254 || !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(email))) {
      throw new ApiError({ code: 'bad_request', message: 'Enter a valid email address', status: 400 });
    }

    if (phone && !/^\+?[1-9]\d{9,14}$/.test(phone)) {
      throw new ApiError({ code: 'bad_request', message: 'Enter a valid mobile number', status: 400 });
    }

    if (password.length < 8 || password.length > 72 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password) || /\s/.test(password)) {
      throw new ApiError({ code: 'bad_request', message: 'Password must be 8–72 characters and include uppercase, lowercase, a number and a special character, with no spaces', status: 400 });
    }

    if (!email && !phone) {
      throw new ApiError({ code: 'bad_request', message: 'Email or phone is required', status: 400 });
    }

    return authDao.withTransaction(async (client) => {
      const existing = await authDao.findUserByEmailOrPhone(email || phone, client);
      if (existing) {
        throw new ApiError({ code: 'conflict', message: 'User already exists', status: 409 });
      }

      const passwordHash = await bcrypt.hash(password, PASSWORD_BCRYPT_SALT_ROUNDS || 12);
      const user = await authDao.createUser({
        email,
        phone,
        displayName,
        passwordHash,
        status: requiresVerification ? 'PENDING_VERIFICATION' : 'ACTIVE',
        legacyAuthUserId: null,
      }, client);

      await authDao.assignRole(user.id, role, client);

      const verificationTokens = {};
      if (email && requiresVerification) {
        const emailToken = authUtils.generateRandomToken(32);
        verificationTokens.email = emailToken;
        await authDao.createVerificationToken({
          userId: user.id,
          channel: 'EMAIL',
          purpose: 'EMAIL_VERIFY',
          tokenHash: authUtils.hashValue(emailToken),
          expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
        }, client);
      }

      if (phone && requiresVerification) {
        const phoneToken = authUtils.generateRandomToken(32);
        verificationTokens.phone = phoneToken;
        await authDao.createVerificationToken({
          userId: user.id,
          channel: 'PHONE',
          purpose: 'PHONE_VERIFY',
          tokenHash: authUtils.hashValue(phoneToken),
          expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
        }, client);
      }

      await authDao.insertIdentityOutbox({
        eventType: 'identity.user.registered',
        aggregateType: 'identity_user',
        aggregateId: user.id,
        requestId: null,
        payload: {
          userId: user.id,
          email,
          phone,
          role,
        },
      }, client);

      return {
        user: mapUser(user),
        verificationTokens,
        message: requiresVerification
          ? 'User registered successfully. Verify your email or phone to activate your account.'
          : 'User registered successfully. Development verification was skipped.',
      };
    });
  }

  async login(payload = {}) {
    const identifier = String(payload.email || payload.mobile || payload.identifier || '').trim().toLowerCase();
    const password = payload.password;
    const mfaCode = payload.mfaCode || payload.code;
    const userAgent = payload.userAgent || null;
    const ipHash = payload.ipHash || null;

    if (!identifier || !password) {
      throw new ApiError({ code: 'bad_request', message: 'Identifier and password are required', status: 400 });
    }

    const normalizedIdentifier = identifier.replace(/[\s-]/g, '');
    const validIdentifier = identifier.includes('@')
      ? identifier.length <= 254 && /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(identifier)
      : /^\+?[1-9]\d{9,14}$/.test(normalizedIdentifier);
    if (!validIdentifier || typeof password !== 'string' || password.length < 8 || password.length > 72) {
      throw new ApiError({ code: 'bad_request', message: 'Enter valid login credentials', status: 400 });
    }

    const user = await authDao.findUserByEmailOrPhone(identifier);
    if (!user) {
      throw new ApiError({ code: 'unauthorized', message: 'Invalid credentials', status: 401 });
    }

    const now = new Date();
    if (['SUSPENDED', 'DELETED'].includes(user.status)) {
      throw new ApiError({ code: 'forbidden', message: 'Account is not allowed to sign in', status: 403 });
    }

    if (process.env.NODE_ENV === 'production' && user.status === 'PENDING_VERIFICATION' && !user.email_verified_at && !user.phone_verified_at) {
      throw new ApiError({ code: 'forbidden', message: 'Account verification is required before signing in', status: 403 });
    }

    if (user.locked_until && new Date(user.locked_until) > now) {
      throw new ApiError({ code: 'forbidden', message: 'Account is locked due to failed login attempts', status: 403 });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      const failedCount = (user.failed_login_count || 0) + 1;
      const updates = { failed_login_count: failedCount };
      if (failedCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
        updates.locked_until = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000).toISOString();
      }
      await authDao.updateUser(user.id, updates);
      throw new ApiError({ code: 'unauthorized', message: 'Invalid credentials', status: 401 });
    }

    const roleRecords = await resolveRoles(user.id);
    const isMfaEnabled = Boolean((await authDao.findMfaConfiguration(user.id))?.enabled_at);

    if (user.status === 'PENDING_VERIFICATION' && (process.env.NODE_ENV !== 'production' || user.email_verified_at || user.phone_verified_at)) {
      await authDao.updateUser(user.id, { status: 'ACTIVE', failed_login_count: 0, locked_until: null, last_login_at: now.toISOString() });
      user.status = 'ACTIVE';
    } else {
      await authDao.updateUser(user.id, { failed_login_count: 0, locked_until: null, last_login_at: now.toISOString() });
    }

    if (isMfaEnabled && !mfaCode) {
      return {
        mfaRequired: true,
        user: mapUser(user),
        message: 'Multi-factor authentication code is required',
      };
    }

    if (isMfaEnabled && mfaCode) {
      await verifyMfaForUser(user, mfaCode);
    }

    const authResponse = await buildAuthTokens({ user, userAgent, ipHash });
    await authDao.insertIdentityOutbox({
      eventType: 'identity.user.logged_in',
      aggregateType: 'identity_user',
      aggregateId: user.id,
      requestId: null,
      payload: { userId: user.id, mfa: isMfaEnabled },
    });

    return authResponse;
  }

  async refresh(payload = {}) {
    const refreshToken = payload.refreshToken || payload.token;
    const userAgent = payload.userAgent || null;
    const ipHash = payload.ipHash || null;

    if (!refreshToken) {
      throw new ApiError({ code: 'bad_request', message: 'Refresh token is required', status: 400 });
    }

    const tokenHash = authUtils.hashValue(refreshToken);
    const session = await authDao.findRefreshSessionByHash(tokenHash);
    const now = new Date();

    if (!session || session.revoked_at || new Date(session.expires_at) <= now) {
      if (session && session.family_id) {
        await authDao.revokeFamilySessions(session.family_id, 'refresh_reuse_detected');
      }
      throw new ApiError({ code: 'unauthorized', message: 'Invalid or expired refresh token', status: 401 });
    }

    const user = await authDao.findUserById(session.user_id);
    if (!user) {
      throw new ApiError({ code: 'unauthorized', message: 'Invalid refresh token user', status: 401 });
    }

    const { refreshToken: newRefreshToken, session: newSession } = await createRefreshSession({
      userId: user.id,
      userAgent,
      ipHash,
      trustedDeviceId: session.trusted_device_id,
      parentSessionId: session.id,
      familyId: session.family_id,
    });

    await authDao.updateRefreshSession(session.id, {
      revoked_at: new Date().toISOString(),
      revoke_reason: 'rotated',
      replaced_by_session_id: newSession.id,
    });

    const roles = await resolveRoles(user.id);
    const roleIds = roles.map((role) => role.id).filter(Boolean);
    const roleCodes = roles.map((role) => role.code).filter(Boolean);
    const accessToken = generateAccessToken({
      userId: user.id,
      organizationId: null,
      roleIds,
      roleCodes,
      permissionVersion: user.token_version || 1,
      sessionId: newSession.id,
      tokenVersion: user.token_version || 1,
      audience: JWT_AUDIENCE,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(userId, sessionId) {
    if (!sessionId) {
      throw new ApiError({ code: 'bad_request', message: 'Session id is required', status: 400 });
    }

    const session = await authDao.findSessionById(sessionId);
    if (!session || session.user_id !== userId) {
      throw new ApiError({ code: 'not_found', message: 'Session not found', status: 404 });
    }

    await authDao.revokeSession(sessionId, 'logout');
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId, sessionId = null) {
    await authDao.revokeUserSessions(userId, sessionId || undefined);
    return { message: 'All sessions revoked' };
  }

  async sessions(userId) {
    const sessions = await authDao.listSessions(userId);
    return { sessions };
  }

  async revokeSession(userId, sessionId) {
    const session = await authDao.findSessionById(sessionId);
    if (!session || session.user_id !== userId) {
      throw new ApiError({ code: 'not_found', message: 'Session not found', status: 404 });
    }

    await authDao.revokeSession(sessionId, 'session_revoked');
    return { revokedSessionId: sessionId };
  }

  async forgotPassword(payload = {}) {
    const identifier = payload.email || payload.mobile || payload.identifier;
    if (!identifier) {
      throw new ApiError({ code: 'bad_request', message: 'Email or phone is required', status: 400 });
    }

    const user = await authDao.findUserByEmailOrPhone(identifier);
    if (!user) {
      throw new ApiError({ code: 'not_found', message: 'User not found', status: 404 });
    }

    const channel = user.email ? 'EMAIL' : 'PHONE';
    const resetToken = authUtils.generateRandomToken(32);
    await authDao.createVerificationToken({
      userId: user.id,
      channel,
      purpose: 'PASSWORD_RESET',
      tokenHash: authUtils.hashValue(resetToken),
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MINUTES * 60 * 1000).toISOString(),
    });

    await authDao.insertSecurityEvent({
      userId: user.id,
      eventType: 'PASSWORD_RESET_REQUESTED',
      actorUserId: user.id,
      metadata: { channel },
    });

    return {
      message: 'Password reset token generated',
      resetToken,
      channel,
    };
  }

  async resetPassword(payload = {}) {
    const token = payload.token;
    const newPassword = payload.newPassword || payload.password;
    if (!token || !newPassword) {
      throw new ApiError({ code: 'bad_request', message: 'Token and new password are required', status: 400 });
    }

    const tokenHash = authUtils.hashValue(token);
    const verification = await authDao.findVerificationTokenByHash(tokenHash, 'PASSWORD_RESET');
    const now = new Date();

    if (!verification || verification.consumed_at || new Date(verification.expires_at) <= now || verification.attempt_count >= verification.max_attempts) {
      if (verification && !verification.consumed_at && verification.attempt_count < verification.max_attempts) {
        await authDao.incrementVerificationAttempt(verification.id);
      }
      throw new ApiError({ code: 'unauthorized', message: 'Invalid or expired password reset token', status: 401 });
    }

    const user = await authDao.findUserById(verification.user_id);
    if (!user) {
      throw new ApiError({ code: 'not_found', message: 'User not found', status: 404 });
    }

    const passwordHash = await bcrypt.hash(newPassword, PASSWORD_BCRYPT_SALT_ROUNDS || 12);
    await authDao.updateUser(user.id, {
      password_hash: passwordHash,
      status: 'ACTIVE',
      token_version: (user.token_version || 1) + 1,
    });
    await authDao.consumeVerificationToken(verification.id);
    await authDao.revokeUserSessions(user.id);

    await authDao.insertSecurityEvent({
      userId: user.id,
      eventType: 'PASSWORD_RESET_COMPLETED',
      actorUserId: user.id,
      metadata: {},
    });

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(payload = {}) {
    const token = payload.token;
    if (!token) {
      throw new ApiError({ code: 'bad_request', message: 'Verification token is required', status: 400 });
    }

    const tokenHash = authUtils.hashValue(token);
    const verification = await authDao.findVerificationTokenByHash(tokenHash, 'EMAIL_VERIFY');
    const now = new Date();

    if (!verification || verification.consumed_at || new Date(verification.expires_at) <= now || verification.channel !== 'EMAIL') {
      if (verification && !verification.consumed_at && verification.attempt_count < verification.max_attempts) {
        await authDao.incrementVerificationAttempt(verification.id);
      }
      throw new ApiError({ code: 'unauthorized', message: 'Invalid or expired email verification token', status: 401 });
    }

    const user = await authDao.findUserById(verification.user_id);
    if (!user) {
      throw new ApiError({ code: 'not_found', message: 'User not found', status: 404 });
    }

    await authDao.updateUser(user.id, {
      email_verified_at: new Date().toISOString(),
      status: 'ACTIVE',
    });
    await authDao.consumeVerificationToken(verification.id);

    await authDao.insertSecurityEvent({
      userId: user.id,
      eventType: 'EMAIL_VERIFIED',
      actorUserId: user.id,
      metadata: {},
    });

    return { message: 'Email verified successfully' };
  }

  async verifyPhone(payload = {}) {
    const token = payload.token;
    if (!token) {
      throw new ApiError({ code: 'bad_request', message: 'Verification token is required', status: 400 });
    }

    const tokenHash = authUtils.hashValue(token);
    const verification = await authDao.findVerificationTokenByHash(tokenHash, 'PHONE_VERIFY');
    const now = new Date();

    if (!verification || verification.consumed_at || new Date(verification.expires_at) <= now || verification.channel !== 'PHONE') {
      if (verification && !verification.consumed_at && verification.attempt_count < verification.max_attempts) {
        await authDao.incrementVerificationAttempt(verification.id);
      }
      throw new ApiError({ code: 'unauthorized', message: 'Invalid or expired phone verification token', status: 401 });
    }

    const user = await authDao.findUserById(verification.user_id);
    if (!user) {
      throw new ApiError({ code: 'not_found', message: 'User not found', status: 404 });
    }

    await authDao.updateUser(user.id, {
      phone_verified_at: new Date().toISOString(),
      status: 'ACTIVE',
    });
    await authDao.consumeVerificationToken(verification.id);

    await authDao.insertSecurityEvent({
      userId: user.id,
      eventType: 'PHONE_VERIFIED',
      actorUserId: user.id,
      metadata: {},
    });

    return { message: 'Phone verified successfully' };
  }

  async mfaSetup(userId) {
    const secret = authUtils.generateTotpSecret();
    const totpSecretEncrypted = authUtils.encryptSecret(secret, MFA_ENCRYPTION_KEY);
    const recoveryCodes = authUtils.generateRecoveryCodes();
    const recoveryCodeHashes = recoveryCodes.map(authUtils.hashValue);

    await authDao.upsertMfaConfiguration({
      userId,
      totpSecretEncrypted,
      recoveryCodeHashes,
    });

    return {
      message: 'MFA setup initialized',
      totpSecret: secret,
      recoveryCodes,
    };
  }

  async mfaVerify(userId, payload = {}) {
    const token = payload.token;
    if (!token) {
      throw new ApiError({ code: 'bad_request', message: 'MFA token is required', status: 400 });
    }

    const mfaConfig = await authDao.findMfaConfiguration(userId);
    if (!mfaConfig) {
      throw new ApiError({ code: 'not_found', message: 'MFA configuration not found', status: 404 });
    }

    const secret = authUtils.decryptSecret(mfaConfig.totp_secret_encrypted, MFA_ENCRYPTION_KEY);
    const recoveryCodes = Array.isArray(mfaConfig.recovery_code_hashes) ? [...mfaConfig.recovery_code_hashes] : [];
    const tokenHash = authUtils.hashValue(token);
    let isVerified = false;
    let updatedRecoveryCodes = recoveryCodes;

    if (authUtils.verifyTotp(token, secret)) {
      isVerified = true;
    } else {
      const recoveryIndex = recoveryCodes.findIndex((hash) => hash === tokenHash);
      if (recoveryIndex >= 0) {
        updatedRecoveryCodes = recoveryCodes.filter((hash) => hash !== tokenHash);
        isVerified = true;
      }
    }

    if (!isVerified) {
      throw new ApiError({ code: 'unauthorized', message: 'Invalid MFA token', status: 401 });
    }

    await authDao.upsertMfaConfiguration({
      userId,
      totpSecretEncrypted: mfaConfig.totp_secret_encrypted,
      recoveryCodeHashes: updatedRecoveryCodes,
    });

    return {
      message: 'MFA verified and enabled',
      remainingRecoveryCodes: updatedRecoveryCodes.length,
    };
  }

  async mfaChallenge(payload = {}) {
    const identifier = payload.email || payload.mobile || payload.identifier;
    const password = payload.password;
    const token = payload.token;
    const userAgent = payload.userAgent || null;
    const ipHash = payload.ipHash || null;

    if (!identifier || !password || !token) {
      throw new ApiError({ code: 'bad_request', message: 'Identifier, password, and MFA token are required', status: 400 });
    }

    const user = await authDao.findUserByEmailOrPhone(identifier);
    if (!user) {
      throw new ApiError({ code: 'unauthorized', message: 'Invalid credentials', status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      throw new ApiError({ code: 'unauthorized', message: 'Invalid credentials', status: 401 });
    }

    const mfaConfig = await authDao.findMfaConfiguration(user.id);
    if (!mfaConfig || !mfaConfig.enabled_at) {
      throw new ApiError({ code: 'forbidden', message: 'Multi-factor authentication is not enabled', status: 403 });
    }

    await verifyMfaForUser(user, token);
    const authResponse = await buildAuthTokens({ user, userAgent, ipHash });

    return authResponse;
  }

  async mfaDisable(userId) {
    await authDao.disableMfaConfiguration(userId);
    return { message: 'MFA disabled successfully' };
  }

  async me(userId) {
    const user = await authDao.findUserById(userId);
    if (!user) {
      throw new ApiError({ code: 'not_found', message: 'User not found', status: 404 });
    }
    const roles = (await resolveRoles(user.id)).map((role) => role.code);
    return { ...mapUser(user), roles };
  }

  async listUsers(queryParams = {}) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);
    const roleFilter = queryParams.role ? String(queryParams.role).toUpperCase() : '';
    const search = queryParams.search ? String(queryParams.search).trim() : '';
    const offset = (page - 1) * limit;

    const whereClauses = [];
    const values = [];
    let idx = 1;

    if (roleFilter) {
      whereClauses.push(`r.code = $${idx}`);
      values.push(roleFilter);
      idx += 1;
    }

    if (search) {
      whereClauses.push(`(u.display_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx += 1;
    }

    const whereClause = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const query = `
      SELECT u.*, array_agg(r.code) AS roles
      FROM identity_users u
      LEFT JOIN identity_global_roles gr ON gr.user_id = u.id
      LEFT JOIN identity_roles r ON r.id = gr.role_id
      ${whereClause}
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    values.push(limit, offset);

    const users = await authDao.query(query, values);
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM identity_users u
      LEFT JOIN identity_global_roles gr ON gr.user_id = u.id
      LEFT JOIN identity_roles r ON r.id = gr.role_id
      ${whereClause}
    `;
    const countResult = await authDao.query(countQuery, values.slice(0, idx - 1));
    const total = Number(countResult[0]?.total || 0);

    return {
      items: users.map((user) => ({
        ...mapUser(user),
        roles: user.roles || [],
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async menu(role) {
    try {
      const menuService = require('./menu.service');
      return await menuService.getMenuByRole(role);
    } catch (error) {
      console.error('[auth-service] failed to load menu from postgres:', error.message);
      return [];
    }
  }

  async menuDebug(role) {
    try {
      const menuService = require('./menu.service');
      return await menuService.getMenuDebugByRole(role);
    } catch (error) {
      return {
        dbEnabled: false,
        normalizedRole: String(role || 'CUSTOMER').toUpperCase(),
        error: error.message,
      };
    }
  }
}

module.exports = new AuthService();
