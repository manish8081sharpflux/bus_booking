const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), override: true });

module.exports = {
  PORT: Number(process.env.API_GATEWAY_PORT || process.env.PORT || 4000),
  AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:4100',
  BOOKING_SERVICE_URL: process.env.BOOKING_SERVICE_URL || 'http://127.0.0.1:4200',
  OPERATOR_SERVICE_URL: process.env.OPERATOR_SERVICE_URL || 'http://127.0.0.1:4600',
  SEARCH_SERVICE_URL: process.env.SEARCH_SERVICE_URL || 'http://127.0.0.1:4300',
  TRACKING_SERVICE_URL: process.env.TRACKING_SERVICE_URL || 'http://127.0.0.1:4400',
  WHATSAPP_SERVICE_URL: process.env.WHATSAPP_SERVICE_URL || 'http://127.0.0.1:4700'
};
