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

const bookingRoutes = require('./routes/booking.routes');
const paymentWebhookController = require('./controllers/payment-webhook.controller');

const app = express();

app.set('trust proxy', 1);
app.use(correlationId());
app.use(requestTimeout());
app.use(productionSecurity());
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.BOOKING_RATE_LIMIT_PER_MINUTE || 180), skip: (req) => req.path === '/health' }));
app.use(securityHeaders());

// Razorpay signs the exact request bytes. This route must run before express.json().
app.post(
  '/bookings/payments/webhook',
  express.raw({ type: 'application/json', limit: process.env.BOOKING_WEBHOOK_BODY_LIMIT || '1mb' }),
  paymentWebhookController.razorpay
);

app.use(bodyParser.json());
app.use(requestLogger);
app.use(apiVersion());

app.get('/health', (_req, res) => {
  res.json({ service: 'booking-service', status: 'ok' });
});

app.use('/bookings', bookingRoutes);

app.use(notFound());
app.use(errorHandler());

module.exports = app;
