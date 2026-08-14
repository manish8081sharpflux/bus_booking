const { Pool } = require('pg');
const { DATABASE_URL } = require('../../config/env');

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required for booking-service');
}

const pool = new Pool({ connectionString: DATABASE_URL });

module.exports = pool;
