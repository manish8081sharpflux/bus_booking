const express = require('express');

const correlationId = require('../../shared/middleware/correlationId');
const bodyParser = require('../../shared/middleware/bodyParser');
const requestLogger = require('../../shared/middleware/requestLogger');
const errorHandler = require('../../shared/middleware/errorHandler');
const notFound = require('../../shared/middleware/notFound');
const securityHeaders = require('../../shared/middleware/securityHeaders');
const apiVersion = require('../../shared/middleware/apiVersion');
const rateLimit = require('../../shared/middleware/rateLimit');
const requestTimeout = require('../../shared/middleware/requestTimeout');
const productionSecurity = require('../../shared/middleware/productionSecurity');

const searchRoutes = require('./routes/search.routes');

const app = express();

app.set('trust proxy', 1);
app.use(correlationId());
app.use(requestTimeout());
app.use(productionSecurity());
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.SEARCH_RATE_LIMIT_PER_MINUTE || 300), skip: (req) => req.path === '/health' }));
app.use(securityHeaders());
app.use(bodyParser.json());
app.use(requestLogger);
app.use(apiVersion());

app.get('/health', (_req, res) => {
  res.json({ service: 'search-service', status: 'ok' });
});

app.use('/search', searchRoutes);

app.use(notFound());
app.use(errorHandler());

module.exports = app;
