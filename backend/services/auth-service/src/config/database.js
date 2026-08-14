const { Pool } = require('pg');
const { AUTH_DATABASE_URL } = require('./env');

let pool;

function getPool() {
  if (!AUTH_DATABASE_URL) {
    throw new Error('AUTH_DATABASE_URL is required for auth service');
  }
  if (!pool) {
    pool = new Pool({ connectionString: AUTH_DATABASE_URL });
  }
  return pool;
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { getPool, closePool };
