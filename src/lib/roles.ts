// CENTRALIZED ROLE DEFINITIONS (v5.0)
// Single Source of Truth for RBAC throughout the entire application

export const ROLES = {
  CLERK: 'clerk',
  CONTROLLER: 'controller',
  CFO: 'cfo',
  AUDITOR: 'auditor',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Used for Zod validations and generic access checks
export const ROLE_VALUES = Object.values(ROLES) as [Role, ...Role[]];

// Centralized Permissions Matrix
export const Permissions = {
  canCreateWire: (role: Role) => role === ROLES.CLERK,
  
  canApproveWire: (role: Role) => [ROLES.CONTROLLER, ROLES.CFO].includes(role),
  
  canManageTeam: (role: Role) => role === ROLES.CFO,
  
  canManageSettings: (role: Role) => role === ROLES.CFO,
  
  canRegisterDevice: (role: Role) => [ROLES.CONTROLLER, ROLES.CFO].includes(role),
  
  isReadOnly: (role: Role) => role === ROLES.AUDITOR,

  // UI Helpers
  getPortalRoute: (role: Role) => {
    if (role === ROLES.CLERK) return '/dashboard';
    return '/cfo-portal'; // Controllers, CFOs, and Auditors share the executive view
  }
};
