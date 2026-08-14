require('dotenv').config();
const app = require('./app');
const { setupGraceful } = require('../../shared/graceful');
const { validateProductionEnv } = require('../../shared/production/env');
validateProductionEnv({ service: 'whatsapp-service', requiredVars: ['DATABASE_URL', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_APP_SECRET', 'INTERNAL_SERVICE_KEY'], secretVars: ['WHATSAPP_APP_SECRET', 'INTERNAL_SERVICE_KEY'] });
const port = Number(process.env.PORT || 4700);
const server = app.listen(port, () => console.log(`whatsapp-service listening on ${port}`));
const localWeb = require('./services/local-web');
if (localWeb.enabled()) {
  localWeb.start().catch((error) => {
    console.error('[BusGo WhatsApp Local] startup failed:', error);
    process.exitCode = 1;
  });
}
process.on('SIGINT', () => localWeb.stop());
process.on('SIGTERM', () => localWeb.stop());
setupGraceful({ servers: [server] });
