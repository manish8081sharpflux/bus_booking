const express = require('express');
const {
  AUTH_SERVICE_URL,
  BOOKING_SERVICE_URL,
  OPERATOR_SERVICE_URL,
  SEARCH_SERVICE_URL,
  TRACKING_SERVICE_URL
} = require('../config/env');

const router = express.Router();

router.get('/architecture', (_req, res) => {
  res.json({
    type: 'microservices',
    entrypoint: {
      service: 'api-gateway',
      basePath: '/api'
    },
    syncFlow: [
      'client -> api-gateway -> target-service -> response'
    ],
    asyncFlow: [
      'booking-service -> kafka topic (booking.events) -> search-service + consumers'
    ],
    services: [
      {
        name: 'auth-service',
        purpose: 'user registration/login',
        db: 'MongoDB',
        routeViaGateway: '/api/auth',
        url: AUTH_SERVICE_URL
      },
      {
        name: 'booking-service',
        purpose: 'create/cancel bookings and publish booking events',
        db: 'PostgreSQL',
        routeViaGateway: '/api/bookings',
        url: BOOKING_SERVICE_URL
      },
      {
        name: 'operator-service',
        purpose: 'register and manage operators with free registration',
        db: 'PostgreSQL',
        routeViaGateway: '/api/operators',
        url: OPERATOR_SERVICE_URL
      },
      {
        name: 'search-service',
        purpose: 'query read model and update projections from Kafka',
        db: 'MongoDB',
        routeViaGateway: '/api/search',
        url: SEARCH_SERVICE_URL
      },
      {
        name: 'tracking-service',
        purpose: 'store/read live location and publish tracking events',
        db: 'Redis',
        routeViaGateway: '/api/tracking',
        url: TRACKING_SERVICE_URL
      },
      {
        name: 'consumers',
        purpose: 'background event processing',
        db: 'MongoDB',
        routeViaGateway: null,
        url: null
      }
    ]
  });
});

module.exports = router;
