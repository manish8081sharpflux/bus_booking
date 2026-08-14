const jwtLib = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'development-only-change-me');
if (!JWT_SECRET) throw new Error('JWT_SECRET is required in production.');
const JWT_ISSUER = process.env.JWT_ISSUER || 'bus-booking-auth';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'bus-booking';
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';

function generateAccessToken({ userId, organizationId, roleIds, roleCodes, permissionVersion, sessionId, tokenVersion, audience, extra = {} }) {
  const payload = {
    sub: userId,
    org: organizationId || null,
    roles: roleIds || [],
    roleCodes: roleCodes || [],
    pv: permissionVersion || 1,
    sid: sessionId || null,
    tv: tokenVersion || 1,
    role: (roleCodes && roleCodes[0]) || null,
    ...extra,
  };

  return jwtLib.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: audience || JWT_AUDIENCE,
    jwtid: sessionId || undefined,
  });
}

function verifyAccessToken(token) {
  try {
    return jwtLib.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      throw error;
    }
    return jwtLib.verify(token, JWT_SECRET);
  }
}

module.exports = { generateAccessToken, verifyAccessToken };
