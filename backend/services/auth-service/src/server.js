const { PORT } = require('./config/env');
const app = require('./app');
const menuService = require('./services/menu.service');
const { setupGraceful } = require('../../shared/graceful');
const { validateProductionEnv } = require('../../shared/production/env');

async function bootstrap() {
  validateProductionEnv({ service: 'auth-service', requiredVars: ['DATABASE_URL', 'ALLOWED_ORIGINS'], secretVars: ['JWT_SECRET'] });
  await menuService.initialize();

  const server = app.listen(PORT, () => {
    console.log(`[auth-service] listening on port ${PORT}`);
  });
  setupGraceful({ servers: [server] });
}

bootstrap().catch((error) => {
  console.error('[auth-service] bootstrap failed', error);
  process.exit(1);
});
