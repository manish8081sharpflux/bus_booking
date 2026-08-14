const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { WHATSAPP_SERVICE_URL } = require('./config/env');

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

const proxyRoutes = require('./routes/proxy.routes');
const learningRoutes = require('./routes/learning.routes');

const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.options('/{*any}', cors(corsOptions));
app.use(requestTimeout());
app.use(productionSecurity());
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.GATEWAY_RATE_LIMIT_PER_MINUTE || 300), skip: (req) => req.path === '/health' || req.path.startsWith('/api/whatsapp') }));

// WhatsApp webhook must be proxied before JSON parsing so Meta's X-Hub-Signature-256
// continues to match the exact raw request body.
app.use('/api/whatsapp', createProxyMiddleware({
  target: WHATSAPP_SERVICE_URL,
  changeOrigin: true,
  xfwd: true,
  logLevel: 'warn',
}));

app.use(correlationId());
app.use(securityHeaders());
app.use(bodyParser.json());
app.use(requestLogger);
app.use(apiVersion());

// Health check
app.get('/health', (_req, res) => {
  res.json({ service: 'api-gateway', status: 'ok' });
});

// Routes
app.use('/api', proxyRoutes);
// Backward-compatible service aliases for older admin builds. New clients use /api/*.
app.use('/learn', learningRoutes);
// Compatibility for older clients that called gateway routes without /api.
// Keep this after gateway-owned routes so it cannot shadow them.
app.use('/', proxyRoutes);

app.use(notFound());
app.use(errorHandler());

module.exports = app;
