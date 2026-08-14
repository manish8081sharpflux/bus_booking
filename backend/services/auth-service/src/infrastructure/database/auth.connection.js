const { getPool } = require('../../config/database');

function getAuthPool() {
  return getPool();
}

module.exports = { getAuthPool };
