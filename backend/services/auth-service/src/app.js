const express = require('express');
const cors = require('cors');

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

const authRoutes = require('./routes/auth.routes');

const app = express();

// ✅ CORS Configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
};

// Apply CORS
app.set('trust proxy', 1);
app.use(cors(corsOptions));
app.options('/{*any}', cors(corsOptions));

app.use(correlationId());
app.use(requestTimeout());
app.use(productionSecurity());
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.AUTH_RATE_LIMIT_PER_MINUTE || 120), skip: (req) => req.path === '/health' }));
app.use('/auth/login', rateLimit({ windowMs: 15 * 60_000, max: Number(process.env.LOGIN_RATE_LIMIT || 10), message: 'Too many login attempts. Try again later.' }));
app.use('/auth/customer/phone-otp/request', rateLimit({ windowMs: 10 * 60_000, max: Number(process.env.OTP_REQUEST_RATE_LIMIT || 5), message: 'Too many OTP requests. Try again later.' }));
app.use('/auth/customer/phone-signup/request', rateLimit({ windowMs: 10 * 60_000, max: Number(process.env.OTP_REQUEST_RATE_LIMIT || 5), message: 'Too many OTP requests. Try again later.' }));
app.use(securityHeaders());
app.use(bodyParser.json());
app.use(requestLogger);
app.use(apiVersion());

// Health check
app.get('/health', (_req, res) => {
  res.json({ service: 'auth-service', status: 'ok' });
});

// Routes
app.use('/auth', authRoutes);

app.use(notFound());
app.use(errorHandler());

module.exports = app;
