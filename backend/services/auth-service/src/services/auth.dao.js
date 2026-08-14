const crypto = require('crypto');
const { getPool } = require('../config/database');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function query(text, params = [], client = null) {
  if (client) {
    const result = await client.query(text, params);
    return result.rows;
  }
  const dbClient = await getPool().connect();
  try {
    const result = await dbClient.query(text, params);
    return result.rows;
  } finally {
    dbClient.release();
  }
}

async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findUserByEmailOrPhone(identifier, client = null) {
  const normalized = String(identifier || '').trim().toLowerCase();
  const rows = await query(
    `SELECT * FROM identity_users WHERE (email IS NOT NULL AND lower(email::text) = $1) OR phone = $2 LIMIT 1`,
    [normalized, normalized],
    client
  );
  return rows[0] || null;
}

async function findUserById(userId, client = null) {
  const rows = await query(`SELECT * FROM identity_users WHERE id = $1 LIMIT 1`, [userId]);
  return rows[0] || null;
}

async function createUser({ email, phone, displayName, passwordHash, status = 'PENDING_VERIFICATION', legacyAuthUserId = null }, client = null) {
  const rows = await query(
    `INSERT INTO identity_users (email, phone, display_name, password_hash, status, legacy_auth_user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [email, phone, displayName, passwordHash, status, legacyAuthUserId],
    client
  );
  return rows[0];
}

async function updateUser(userId, updates, client = null) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx += 1;
  }
  values.push(userId);
  await query(`UPDATE identity_users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx}`, values, client);
}

async function findRoleByCode(code, client = null) {
  const rows = await query(`SELECT id, code FROM identity_roles WHERE code = $1 LIMIT 1`, [code], client);
  return rows[0] || null;
}

async function assignRole(userId, roleCode, client = null) {
  const role = await findRoleByCode(roleCode, client);
  if (!role) throw new Error(`Role ${roleCode} not found`);
  await query(
    `INSERT INTO identity_global_roles (user_id, role_id, created_at)
     VALUES ($1, $2, NOW()) ON CONFLICT (user_id, role_id) DO NOTHING`,
    [userId, role.id],
    client
  );
  return role;
}

async function getUserRoles(userId, client = null) {
  return query(
    `SELECT r.id, r.code FROM identity_roles r
     JOIN identity_global_roles gr ON gr.role_id = r.id
     WHERE gr.user_id = $1`,
    [userId]
  );
}

async function findSessionById(sessionId) {
  const rows = await query(`SELECT * FROM identity_refresh_sessions WHERE id = $1 LIMIT 1`, [sessionId]);
  return rows[0] || null;
}

async function insertRefreshSession({ userId, tokenHash, familyId, parentSessionId, expiresAt, userAgent, ipHash, trustedDeviceId }, client = null) {
  const rows = await query(
    `INSERT INTO identity_refresh_sessions (user_id, token_hash, family_id, parent_session_id, expires_at, user_agent, ip_hash, trusted_device_id, created_at, last_used_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW()) RETURNING *`,
    [userId, tokenHash, familyId, parentSessionId, expiresAt, userAgent, ipHash, trustedDeviceId],
    client
  );
  return rows[0];
}

async function findRefreshSessionByHash(tokenHash) {
  const rows = await query(`SELECT * FROM identity_refresh_sessions WHERE token_hash = $1 LIMIT 1`, [tokenHash]);
  return rows[0] || null;
}

async function updateRefreshSession(sessionId, updates, client = null) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = $${idx}`);
    values.push(value);
    idx += 1;
  }
  values.push(sessionId);
  await query(`UPDATE identity_refresh_sessions SET ${fields.join(', ')} WHERE id = $${idx}`, values, client);
}

async function revokeSession(sessionId, reason = 'manual') {
  await updateRefreshSession(sessionId, { revoked_at: new Date().toISOString(), revoke_reason: reason });
}

async function revokeFamilySessions(familyId, reason = 'reuse_detected') {
  await query(`UPDATE identity_refresh_sessions SET revoked_at = NOW(), revoke_reason = $2 WHERE family_id = $1`, [familyId, reason]);
}

async function revokeUserSessions(userId, exceptSessionId = null) {
  if (exceptSessionId) {
    await query(`UPDATE identity_refresh_sessions SET revoked_at = NOW(), revoke_reason = 'logout_all' WHERE user_id = $1 AND id != $2`, [userId, exceptSessionId]);
  } else {
    await query(`UPDATE identity_refresh_sessions SET revoked_at = NOW(), revoke_reason = 'logout_all' WHERE user_id = $1`, [userId]);
  }
}

