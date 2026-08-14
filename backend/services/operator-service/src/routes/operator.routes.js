const express = require('express');

const {
  checkMobile,
  registerOperator,
  applicationStatus,
  listOperators,
  getOperator,
  approveOperator,
  rejectOperator,
} = require('../controllers/operator.controller');

const {
  operatorDocumentUpload,
} = require('../middlewares/upload.middleware');

const router = express.Router();
const { requireAuth, requireRoles } = require('../middlewares/auth.middleware');
const policyController = require('../controllers/operator.controller');

/*
 * Check mobile
 */
router.get(
  '/check-mobile',
  checkMobile,
);

/*
 * Registration
 */
router.post(
  '/register',
  operatorDocumentUpload,
  registerOperator,
);

/*
 * Application status
 */
router.get(
  '/application-status/:mobile',
  applicationStatus,
);

/*
 * List operators
 */
router.get(
  '/',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  listOperators,
);

/* Cancellation & reschedule policy */
router.get('/:id/cancellation-policy', requireAuth, requireRoles('OPERATOR_ADMIN','OPERATOR_STAFF','SUPER_ADMIN'), policyController.getCancellationPolicy);
router.put('/:id/cancellation-policy', requireAuth, requireRoles('OPERATOR_ADMIN','SUPER_ADMIN'), policyController.upsertCancellationPolicy);

/*
 * Single operator
 */
router.get(
  '/:id',
  requireAuth,
  requireRoles('SUPER_ADMIN','OPERATOR_ADMIN','OPERATOR_STAFF'),
  getOperator,
);

/*
 * Approve operator
 */
router.patch(
  '/:id/approve',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  approveOperator,
);

/*
 * Reject operator
 */
router.patch(
  '/:id/reject',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  rejectOperator,
);

module.exports = router;