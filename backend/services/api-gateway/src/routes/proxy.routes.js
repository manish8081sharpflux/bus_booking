const express = require('express');
const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
const {
  AUTH_SERVICE_URL,
  BOOKING_SERVICE_URL,
  OPERATOR_SERVICE_URL,
  SEARCH_SERVICE_URL,
  TRACKING_SERVICE_URL
} = require('../config/env');

const router = express.Router();

const jsonProxyOptions = {
  changeOrigin: true,
  xfwd: true,
  logLevel: 'warn',
  on: { proxyReq: fixRequestBody }
};

const proxyTo = (target, prefix) => createProxyMiddleware({
  target,
  ...jsonProxyOptions,
  pathRewrite: (path) => {
    const normalized = String(path || '/').replace(/^\/api/, '');
    const withoutPrefix = normalized.startsWith(prefix)
      ? normalized.slice(prefix.length)
      : normalized;

    return `${prefix}${withoutPrefix || ''}`;
  }
});

router.use('/auth', proxyTo(AUTH_SERVICE_URL, '/auth'));
router.use('/bookings', proxyTo(BOOKING_SERVICE_URL, '/bookings'));
router.use('/operators', proxyTo(OPERATOR_SERVICE_URL, '/operators'));
router.use('/buses', proxyTo(OPERATOR_SERVICE_URL, '/buses'));
router.use('/routes', proxyTo(OPERATOR_SERVICE_URL, '/routes'));
router.use('/trips', proxyTo(OPERATOR_SERVICE_URL, '/trips'));
router.use('/operator-bookings', proxyTo(OPERATOR_SERVICE_URL, '/operator-bookings'));
router.use('/admin', proxyTo(OPERATOR_SERVICE_URL, '/admin'));
router.use('/staff', proxyTo(OPERATOR_SERVICE_URL, '/staff'));
router.use('/search', proxyTo(SEARCH_SERVICE_URL, '/search'));
router.use('/tracking', proxyTo(TRACKING_SERVICE_URL, '/tracking'));

module.exports = router;
