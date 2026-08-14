const express =
  require('express')

const cors =
  require('cors')

const multer =
  require('multer')

const rateLimit = require('../../shared/middleware/rateLimit')
const requestTimeout = require('../../shared/middleware/requestTimeout')
const productionSecurity = require('../../shared/middleware/productionSecurity')

const operatorRoutes =
  require(
    './routes/operator.routes',
  )

const busRoutes =
  require(
    './routes/bus.routes',
  )
const catalogRoutes = require('./routes/catalog.routes')
const adminRoutes = require('./routes/admin.routes')
const staffRoutes = require('./routes/staff.routes')

const app =
  express()

app.set('trust proxy', 1)
app.use(requestTimeout())
app.use(productionSecurity())
app.use(rateLimit({ windowMs: 60_000, max: Number(process.env.OPERATOR_RATE_LIMIT_PER_MINUTE || 240), skip: (req) => req.path === '/health' }))

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

/*
 * =====================================================
 * CORS
 * =====================================================
 */

app.use(
  cors({
    origin: (
      origin,
      callback,
    ) => {
      if (
        !origin ||
        allowedOrigins.includes(
          origin,
        )
      ) {
        callback(
          null,
          true,
        )

        return
      }

      callback(
        new Error(
          `Origin ${origin} is not allowed by CORS`,
        ),
      )
    },

    credentials: true,
  }),
)

/*
 * =====================================================
 * JSON PAYLOADS
 * =====================================================
 */

app.use(
  express.json({
    limit: '2mb',
  }),
)

/*
 * =====================================================
 * FORM URL ENCODED
 * =====================================================
 */

app.use(
  express.urlencoded({
    extended: true,
    limit: '2mb',
  }),
)

/*
 * =====================================================
 * HEALTH
 * =====================================================
 */

app.get(
  '/health',
  (
    req,
    res,
  ) => {
    res.json({
      success: true,

      service:
        'operator-service',

      status:
        'running',

      timestamp:
        new Date()
          .toISOString(),
    })
  },
)

/*
 * =====================================================
 * OPERATOR API
 * =====================================================
 */

app.use(
  '/operators',
  operatorRoutes,
)

/*
 * =====================================================
 * BUS API
 * =====================================================
 */

app.use(
  '/buses',
  busRoutes,
)
app.use('/', catalogRoutes)
app.use('/admin', adminRoutes)
app.use('/staff', staffRoutes)

/*
 * =====================================================
 * 404
 * =====================================================
 */

app.use(
  (
    req,
    res,
  ) => {
    res
      .status(404)
      .json({
        success: false,

        message:
          `Route not found: ${req.method} ${req.originalUrl}`,
      })
  },
)

/*
 * =====================================================
 * GLOBAL ERROR HANDLER
 * =====================================================
 */

app.use(
  (
    error,
    req,
    res,
    next,
  ) => {
    console.error(
      '[operator-service error]',
      error,
    )

    /*
     * Multer file too large
     */
    if (
      error instanceof
        multer.MulterError &&
      error.code ===
        'LIMIT_FILE_SIZE'
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Document size cannot exceed 5 MB.',
        })
    }

    /*
     * Multer other errors
     */
    if (
      error instanceof
      multer.MulterError
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        })
    }

    /*
     * PostgreSQL unique violation
     */
    if (
      error.code ===
      '23505'
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'A record with the same unique value already exists.',
        })
    }

    /*
     * PostgreSQL foreign key violation
     */
    if (
      error.code ===
      '23503'
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Related database record was not found.',
        })
    }

    /*
     * PostgreSQL invalid input
     */
    if (
      error.code ===
      '22P02'
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid data format.',
        })
    }

    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
        errors: error.errors || {},
      })
    }

    return res
      .status(
        error.status ||
          500,
      )
      .json({
        success: false,

        message:
          error.message ||
          'Internal server error.',
      })
  },
)

module.exports =
  app
