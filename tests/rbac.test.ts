// JEST TEST SUITE FOR RBAC & TENANT ISOLATION
import { Permissions, ROLES } from '../src/lib/roles';

describe('RBAC Rules', () => {
  it('allows ONLY clerks to create wires', () => {
    expect(Permissions.canCreateWire(ROLES.CLERK)).toBe(true);
    expect(Permissions.canCreateWire(ROLES.CONTROLLER)).toBe(false);
    expect(Permissions.canCreateWire(ROLES.CFO)).toBe(false);
    expect(Permissions.canCreateWire(ROLES.AUDITOR)).toBe(false);
  });

  it('allows controllers and cfos to approve', () => {
    expect(Permissions.canApproveWire(ROLES.CONTROLLER)).toBe(true);
    expect(Permissions.canApproveWire(ROLES.CFO)).toBe(true);
    expect(Permissions.canApproveWire(ROLES.CLERK)).toBe(false);
    expect(Permissions.canApproveWire(ROLES.AUDITOR)).toBe(false);
  });

  it('routes correctly', () => {
    expect(Permissions.getPortalRoute(ROLES.CLERK)).toBe('/clerk-dashboard');
    expect(Permissions.getPortalRoute(ROLES.CFO)).toBe('/cfo-dashboard');
  });
});
