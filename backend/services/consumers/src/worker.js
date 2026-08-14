const connectMongo = require('./infrastructure/database/mongo.connection');
const { consumer } = require('./infrastructure/events/kafka.client');
const { handleBookingEvent } = require('./handlers/booking.handler');
const { handleTrackingEvent } = require('./handlers/tracking.handler');
const { KAFKA_BOOKING_TOPIC, KAFKA_TRACKING_TOPIC } = require('./config/env');

async function bootstrap() {
  await connectMongo();

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_BOOKING_TOPIC, fromBeginning: false });
  await consumer.subscribe({ topic: KAFKA_TRACKING_TOPIC, fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;

      const event = JSON.parse(message.value.toString());

      if (topic === KAFKA_BOOKING_TOPIC) {
        await handleBookingEvent(event);
        return;
      }

      if (topic === KAFKA_TRACKING_TOPIC) {
        await handleTrackingEvent(event);
      }
    }
  });

  console.log('[consumers] worker started');
}

bootstrap().catch((error) => {
  console.error('[consumers] bootstrap failed', error);
  process.exit(1);
});
