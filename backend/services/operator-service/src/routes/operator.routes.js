const express = require('express');

const {
  checkMobile,
  registerOperator,
  applicationStatus,
  listOperators,
  getOperator,
  approveOperator,
  rejectOperator,
  suspendOperator,
  reactivateOperator,
  operatorStatusHistory,
  operatorKycStatus,
  verifyOperatorDocument,
  previewOperatorDocument,
} = require('../controllers/operator.controller');

const {
  operatorDocumentUpload,
} = require('../middlewares/upload.middleware');

const {
  publicLookupRateLimit,
} = require('../middlewares/public-lookup-rate-limit.middleware');
const router = express.Router();
const { requireAuth, requireRoles } = require('../middlewares/auth.middleware');
const policyController = require('../controllers/operator.controller');

/*
 * Check mobile
 */
router.get(
  '/check-mobile',
  publicLookupRateLimit,
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
  publicLookupRateLimit,
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


/*
 * Suspend operator
 */
router.patch(
  '/:id/suspend',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  suspendOperator,
);

/*
 * Reactivate operator
 */
router.patch(
  '/:id/reactivate',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  reactivateOperator,
);

/*
 * Operator status history
 */
router.get(
  '/:id/status-history',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  operatorStatusHistory,
);

/*
 * Operator KYC status
 */
router.get(
  '/:id/kyc-status',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  operatorKycStatus,
);

/* Preview one KYC document - SUPER_ADMIN only */
router.get(
  '/:id/documents/:documentId/preview',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  previewOperatorDocument,
)
/*
 * Approve/reject one KYC document
 */
router.patch(
  '/:id/documents/:documentId/verification',
  requireAuth,
  requireRoles('SUPER_ADMIN'),
  verifyOperatorDocument,
);
module.exports = router;