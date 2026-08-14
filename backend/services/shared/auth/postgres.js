const { Pool } = require('pg');
const config = require('../config');

let pool;

function getAuthPool() {
  const connectionString = process.env.AUTH_DATABASE_URL || process.env.DATABASE_URL || config.AUTH_DATABASE_URL;
  if (!connectionString) {
    throw new Error('AUTH_DATABASE_URL is required');
  }
  if (!pool) {
    pool = new Pool({ connectionString });
  }
  return pool;
}

async function query(text, params) {
  const client = await getAuthPool().connect();
  try {
    const result = await client.query(text, params);
    return result.rows;
  } finally {
    client.release();
  }
}

module.exports = { query, getAuthPool };
