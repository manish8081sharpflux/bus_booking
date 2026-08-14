const path = require('path')

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') })

const PORT =
  Number(process.env.PORT) || 4600

const DATABASE_URL =
  process.env.DATABASE_URL

const NODE_ENV =
  process.env.NODE_ENV || 'development'

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is required for operator-service',
  )
}

module.exports = {
  PORT,
  DATABASE_URL,
  NODE_ENV,
}