async function listSessions(userId) {
  return query(`SELECT id, family_id, parent_session_id, user_agent, expires_at, last_used_at, revoked_at FROM identity_refresh_sessions WHERE user_id = $1 ORDER BY created_at DESC`, [userId]);
}

async function createVerificationToken({ userId, channel, purpose, tokenHash, expiresAt, maxAttempts = 5 }, client = null) {
  const rows = await query(
    `INSERT INTO identity_verification_tokens (user_id, channel, purpose, token_hash, expires_at, max_attempts, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW()) RETURNING *`,
    [userId, channel, purpose, tokenHash, expiresAt, maxAttempts],
    client
  );
  return rows[0];
}

async function findVerificationTokenByHash(tokenHash, purpose) {
  const rows = await query(
    `SELECT * FROM identity_verification_tokens WHERE token_hash = $1 AND purpose = $2 LIMIT 1`,
    [tokenHash, purpose]
  );
  return rows[0] || null;
}

async function incrementVerificationAttempt(id) {
  await query(`UPDATE identity_verification_tokens SET attempt_count = attempt_count + 1 WHERE id = $1`, [id]);
}

async function consumeVerificationToken(id) {
  await query(`UPDATE identity_verification_tokens SET consumed_at = NOW() WHERE id = $1`, [id]);
}

async function upsertMfaConfiguration({ userId, totpSecretEncrypted, recoveryCodeHashes }) {
  const recoveryData = JSON.stringify(Array.isArray(recoveryCodeHashes) ? recoveryCodeHashes : []);
  await query(
    `INSERT INTO identity_mfa_configurations (user_id, totp_secret_encrypted, enabled_at, recovery_code_hashes, created_at, updated_at)
     VALUES ($1,$2,NOW(),$3,NOW(),NOW())
     ON CONFLICT (user_id) DO UPDATE SET totp_secret_encrypted = EXCLUDED.totp_secret_encrypted, enabled_at = NOW(), recovery_code_hashes = EXCLUDED.recovery_code_hashes, updated_at = NOW()`,
    [userId, totpSecretEncrypted, recoveryData]
  );
}

async function findMfaConfiguration(userId) {
  const rows = await query(`SELECT * FROM identity_mfa_configurations WHERE user_id = $1 LIMIT 1`, [userId]);
  return rows[0] || null;
}

async function disableMfaConfiguration(userId) {
  await query(`DELETE FROM identity_mfa_configurations WHERE user_id = $1`, [userId]);
}

async function insertLoginAttempt({ userId, identifierHash, ipHash, succeeded, failureCode }) {
  await query(
    `INSERT INTO identity_login_attempts (user_id, identifier_hash, ip_hash, succeeded, failure_code, created_at)
     VALUES ($1,$2,$3,$4,$5,NOW())`,
    [userId, identifierHash, ipHash, succeeded, failureCode]
  );
}

async function insertSecurityEvent({ userId, operatorOrganizationId, eventType, actorUserId, requestId, metadata = {} }) {
  await query(
    `INSERT INTO identity_security_events (user_id, operator_organization_id, event_type, actor_user_id, request_id, metadata, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
    [userId, operatorOrganizationId, eventType, actorUserId, requestId, JSON.stringify(metadata)]
  );
}

async function insertIdentityOutbox({ eventType, aggregateType, aggregateId, requestId, payload }, client = null) {
  await query(
    `INSERT INTO identity_outbox (event_id, event_type, aggregate_type, aggregate_id, request_id, payload, occurred_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())`,
    [eventType, aggregateType, aggregateId, requestId, JSON.stringify(payload)],
    client
  );
}

module.exports = {
  query,
  withTransaction,
  hashToken,
  findUserByEmailOrPhone,
  findUserById,
  createUser,
  updateUser,
  findRoleByCode,
  assignRole,
  getUserRoles,
  findSessionById,
  insertRefreshSession,
  findRefreshSessionByHash,
  updateRefreshSession,
  revokeSession,
  revokeFamilySessions,
  revokeUserSessions,
  listSessions,
  createVerificationToken,
  findVerificationTokenByHash,
  incrementVerificationAttempt,
  consumeVerificationToken,
  upsertMfaConfiguration,
  findMfaConfiguration,
  disableMfaConfiguration,
  insertLoginAttempt,
  insertSecurityEvent,
  insertIdentityOutbox,
};
