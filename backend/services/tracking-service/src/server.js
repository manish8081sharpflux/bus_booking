const app = require('./app');
const redis = require('./infrastructure/cache/redis.client');
const { connectProducer } = require('./infrastructure/events/kafka.client');
const { PORT } = require('./config/env');
const { setupGraceful } = require('../../shared/graceful');
const { validateProductionEnv } = require('../../shared/production/env');

async function bootstrap() {
  validateProductionEnv({ service: 'tracking-service', requiredVars: ['REDIS_URL'], secretVars: ['JWT_SECRET', 'TRACKING_DEVICE_KEY'] });
  await redis.ping();
  await connectProducer();

  const server = app.listen(PORT, () => {
    console.log(`[tracking-service] listening on port ${PORT}`);
  });
  setupGraceful({ servers: [server], closeables: [() => redis.quit ? redis.quit() : Promise.resolve()] });
}

bootstrap().catch((error) => {
  console.error('[tracking-service] bootstrap failed', error);
  process.exit(1);
});
