const express =
  require('express')

const {
  addBus,
  listBuses,
  getBus,
  listPending,
  review,
  resubmit,
} = require(
  '../controllers/bus.controller',
)

const {
  busDocumentUpload,
} = require(
  '../middlewares/upload.middleware',
)

const router =
  express.Router()

const { requireAuth, requireRoles } = require('../middlewares/auth.middleware')
const { resolveOperator } = require('../middlewares/operator-context.middleware')

router.get('/verification/pending', requireAuth, requireRoles('SUPER_ADMIN'), listPending)
router.patch('/:id/review', requireAuth, requireRoles('SUPER_ADMIN'), review)
router.patch('/:id/resubmit', requireAuth, requireRoles('OPERATOR_ADMIN'), resolveOperator, resubmit)

/*
 * =====================================================
 * CREATE BUS
 *
 * Accepts multipart/form-data:
 * - bus details
 * - seats
 * - amenities
 * - compliance
 * - documents
 * - photos
 * =====================================================
 */

router.post(
  '/',
  requireAuth,
  requireRoles('OPERATOR_ADMIN','OPERATOR_STAFF','MANAGER','SUPER_ADMIN'),
  resolveOperator,
  busDocumentUpload,
  addBus,
)

/*
 * =====================================================
 * LIST OPERATOR BUSES
 *
 * GET /buses?operatorId=UUID
 * =====================================================
 */

router.get(
  '/',
  requireAuth,
  requireRoles('OPERATOR_ADMIN','OPERATOR_STAFF','MANAGER','SUPER_ADMIN'),
  resolveOperator,
  listBuses,
)

/*
 * =====================================================
 * GET SINGLE BUS
 *
 * GET /buses/:id
 * =====================================================
 */

router.get(
  '/:id',
  requireAuth,
  requireRoles('OPERATOR_ADMIN','OPERATOR_STAFF','MANAGER','SUPER_ADMIN'),
  resolveOperator,
  getBus,
)

module.exports =
  router
