const { verifyAccessToken } = require('../../../shared/auth/jwt');

function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      const payload = verifyAccessToken(header.slice(7));
      req.auth = { userId: payload.sub, roles: payload.roleCodes || [payload.role].filter(Boolean) };
    }
  } catch (_) {}
  next();
}

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ success:false, message:'Authentication required.' });
    const payload = verifyAccessToken(header.slice(7));
    req.auth = { userId: payload.sub, roles: payload.roleCodes || [payload.role].filter(Boolean) };
    next();
  } catch (_) { return res.status(401).json({ success:false, message:'Invalid or expired token.' }); }
}
module.exports = { optionalAuth, requireAuth };
