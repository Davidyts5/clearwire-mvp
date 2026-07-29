export const ROLES = {
  CLERK: 'clerk',
  CONTROLLER: 'controller',
  CFO: 'cfo',
  AUDITOR: 'auditor',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_VALUES = Object.values(ROLES) as [Role, ...Role[]];

export const DashboardRoutes: Record<Role, string> = {
  clerk: '/clerk-dashboard',
  controller: '/controller-dashboard',
  cfo: '/cfo-dashboard',
  auditor: '/auditor-dashboard'
};

export const Permissions = {
  canCreateWire: (role: Role) => role === ROLES.CLERK,
  canApproveWire: (role: Role) => [ROLES.CONTROLLER, ROLES.CFO].includes(role as any),
  canManageTeam: (role: Role) => role === ROLES.CFO,
  canManageSettings: (role: Role) => role === ROLES.CFO,
  canRegisterDevice: (role: Role) => [ROLES.CONTROLLER, ROLES.CFO].includes(role as any),
  isReadOnly: (role: Role) => role === ROLES.AUDITOR,
  getPortalRoute: (role: Role) => DashboardRoutes[role] || '/login'
};
