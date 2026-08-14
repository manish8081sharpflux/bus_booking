const correlation = require('./correlationId');
const asyncHandler = require('./asyncHandler');
const errorHandler = require('./errorHandler');
const notFound = require('./notFound');
const requestLogger = require('./requestLogger');
const securityHeaders = require('./securityHeaders');
const bodyParser = require('./bodyParser');
const corsHelper = require('./corsHelper');
const apiVersion = require('./apiVersion');
const rateLimit = require('./rateLimit');
const requestTimeout = require('./requestTimeout');
const productionSecurity = require('./productionSecurity');

module.exports = {
  correlationId: correlation,
  asyncHandler,
  errorHandler,
  notFound,
  requestLogger,
  securityHeaders,
  bodyParser,
  corsHelper,
  apiVersion,
  rateLimit,
  requestTimeout,
  productionSecurity,
};
