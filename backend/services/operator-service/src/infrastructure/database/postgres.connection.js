const { Pool } = require('pg')

const {
  DATABASE_URL,
  NODE_ENV,
} = require('../../config/env')

const pool = new Pool({
  connectionString: DATABASE_URL,

  ssl:
    NODE_ENV === 'production'
      ? {
          rejectUnauthorized: false,
        }
      : false,
})

pool.on('connect', () => {
  console.log(
    '[operator-service] PostgreSQL connected',
  )
})

pool.on('error', (error) => {
  console.error(
    '[operator-service] PostgreSQL error:',
    error,
  )
})

module.exports = pool