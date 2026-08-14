const app = require('./app');
const { PORT } = require('./config/env');
const { setupGraceful } = require('../../shared/graceful');
const { validateProductionEnv } = require('../../shared/production/env');

validateProductionEnv({ service: 'api-gateway', requiredVars: ['ALLOWED_ORIGINS'] });
const server = app.listen(PORT, () => console.log(`[gateway] listening on port ${PORT}`));
setupGraceful({ servers: [server] });
