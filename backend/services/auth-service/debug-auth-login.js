const authService = require('./src/services/auth.service');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
(async () => {
  try {
    const result = await authService.login({ mobile: '+15555550100', password: 'Admin123!' });
    console.log('login result', result);
  } catch (error) {
    console.error('login failed', error);
  }
})();
