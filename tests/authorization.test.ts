import { describe, it, expect } from 'vitest';

describe('Authorization & Multi-user Isolation', () => {
  const userA = { id: 'user-a-uuid', role: 'user', is_active: true };
  const userB = { id: 'user-b-uuid', role: 'user', is_active: true };
  const adminUser = { id: 'admin-uuid', role: 'admin', is_active: true };

  const globalBook = { id: 'book-1', is_global: true, owner_id: 'admin-uuid' };
  const userABook = { id: 'book-2', is_global: false, owner_id: 'user-a-uuid' };

  it('allows User A and User B to read global books', () => {
    const canUserARead = globalBook.is_global || globalBook.owner_id === userA.id;
    const canUserBRead = globalBook.is_global || globalBook.owner_id === userB.id;

    expect(canUserARead).toBe(true);
    expect(canUserBRead).toBe(true);
  });

  it('prevents User B from accessing User A private book', () => {
    const canUserBRead = userABook.is_global || userABook.owner_id === userB.id;
    expect(canUserBRead).toBe(false);
  });

  it('prevents normal users from deleting global books', () => {
    const canUserADelete = userA.role === 'admin' || (userABook.owner_id === userA.id && !globalBook.is_global);
    const canAdminDelete = adminUser.role === 'admin';

    expect(canUserADelete).toBe(false);
    expect(canAdminDelete).toBe(true);
  });

  it('isolates user annotations strictly by user_id', () => {
    const userANote = { id: 'note-1', user_id: userA.id, book_id: globalBook.id, content: 'User A note' };
    const userBNote = { id: 'note-2', user_id: userB.id, book_id: globalBook.id, content: 'User B note' };

    const notesForUserA = [userANote, userBNote].filter((n) => n.user_id === userA.id);
    expect(notesForUserA.length).toBe(1);
    expect(notesForUserA[0].content).toBe('User A note');
  });
});
