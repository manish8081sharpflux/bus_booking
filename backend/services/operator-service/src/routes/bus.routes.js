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

router.get('/verification/pending', requireAuth, requireRoles('SUPER_ADMIN'), listPending)
router.patch('/:id/review', requireAuth, requireRoles('SUPER_ADMIN'), review)
router.patch('/:id/resubmit', requireAuth, requireRoles('OPERATOR_ADMIN','SUPER_ADMIN'), resubmit)

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
  requireRoles('OPERATOR_ADMIN','OPERATOR_STAFF','SUPER_ADMIN'),
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
  requireRoles('OPERATOR_ADMIN','OPERATOR_STAFF','SUPER_ADMIN'),
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
  requireRoles('OPERATOR_ADMIN','OPERATOR_STAFF','SUPER_ADMIN'),
  getBus,
)

module.exports =
  router
