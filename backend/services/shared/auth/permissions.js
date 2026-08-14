const db = require('./postgres');

async function getRolePermissions(roleIds) {
  if (!roleIds || roleIds.length === 0) return [];
  const rows = await db.query(
    `SELECT p.code FROM identity_permissions p
     JOIN identity_role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = ANY($1)`,
    [roleIds]
  );
  return rows.map((row) => row.code);
}

module.exports = { getRolePermissions };
