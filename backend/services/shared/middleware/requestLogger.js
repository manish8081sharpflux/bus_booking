const { createLogger } = require('../logger');
const config = require('../config');
const logger = createLogger(config.serviceName || 'service');

module.exports = function requestLogger(req, _res, next) {
  const meta = {
    method: req.method,
    path: req.originalUrl || req.url,
    headers: { 'x-request-id': req.requestId || null },
    remote: req.ip || req.connection && req.connection.remoteAddress,
  };
  logger.info('request', meta);
  next();
};
