const { verifyAccessToken } = require('./jwt');
const { ApiError } = require('../errors');
const db = require('./postgres');

async function resolveUserRoles(userId, fallbackRoleCode) {
  if (fallbackRoleCode) {
    const rows = await db.query('SELECT id, code FROM identity_roles WHERE code = $1 LIMIT 1', [fallbackRoleCode]);
    return rows.map((r) => ({ id: r.id, code: r.code }));
  }
  return db.query(
    `SELECT r.id, r.code FROM identity_roles r
     JOIN identity_global_roles gr ON gr.role_id = r.id
     WHERE gr.user_id = $1`,
    [userId]
  );
}

function getRoleCodes(rows) {
  return rows.map((r) => r.code);
}

function getRoleIds(rows) {
  return rows.map((r) => r.id);
}

function createAuthContext(payload, user, roles) {
  const roleCodes = getRoleCodes(roles);
  return {
    userId: payload.sub,
    organizationId: payload.org || null,
    roleIds: payload.roles && payload.roles.length ? payload.roles : getRoleIds(roles),
    roleCodes,
    permissions: [],
    permissionVersion: payload.pv || user.token_version || 1,
    sessionId: payload.sid || null,
    tokenVersion: payload.tv || user.token_version || 1,
    status: user.status,
    raw: payload,
  };
}

function requireAuth() {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) throw new ApiError({ code: 'unauthorized', message: 'Missing authorization token', status: 401, requestId: req.requestId });
      const payload = verifyAccessToken(token);
      if (!payload || !payload.sub) throw new ApiError({ code: 'unauthorized', message: 'Invalid token', status: 401, requestId: req.requestId });

      const users = await db.query(`SELECT id, status, token_version FROM identity_users WHERE id = $1 LIMIT 1`, [payload.sub]);
      const user = users[0];
      if (!user) throw new ApiError({ code: 'unauthorized', message: 'Invalid token user', status: 401, requestId: req.requestId });
      if (['SUSPENDED', 'DELETED'].includes(user.status)) {
        throw new ApiError({ code: 'forbidden', message: 'Account access suspended', status: 403, requestId: req.requestId });
      }
      if (payload.tv && user.token_version && payload.tv !== user.token_version) {
        throw new ApiError({ code: 'unauthorized', message: 'Token version mismatch', status: 401, requestId: req.requestId });
      }

      const roles = await resolveUserRoles(user.id, payload.roleCodes && payload.roleCodes.length ? null : payload.role);
      req.auth = createAuthContext(payload, user, roles);
      req.auth.permissions = await db.query(
        `SELECT p.code FROM identity_permissions p
         JOIN identity_role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = ANY($1)`,
        [req.auth.roleIds]
      ).then((rows) => rows.map((r) => r.code));
      next();
    } catch (err) {
      next(err.code === 'unauthorized' || err.code === 'forbidden'
        ? err
        : new ApiError({ code: 'unauthorized', message: 'Invalid or expired token', status: 401, requestId: req.requestId })
      );
    }
  };
}

function requireRoles(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.auth) return next(new ApiError({ code: 'unauthorized', message: 'Not authenticated', status: 401, requestId: req.requestId }));
    const userRoles = req.auth.roleCodes || [];
    if (!allowedRoles.some((allowed) => userRoles.includes(allowed))) {
      return next(new ApiError({ code: 'forbidden', message: 'Forbidden for this role', status: 403, requestId: req.requestId }));
    }
    next();
  };
}

function requirePermission(permission) {
  return async (req, res, next) => {
    if (!req.auth) return next(new ApiError({ code: 'unauthorized', message: 'Not authenticated', status: 401, requestId: req.requestId }));
    const rows = await db.query(
      `SELECT 1 FROM identity_role_permissions rp
       JOIN identity_permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ANY($1) AND p.code = $2`,
      [req.auth.roleIds, permission]
    );
    if (rows.length === 0) {
      return next(new ApiError({ code: 'forbidden', message: 'Forbidden for this permission', status: 403, requestId: req.requestId }));
    }
    next();
  };
}

function requireOrganizationMembership() {
  return async (req, res, next) => {
    if (!req.auth) return next(new ApiError({ code: 'unauthorized', message: 'Not authenticated', status: 401, requestId: req.requestId }));
    if (!req.auth.organizationId) return next(new ApiError({ code: 'forbidden', message: 'Organization context required', status: 403, requestId: req.requestId }));
    const rows = await db.query(
      `SELECT 1 FROM identity_organization_memberships m WHERE m.user_id = $1 AND m.operator_organization_id = $2 AND m.status = 'ACTIVE'`,
      [req.auth.userId, req.auth.organizationId]
    );
    if (rows.length === 0) {
      return next(new ApiError({ code: 'forbidden', message: 'User not a member of organization', status: 403, requestId: req.requestId }));
    }
    next();
  };
}

function requireOwnership(entityTable, entityIdParam) {
  return async (req, res, next) => {
    if (!req.auth) return next(new ApiError({ code: 'unauthorized', message: 'Not authenticated', status: 401, requestId: req.requestId }));
    const entityId = req.params[entityIdParam];
    const rows = await db.query(`SELECT owner_user_id, operator_id FROM ${entityTable} WHERE id = $1`, [entityId]);
    if (rows.length === 0) return next(new ApiError({ code: 'not_found', message: 'Resource not found', status: 404, requestId: req.requestId }));
    const entity = rows[0];
    if (req.auth.roleIds && req.auth.roleIds.length > 0) {
      const roles = await db.query('SELECT code FROM identity_roles WHERE id = ANY($1)', [req.auth.roleIds]);
      if (roles.some((r) => r.code === 'SUPER_ADMIN')) return next();
    }
    if (entity.owner_user_id && entity.owner_user_id === req.auth.userId) return next();
    if (entity.operator_id && entity.operator_id === req.auth.organizationId) return next();
    return next(new ApiError({ code: 'forbidden', message: 'Not owner of resource', status: 403, requestId: req.requestId }));
  };
}

module.exports = { requireAuth, requireRoles, requirePermission, requireOrganizationMembership, requireOwnership };
