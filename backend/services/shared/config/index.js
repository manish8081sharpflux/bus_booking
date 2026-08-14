const env = process.env.NODE_ENV || 'development';
const defaultConfig = {
  env,
  serviceName: process.env.SERVICE_NAME || 'unknown-service',
  bodyLimit: process.env.BODY_LIMIT || '100kb',
  requestIdHeader: 'x-request-id',
  port: process.env.PORT || 3000,
  AUTH_DATABASE_URL: process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || '',
};

module.exports = defaultConfig;
