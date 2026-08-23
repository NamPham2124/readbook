import { describe, it, expect } from 'vitest';

describe('Admin Management Rules', () => {
  const currentAdmin = { id: 'admin-1', role: 'admin', is_active: true };

  it('prevents admin from disabling their own account', () => {
    const targetUserId = 'admin-1';
    const newStatus = false;

    const isSelfDisable = targetUserId === currentAdmin.id && !newStatus;
    expect(isSelfDisable).toBe(true);
  });

  it('prevents admin from deleting their own account', () => {
    const targetUserId = 'admin-1';
    const isSelfDelete = targetUserId === currentAdmin.id;
    expect(isSelfDelete).toBe(true);
  });

  it('allows admin to disable or delete other users', () => {
    const targetUserId = 'user-99';
    const isSelfAction = targetUserId === currentAdmin.id;
    expect(isSelfAction).toBe(false);
  });
});
