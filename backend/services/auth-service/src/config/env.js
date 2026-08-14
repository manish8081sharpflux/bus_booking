const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: Number(process.env.PORT || 4000),
  MONGO_URI: process.env.MONGO_URI,
  DATABASE_URL: process.env.DATABASE_URL || '',
  AUTH_DATABASE_URL: process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || '',
  MENU_DATABASE_URL: process.env.AUTH_MENU_DATABASE_URL || process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'change-me',
  JWT_ISSUER: process.env.JWT_ISSUER || 'bus-booking-auth',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'bus-booking',
  ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
  REFRESH_TOKEN_EXPIRES_DAYS: Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 30),
  REFRESH_TOKEN_ROTATION_GRACE_PERIOD_MINUTES: Number(process.env.REFRESH_TOKEN_ROTATION_GRACE_PERIOD_MINUTES || 5),
  PASSWORD_BCRYPT_SALT_ROUNDS: Number(process.env.PASSWORD_BCRYPT_SALT_ROUNDS || 12),
  MAX_FAILED_LOGIN_ATTEMPTS: Number(process.env.MAX_FAILED_LOGIN_ATTEMPTS || 5),
  LOCKOUT_DURATION_MINUTES: Number(process.env.LOCKOUT_DURATION_MINUTES || 15),
  VERIFICATION_TOKEN_TTL_MINUTES: Number(process.env.VERIFICATION_TOKEN_TTL_MINUTES || 10),
  MFA_ENCRYPTION_KEY: process.env.MFA_ENCRYPTION_KEY || '',
  ADMIN_CREATION_KEY: process.env.ADMIN_CREATION_KEY || '',
  ENABLE_MONGO: process.env.ENABLE_MONGO === 'true',
};
