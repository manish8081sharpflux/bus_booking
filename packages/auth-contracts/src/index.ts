export type PlatformRole = 'SUPER_ADMIN' | 'OPERATOR_ADMIN' | 'OPERATOR_STAFF' | 'CUSTOMER';
export interface Principal { userId: string; roles: PlatformRole[]; permissions: string[]; operatorOrganizationIds: string[]; }
export function can(principal: Principal, permission: string, organizationId?: string): boolean { return principal.roles.includes('SUPER_ADMIN') || (principal.permissions.includes(permission) && (!organizationId || principal.operatorOrganizationIds.includes(organizationId))); }
