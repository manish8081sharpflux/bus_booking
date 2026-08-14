const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: Number(process.env.PORT || 4300),
  MONGO_URI: process.env.MONGO_URI,
  KAFKA_BROKERS: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  KAFKA_CLIENT_ID: process.env.KAFKA_CLIENT_ID || 'search-service',
  KAFKA_BOOKING_TOPIC: process.env.KAFKA_BOOKING_TOPIC || 'booking.events',
  KAFKA_GROUP_ID: process.env.KAFKA_GROUP_ID || 'search-projection-group'
};
