import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Search,
  Eye,
  Pencil,
  UserX,
  Trash2,
  KeyRound,
  Mail,
  Phone,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  UserPlus,
  Shield,
  BadgeCheck,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { ALL_ROLES, ROLE_LABELS } from '../../../rbac/constants';
import type { UserRole } from '../../../rbac/types';
import { api } from '../../../services/api';

interface UserData {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  username: string;
  role: UserRole;
  status: string;
  is_first_login: number;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  created_by: string;
}

type SortField = 'full_name' | 'role' | 'email' | 'status' | 'last_login' | 'department';

export const EmployeeManagement: React.FC = () => {
  const { user: currentUser, addActivity } = useRBAC();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'All'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Suspended' | 'Inactive' | 'Locked'>('All');
  const [sortField, setSortField] = useState<SortField>('full_name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<UserData | null>(null);
  const [showViewModal, setShowViewModal] = useState<UserData | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void; variant?: 'danger' | 'warning' | 'info' } | null>(null);
  const [showResetPwd, setShowResetPwd] = useState<UserData | null>(null);
  const [resetResult, setResetResult] = useState<{ password: string } | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    role: 'Admin' as UserRole,
    password: '',
  });
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    role: '' as UserRole,
    status: '',
  });
  const perPage = 10;

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: any = {};
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;
      if (roleFilter !== 'All') params.role = roleFilter;
      const result = await api.user.list(params);
      setUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    let result = [...users];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.full_name.toLowerCase().includes(q) ||
          e.email.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q) ||
          e.phone.includes(q)
      );
    }

    if (roleFilter !== 'All') {
      result = result.filter((e) => e.role === roleFilter);
    }

    if (statusFilter !== 'All') {
      result = result.filter((e) => e.status === statusFilter);
    }

    result.sort((a, b) => {
      const aVal = a[sortField] ?? '';
      const bVal = b[sortField] ?? '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [users, search, roleFilter, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleAdd = async () => {
    if (!formData.full_name || !formData.email) return;
    try {
      const result = await api.user.create({
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        designation: formData.designation,
        role: formData.role,
        status: 'Active',
        password: formData.password || undefined,
      });
      addActivity('User Created', `Created user ${formData.full_name} as ${ROLE_LABELS[formData.role]}`);
      setShowAddModal(false);
      setFormData({ full_name: '', email: '', phone: '', department: '', designation: '', role: 'Admin', password: '' });
      setSuccess(
        result.email?.queued
          ? `User created. Welcome email queued for ${result.credentials.email}. Check Email Logs to verify delivery.`
          : 'User created. No welcome email was sent for this role.'
      );
      setError('');
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const handleEdit = async () => {
    if (!showEditModal) return;
    try {
      await api.user.update(showEditModal.id, {
        full_name: editFormData.full_name,
        email: editFormData.email,
        phone: editFormData.phone,
        department: editFormData.department,
        designation: editFormData.designation,
        role: editFormData.role,
        status: editFormData.status,
      });
      addActivity('User Updated', `Updated user ${editFormData.full_name}`);
      setShowEditModal(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const handleDelete = async (user: UserData) => {
    try {
      await api.user.delete(user.id);
      addActivity('User Deactivated', `Deactivated user ${user.full_name}`);
      setConfirmDialog(null);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  };

  const handleResetPassword = async () => {
    if (!showResetPwd) return;
    try {
      const result = await api.user.resetPassword(showResetPwd.id);
      setResetResult({ password: result.credentials.password });
      addActivity('Password Reset', `Reset password for ${showResetPwd.full_name}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      Suspended: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      Inactive: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      Locked: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${styles[status] || styles.Active}`}>
        {status}
      </span>
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return <span className="ml-1 text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Employee Management</h1>
          <p className="text-xs text-white/50 mt-1">Manage system users, roles, and permissions</p>
        </div>
        {currentUser?.role === 'Super Admin' && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Add Employee
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search employees..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value as UserRole | 'All'); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="All">All Roles</option>
          {ALL_ROLES.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer min-w-[130px]"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Suspended">Suspended</option>
          <option value="Inactive">Inactive</option>
          <option value="Locked">Locked</option>
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
          <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadUsers} className="ml-auto underline cursor-pointer">Retry</button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
          <Mail className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto underline cursor-pointer">Dismiss</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <Th onClick={() => toggleSort('full_name')}>Employee <SortIcon field="full_name" /></Th>
              <Th onClick={() => toggleSort('role')}>Role <SortIcon field="role" /></Th>
              <Th onClick={() => toggleSort('email')}>Email <SortIcon field="email" /></Th>
              <Th onClick={() => toggleSort('department')}>Department <SortIcon field="department" /></Th>
              <Th onClick={() => toggleSort('status')}>Status <SortIcon field="status" /></Th>
              <Th onClick={() => toggleSort('last_login')}>Last Login <SortIcon field="last_login" /></Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-12 text-center">
                  <div className="flex items-center justify-center gap-2 text-white/40 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading employees...
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-white/40 text-sm">
                  No employees found matching your filters.
                </td>
              </tr>
            ) : (
              paginated.map((emp) => (
                <tr key={emp.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                        {emp.full_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white">{emp.full_name}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-1 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold">
                      {ROLE_LABELS[emp.role]}
                    </span>
                  </td>
                  <td className="p-3 text-white/70">{emp.email}</td>
                  <td className="p-3 text-white/70">{emp.department}</td>
                  <td className="p-3">{statusBadge(emp.status)}</td>
                  <td className="p-3 text-white/50">{emp.last_login || 'Never'}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn icon={<Eye className="w-3.5 h-3.5" />} onClick={() => setShowViewModal(emp)} label="View" />
                      {currentUser?.role === 'Super Admin' && (
                        <>
                          <IconBtn icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { setShowEditModal(emp); setEditFormData({ full_name: emp.full_name, email: emp.email, phone: emp.phone, department: emp.department, designation: emp.designation, role: emp.role, status: emp.status }); }} label="Edit" />
                          <IconBtn
                            icon={<UserX className="w-3.5 h-3.5" />}
                            onClick={() => setConfirmDialog({
                              title: emp.status === 'Suspended' ? 'Reactivate Employee' : 'Suspend Employee',
                              message: `Are you sure you want to ${emp.status === 'Suspended' ? 'reactivate' : 'suspend'} ${emp.full_name}?`,
                              onConfirm: async () => {
                                try {
                                  await api.user.update(emp.id, { status: emp.status === 'Suspended' ? 'Active' : 'Suspended' });
                                  addActivity(emp.status === 'Suspended' ? 'User Reactivated' : 'User Suspended', `${emp.status === 'Suspended' ? 'Reactivated' : 'Suspended'} user ${emp.full_name}`);
                                  setConfirmDialog(null);
                                  loadUsers();
                                } catch (err) {
                                  setError(err instanceof Error ? err.message : 'Failed to update user');
                                }
                              },
                              variant: 'warning',
                            })}
                            label={emp.status === 'Suspended' ? 'Reactivate' : 'Suspend'}
                          />
                          <IconBtn
                            icon={<KeyRound className="w-3.5 h-3.5" />}
                            onClick={() => { setShowResetPwd(emp); setResetResult(null); }}
                            label="Reset Password"
                          />
                          <IconBtn
                            icon={<Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                            onClick={() => setConfirmDialog({
                              title: 'Deactivate Employee',
                              message: `Are you sure you want to deactivate ${emp.full_name}? They will not be able to login.`,
                              onConfirm: () => handleDelete(emp),
                              variant: 'danger',
                            })}
                            label="Deactivate"
                          />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Showing {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} of {filtered.length}</span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${n === page ? 'bg-violet-600 text-white' : 'bg-white/5 border border-white/10 text-white/70 hover:text-white'}`}
              >
                {n}
              </button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                <UserPlus className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Add Employee</h3>
            </div>
            <p className="text-[10px] text-white/40">The system will auto-generate a temporary password.</p>
            <div className="flex flex-col gap-3">
              <Field label="Full Name">
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="John Doe" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Email">
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@casyum.edu" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Phone">
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Department">
                <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Computer Applications" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Designation">
                <input type="text" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} placeholder="Professor" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Role">
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Temporary Password (Optional)">
                <input type="text" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Leave blank to auto-generate" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button onClick={() => { setShowAddModal(false); setFormData({ full_name: '', email: '', phone: '', department: '', designation: '', role: 'Admin', password: '' }); }} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">Cancel</button>
              <button onClick={handleAdd} disabled={!formData.full_name || !formData.email} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">Create User</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                <Pencil className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Edit Employee</h3>
            </div>
            <div className="flex flex-col gap-3">
              <Field label="Full Name">
                <input type="text" value={editFormData.full_name} onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Email">
                <input type="email" value={editFormData.email} onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Phone">
                <input type="text" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Department">
                <input type="text" value={editFormData.department} onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Designation">
                <input type="text" value={editFormData.designation} onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50" />
              </Field>
              <Field label="Role">
                <select value={editFormData.role} onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <select value={editFormData.status} onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Locked">Locked</option>
                </select>
              </Field>
            </div>
            <div className="flex items-center justify-end gap-3 mt-2">
              <button onClick={() => setShowEditModal(null)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">Cancel</button>
              <button onClick={handleEdit} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showViewModal && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
                {showViewModal.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{showViewModal.full_name}</h3>
                <span className="px-2 py-0.5 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 text-[10px] font-semibold">{ROLE_LABELS[showViewModal.role]}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <DetailRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={showViewModal.email} />
              <DetailRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={showViewModal.phone} />
              <DetailRow icon={<Building2 className="w-3.5 h-3.5" />} label="Department" value={showViewModal.department} />
              <DetailRow icon={<Shield className="w-3.5 h-3.5" />} label="Designation" value={showViewModal.designation} />
              <DetailRow icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Status" value={showViewModal.status} />
              <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Created" value={showViewModal.created_at} />
              <DetailRow icon={<Clock className="w-3.5 h-3.5" />} label="Last Login" value={showViewModal.last_login || 'Never'} />
              <DetailRow icon={<Lock className="w-3.5 h-3.5" />} label="First Login" value={showViewModal.is_first_login ? 'Yes' : 'No'} />
            </div>
            <button onClick={() => setShowViewModal(null)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {confirmDialog && (
        <ConfirmationDialog
          open={true}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant || 'danger'}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {showResetPwd && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">Reset Password</h3>
            </div>
            {resetResult ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-emerald-300">Password reset successfully!</span>
                </div>
                <p className="text-xs text-white/60">New temporary password for <span className="text-white font-semibold">{showResetPwd.full_name}</span>:</p>
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10">
                  <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0" />
                  <code className="text-sm font-mono text-violet-300 font-bold">{resetResult.password}</code>
                </div>
                <p className="text-[10px] text-amber-400/80">This password will NOT be shown again. Copy it now.</p>
                <button onClick={() => { setShowResetPwd(null); setResetResult(null); }} className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer">Done</button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="text-xs text-white/60">Generate a new temporary password for <span className="text-white font-semibold">{showResetPwd.full_name}</span>. They will be forced to change it on next login.</p>
                <div className="flex items-center justify-end gap-3">
                  <button onClick={() => setShowResetPwd(null)} className="px-4 py-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold cursor-pointer">Cancel</button>
                  <button onClick={handleResetPassword} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer">Generate & Reset</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Th: React.FC<{ children: React.ReactNode; onClick?: () => void; className?: string }> = ({ children, onClick, className }) => (
  <th onClick={onClick} className={`p-3 text-[10px] font-bold text-white/50 uppercase tracking-wider text-left ${onClick ? 'cursor-pointer hover:text-white/80' : ''} ${className || ''}`}>
    {children}
  </th>
);

const IconBtn: React.FC<{ icon: React.ReactNode; onClick: () => void; label: string }> = ({ icon, onClick, label }) => (
  <button onClick={onClick} title={label} className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
    {icon}
  </button>
);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const DetailRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3 py-1.5">
    <span className="text-white/40">{icon}</span>
    <span className="text-white/50 min-w-[80px]">{label}</span>
    <span className="text-white">{value}</span>
  </div>
);