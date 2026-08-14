const { Pool } = require('pg');
const { MENU_DATABASE_URL } = require('../../config/env');

let pool;

function getMenuPool() {
  if (!MENU_DATABASE_URL) {
    return null;
  }

  if (!pool) {
    pool = new Pool({ connectionString: MENU_DATABASE_URL });
  }

  return pool;
}

module.exports = { getMenuPool };
