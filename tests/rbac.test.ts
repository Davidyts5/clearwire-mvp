// Run with the shared Node test runner; no Jest globals or extra dependency needed.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Permissions, ROLES } from '../src/lib/roles';

describe('RBAC Rules', () => {
  it('allows ONLY clerks to create wires', () => {
    assert.equal(Permissions.canCreateWire(ROLES.CLERK), true);
    assert.equal(Permissions.canCreateWire(ROLES.CONTROLLER), false);
    assert.equal(Permissions.canCreateWire(ROLES.CFO), false);
    assert.equal(Permissions.canCreateWire(ROLES.AUDITOR), false);
  });

  it('allows controllers and cfos to approve', () => {
    assert.equal(Permissions.canApproveWire(ROLES.CONTROLLER), true);
    assert.equal(Permissions.canApproveWire(ROLES.CFO), true);
    assert.equal(Permissions.canApproveWire(ROLES.CLERK), false);
    assert.equal(Permissions.canApproveWire(ROLES.AUDITOR), false);
  });

  it('routes correctly', () => {
    assert.equal(Permissions.getPortalRoute(ROLES.CLERK), '/clerk-dashboard');
    assert.equal(Permissions.getPortalRoute(ROLES.CFO), '/cfo-dashboard');
  });
});
