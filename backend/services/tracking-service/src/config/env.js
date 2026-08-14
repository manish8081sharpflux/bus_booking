const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: Number(process.env.PORT || 4400),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'tracking-service',
  KAFKA_TRACKING_TOPIC: process.env.KAFKA_TRACKING_TOPIC || 'tracking.events'
};
