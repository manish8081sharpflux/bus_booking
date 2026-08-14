const { kafka } = require('../infrastructure/events/kafka.client');
const TripView = require('../models/trip-view.model');
const { KAFKA_BOOKING_TOPIC, KAFKA_GROUP_ID } = require('../config/env');

async function startBookingProjectionConsumer() {
  const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_BOOKING_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString());
      const { eventType, payload } = event;
      if (!payload || !payload.trip_id) return;

      if (eventType === 'booking.created') {
        await TripView.updateOne(
          { tripId: payload.trip_id },
          { $inc: { availableSeats: -payload.seats } },
          { upsert: true }
        );
      }

      if (eventType === 'booking.cancelled') {
        await TripView.updateOne({ tripId: payload.trip_id }, { $inc: { availableSeats: payload.seats } });
      }
    }
  });

  console.log('[search-service] booking projection consumer started');
}

module.exports = { startBookingProjectionConsumer };
