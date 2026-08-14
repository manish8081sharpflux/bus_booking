const { verifyAccessToken } = require('../../../shared/auth/jwt');

exports.requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Missing authorization token' });
    const payload = verifyAccessToken(token);
    const roles = Array.isArray(payload.roleCodes) ? payload.roleCodes : [payload.role].filter(Boolean);
    req.auth = { userId: payload.sub, organizationId: payload.org || null, roles, role: roles[0] || null };
    return next();
  } catch (_error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

exports.requireRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.auth) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!req.auth.roles.some((role) => allowedRoles.includes(role))) {
    return res.status(403).json({ success: false, message: 'Forbidden for this role' });
  }
  return next();
};
