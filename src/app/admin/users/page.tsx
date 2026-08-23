'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Shield, Trash2, CheckCircle2, XCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils/cn';
import type { Profile } from '@/lib/types/database';
import { toast } from 'sonner';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
  const [isCreating, setIsCreating] = useState(false);

  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (res.ok) setUsers(data.users || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user: Profile) => {
    try {
      const newStatus = !user.is_active;
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      toast.success(`User ${user.email} is now ${newStatus ? 'active' : 'disabled'}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u)));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleChangeRole = async (user: Profile, newRole: 'user' | 'admin') => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change role');

      toast.success(`User ${user.email} role updated to ${newRole}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u)));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserPassword) {
      toast.error('Email and password are required');
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail.trim(),
          password: newUserPassword,
          display_name: newUserName.trim() || undefined,
          role: newUserRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create user');

      toast.success('User created successfully');
      setIsAddUserOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserRole('user');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      toast.success(`User ${userToDelete.email} deleted`);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name && u.display_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-mocha-text flex items-center gap-2">
            <Users className="w-5 h-5 text-mocha-blue" /> User Management
          </h1>
          <p className="text-xs text-mocha-subtext0 mt-0.5">
            Manage user accounts, roles, authorization, and access status
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setIsAddUserOpen(true)} className="gap-1.5 self-start">
          <UserPlus className="w-4 h-4" /> Add User
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-mocha-overlay0 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-mocha-mantle border border-mocha-surface0 text-mocha-text text-xs rounded-xl focus:outline-none focus:border-mocha-blue"
        />
      </div>

      {/* Users Table */}
      <div className="bg-mocha-mantle border border-mocha-surface0 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-mocha-subtext0">
            <thead className="bg-mocha-surface0/60 text-[11px] font-bold uppercase tracking-wider text-mocha-subtext1 border-b border-mocha-surface0">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mocha-surface0">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="w-36 h-4" /></td>
                    <td className="px-5 py-4"><Skeleton className="w-16 h-4" /></td>
                    <td className="px-5 py-4"><Skeleton className="w-14 h-4" /></td>
                    <td className="px-5 py-4"><Skeleton className="w-20 h-4" /></td>
                    <td className="px-5 py-4 text-right"><Skeleton className="w-12 h-4 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-mocha-overlay1">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-mocha-surface0/30 transition-colors">
                    {/* User info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-mocha-surface1 text-mocha-blue flex items-center justify-center font-bold text-xs shrink-0">
                          {user.display_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-mocha-text truncate">{user.display_name || '—'}</p>
                          <p className="text-[11px] text-mocha-overlay1 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Role Dropdown */}
                    <td className="px-5 py-3.5">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user, e.target.value as any)}
                        className="bg-mocha-surface0 border border-mocha-surface1 text-mocha-text text-xs rounded-lg px-2 py-1 font-semibold focus:outline-none focus:border-mocha-blue cursor-pointer"
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>

                    {/* Status Toggle */}
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => handleToggleStatus(user)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                          user.is_active
                            ? 'bg-mocha-green/15 text-mocha-green border-mocha-green/30 hover:bg-mocha-green/25'
                            : 'bg-mocha-red/15 text-mocha-red border-mocha-red/30 hover:bg-mocha-red/25'
                        }`}
                        title="Click to toggle active / disabled status"
                      >
                        {user.is_active ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Disabled
                          </>
                        )}
                      </button>
                    </td>

                    {/* Joined date */}
                    <td className="px-5 py-3.5 text-mocha-overlay1 whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </td>

                    {/* Delete action */}
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setUserToDelete(user)}
                        className="text-mocha-overlay1 hover:text-mocha-red p-1.5 rounded-lg hover:bg-mocha-surface0 transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserOpen}
        onClose={() => setIsAddUserOpen(false)}
        title="Add New User"
        description="Create a new user account with assigned role"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <Input
            label="Display Name"
            placeholder="John Doe"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="user@example.com"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Minimum 6 characters"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            required
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-mocha-subtext0">
              Role
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as any)}
              className="w-full bg-mocha-surface0 border border-mocha-surface1 text-mocha-text text-sm rounded-lg px-3.5 py-2 focus:outline-none focus:border-mocha-blue"
            >
              <option value="user">User</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-mocha-surface0">
            <Button type="button" variant="secondary" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isCreating}>
              Create User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleDeleteUser}
        title="Delete User Account"
        message={`Are you sure you want to permanently delete user "${userToDelete?.email}"? All their books, notes, and progress will be deleted.`}
        confirmText="Delete User"
        isLoading={isDeleting}
      />
    </div>
  );
}
