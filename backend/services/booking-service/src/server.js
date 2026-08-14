const app = require('./app');
const pool = require('./infrastructure/database/postgres.connection');
const { PORT, KAFKA_ENABLED } = require('./config/env');
const { setupGraceful } = require('../../shared/graceful');
const { validateProductionEnv } = require('../../shared/production/env');

async function bootstrap() {
  validateProductionEnv({ service: 'booking-service', requiredVars: ['DATABASE_URL', 'INTERNAL_SERVICE_KEY'], secretVars: ['JWT_SECRET', 'INTERNAL_SERVICE_KEY', 'BOARDING_CREDENTIAL_SECRET'] });
  await pool.query('SELECT 1');
  console.log('[booking-service] PostgreSQL connected');
  require('./services/refund.worker').startRefundWorker();

  if (KAFKA_ENABLED) {
    try {
      const { connectProducer } = require('./infrastructure/events/kafka.client');
      await connectProducer();
    } catch (error) {
      console.warn('[booking-service] Kafka unavailable; continuing without event publishing:', error.message);
    }
  }

  const server = app.listen(PORT, () => {
    console.log(`[booking-service] listening on port ${PORT}`);
  });
  setupGraceful({ servers: [server], closeables: [() => pool.end()] });
}

bootstrap().catch((error) => {
  console.error('[booking-service] bootstrap failed', error);
  process.exit(1);
});
