const {
  PORT,
} = require('./config/env')

const app =
  require('./app')

const pool =
  require(
    './infrastructure/database/postgres.connection',
  )

const { validateProductionEnv } = require('../../shared/production/env')

const startServer =
  async () => {
    try {
      validateProductionEnv({ service: 'operator-service', requiredVars: ['DATABASE_URL', 'ALLOWED_ORIGINS'], secretVars: ['JWT_SECRET'] })
      /*
       * Verify DB before starting.
       */
      await pool.query(
        'SELECT 1',
      )

      console.log(
        '[operator-service] database connection verified',
      )

      const server =
        app.listen(
          PORT,
          () => {
            console.log(
              `[operator-service] listening on port ${PORT}`,
            )
          },
        )

      const shutdown =
        async () => {
          console.log(
            '[operator-service] shutting down...',
          )

          server.close(
            async () => {
              await pool.end()

              console.log(
                '[operator-service] stopped',
              )

              process.exit(0)
            },
          )
        }

      process.on(
        'SIGINT',
        shutdown,
      )

      process.on(
        'SIGTERM',
        shutdown,
      )
    } catch (error) {
      console.error(
        '[operator-service] startup failed:',
        error,
      )

      process.exit(1)
    }
  }

startServer()