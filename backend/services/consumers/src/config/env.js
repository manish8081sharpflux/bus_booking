const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: Number(process.env.PORT || 4500),
  MONGO_URI: process.env.MONGO_URI,
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'consumers-service',
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'sync-notify-group',
  KAFKA_BOOKING_TOPIC: process.env.KAFKA_BOOKING_TOPIC || 'booking.events',
  KAFKA_TRACKING_TOPIC: process.env.KAFKA_TRACKING_TOPIC || 'tracking.events'
};
