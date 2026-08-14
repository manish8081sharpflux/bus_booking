const { requireAuth, requireRoles, requirePermission, requireOrganizationMembership, requireOwnership } = require('../../../shared/auth/authorization');

module.exports = {
  requireAuth: requireAuth(),
  requireRoles,
  requirePermission,
  requireOrganizationMembership,
  requireOwnership,
};
