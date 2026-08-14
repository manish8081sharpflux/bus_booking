const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

module.exports = {
  PORT: Number(process.env.PORT || 4200),
  DATABASE_URL: process.env.DATABASE_URL,
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'booking-service',
  KAFKA_TOPIC_BOOKING_EVENTS: process.env.KAFKA_TOPIC_BOOKING_EVENTS || 'booking.events',
  KAFKA_ENABLED: process.env.KAFKA_ENABLED === 'true'
};
