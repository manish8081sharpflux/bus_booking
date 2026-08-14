const app = require('./app');
const connectMongo = require('./infrastructure/database/mongo.connection');
const { startBookingProjectionConsumer } = require('./consumers/booking-events.consumer');
const { PORT } = require('./config/env');

async function bootstrap() {
  await connectMongo();
  await startBookingProjectionConsumer();

  app.listen(PORT, () => {
    console.log(`[search-service] listening on port ${PORT}`);
  });
}

bootstrap().catch((error) => {
  console.error('[search-service] bootstrap failed', error);
  process.exit(1);
});
