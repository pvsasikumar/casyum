import React, { useState, useMemo, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Plus,
  X,
  Edit,
  Trash2,
  Mail,
  Phone,
  User,
  CheckCircle2,
  Copy,
  KeyRound,
  Loader2,
  UserPlus,
  AlertCircle,
  History,
  Users,
  ShieldCheck,
  UserX,
  RefreshCw,
  IdCard,
  Building2,
  Eye,
  Lock,
  CalendarDays,
  EyeOff,
} from 'lucide-react';
import { useRBAC } from '../../../rbac/context/RBACContext';
import { useAdmin } from '../../context/AdminContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import {
  listCasyumFacultyCoordinators,
  createCasyumFacultyCoordinator,
  updateCasyumFacultyCoordinator,
  setCasyumFacultyStatus,
  deleteCasyumFacultyCoordinator,
  resetCasyumFacultyPassword,
  listCasyumFacultyActivity,
  type CasyumFacultyCoordinator,
  type CasyumFacultyActivity,
} from '../../../services/casyumFacultyService';

const DEPARTMENTS = ['BCA', 'BCA GenAI'];

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  employee_id: string;
  status: 'Active' | 'Inactive';
  temp_password: string;
  confirm_temp_password: string;
}

const emptyForm: FormData = {
  full_name: '',
  email: '',
  phone: '',
  department: '',
  employee_id: '',
  status: 'Active',
  temp_password: '',
  confirm_temp_password: '',
};

const inputBase =
  'w-full px-3.5 py-2.5 rounded-xl bg-white/5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors';

const ACTIVITY_ACTION_STYLES: Record<string, string> = {
  'Coordinator Created': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Coordinator Updated': 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  'Coordinator Enabled': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'Coordinator Disabled': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'Coordinator Deleted': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  'Password Reset': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
};

function validatePassword(pwd: string): string {
  if (!pwd) return 'Temporary password is required';
  if (pwd.length < 8) return 'Minimum 8 characters required';
  if (!/[A-Z]/.test(pwd)) return 'Must contain an uppercase letter';
  if (!/[a-z]/.test(pwd)) return 'Must contain a lowercase letter';
  if (!/[0-9]/.test(pwd)) return 'Must contain a number';
  return '';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export const CasyumFacultyCoordinatorManagement: React.FC = () => {
  const rbac = useRBAC();
  const { addToast } = useAdmin();
  const [tab, setTab] = useState<'members' | 'activity'>('members');
  const [members, setMembers] = useState<CasyumFacultyCoordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [passwordFilter, setPasswordFilter] = useState<string>('All');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CasyumFacultyCoordinator | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showTempPwd, setShowTempPwd] = useState(false);
  const [showConfirmTempPwd, setShowConfirmTempPwd] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; username: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CasyumFacultyCoordinator | null>(null);
  const [statusTarget, setStatusTarget] = useState<CasyumFacultyCoordinator | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [resetTarget, setResetTarget] = useState<CasyumFacultyCoordinator | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetShow, setResetShow] = useState(false);
  const [resetShowConfirm, setResetShowConfirm] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetErrors, setResetErrors] = useState<Record<string, string>>({});
  const [viewTarget, setViewTarget] = useState<CasyumFacultyCoordinator | null>(null);

  const [activities, setActivities] = useState<CasyumFacultyActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);

  const performer = useCallback(
    () => ({ id: rbac.user?.id || '', name: rbac.user?.name || rbac.user?.email || 'Admin' }),
    [rbac.user]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listCasyumFacultyCoordinators();
      console.log('[CASYUM DEBUG] faculty coordinators query succeeded:', res.members.length, 'documents');
      setMembers(res.members);
    } catch (error: any) {
      console.error('[CASYUM DEBUG] CASYUM Faculty Coordinators fetch failed:', {
        code: error?.code || error?.name || 'unknown',
        message: error?.message || String(error),
        collection: 'users',
        query: 'casyumFacultyCoordinators',
        function: 'listCasyumFacultyCoordinators',
      });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshActivities = useCallback(async () => {
    setActivitiesLoading(true);
    try {
      setActivities(await listCasyumFacultyActivity());
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (tab === 'activity') refreshActivities();
  }, [tab, refreshActivities]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const term = search.toLowerCase();
      const matchesSearch =
        !term ||
        m.full_name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term) ||
        String(m.phone || '').includes(term) ||
        String(m.employee_id || '').toLowerCase().includes(term) ||
        String(m.user_id || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
      const matchesPassword =
        passwordFilter === 'All' ||
        (passwordFilter === 'temporary' && (m.mustChangePassword || m.passwordStatus === 'temporary')) ||
        (passwordFilter === 'updated' && !m.mustChangePassword && m.passwordStatus === 'updated');
      return matchesSearch && matchesStatus && matchesPassword;
    });
  }, [members, search, statusFilter, passwordFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setSubmitError('');
    setCreatedCredentials(null);
    setShowTempPwd(false);
    setShowConfirmTempPwd(false);
    setShowForm(true);
  };

  const openEdit = (m: CasyumFacultyCoordinator) => {
    setEditing(m);
    setForm({
      full_name: m.full_name,
      email: m.email,
      phone: m.phone,
      department: DEPARTMENTS.includes(m.department) ? m.department : m.department || DEPARTMENTS[0],
      employee_id: m.employee_id || '',
      status: m.status,
      temp_password: '',
      confirm_temp_password: '',
    });
    setErrors({});
    setSubmitError('');
    setCreatedCredentials(null);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditing(null);
    setCreatedCredentials(null);
    setErrors({});
    setSubmitError('');
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^[\d\s+()-]{7,20}$/.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!form.department) errs.department = 'Department is required';
    if (!editing) {
      const pwdError = validatePassword(form.temp_password);
      if (pwdError) errs.temp_password = pwdError;
      else if (form.confirm_temp_password !== form.temp_password) {
        errs.confirm_temp_password = 'Passwords do not match';
      }
      if (!form.confirm_temp_password) errs.confirm_temp_password = 'Confirm the temporary password';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      if (editing) {
        await updateCasyumFacultyCoordinator(editing.id, {
          full_name: form.full_name,
          phone: form.phone,
          department: form.department,
          employee_id: form.employee_id,
          status: form.status,
          updated_by: performer().id,
          updated_by_name: performer().name,
        });
        closeModal();
        await refresh();
        addToast('Coordinator Updated', `${form.full_name}'s details updated successfully.`, 'success');
      } else {
        const res = await createCasyumFacultyCoordinator({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          department: form.department,
          employee_id: form.employee_id,
          password: form.temp_password,
          status: form.status,
          created_by: performer().id,
          created_by_name: performer().name,
        });
        setCreatedCredentials(res.credentials);
        setForm(emptyForm);
        await refresh();
        addToast('Coordinator Added', `${form.full_name} added as a CASYUM Faculty Coordinator.`, 'success');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to save coordinator';
      const errs: Record<string, string> = {};
      if (/email/i.test(msg)) errs.email = msg;
      else if (/phone/i.test(msg)) errs.phone = msg;
      else if (/password/i.test(msg)) errs.temp_password = msg;
      setErrors((prev) => ({ ...prev, ...errs }));
      if (Object.keys(errs).length === 0) setSubmitError(msg);
      addToast('Error', msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteCasyumFacultyCoordinator(deleteConfirm.id, performer());
      await refresh();
      addToast('Coordinator Deleted', `${deleteConfirm.full_name} was deleted from CASYUM Faculty Coordinators.`, 'success');
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to delete coordinator.', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    setStatusLoading(true);
    try {
      const nextStatus = statusTarget.status === 'Active' ? 'Inactive' : 'Active';
      await setCasyumFacultyStatus(statusTarget.id, nextStatus, performer());
      await refresh();
      addToast(
        nextStatus === 'Active' ? 'Account Activated' : 'Account Deactivated',
        `${statusTarget.full_name}'s account is now ${nextStatus.toLowerCase()}.`,
        nextStatus === 'Active' ? 'success' : 'warning'
      );
    } catch (err: any) {
      addToast('Error', err?.message || 'Failed to update account status.', 'error');
    } finally {
      setStatusLoading(false);
      setStatusTarget(null);
    }
  };

  const openResetDialog = (m: CasyumFacultyCoordinator) => {
    setResetTarget(m);
    setResetPassword('');
    setResetConfirm('');
    setResetErrors({});
    setResetShow(false);
    setResetShowConfirm(false);
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    const errs: Record<string, string> = {};
    const pwdError = validatePassword(resetPassword);
    if (pwdError) errs.newPassword = pwdError;
    if (!resetConfirm) errs.confirmPassword = 'Confirm the temporary password';
    else if (resetConfirm !== resetPassword) errs.confirmPassword = 'Passwords do not match';
    setResetErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setResetLoading(true);
    try {
      await resetCasyumFacultyPassword(resetTarget.id, performer(), resetPassword);
      await refresh();
      setResetTarget(null);
      addToast('Password Reset', `Password reset email sent to ${resetTarget.email}. The coordinator must set a new password on next login.`, 'success');
    } catch (err: any) {
      setResetErrors({ newPassword: err?.message || 'Failed to reset password.' });
      addToast('Error', err?.message || 'Failed to reset password.', 'error');
    } finally {
      setResetLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const activeCount = members.filter((m) => m.status === 'Active').length;
  const inactiveCount = members.filter((m) => m.status === 'Inactive').length;
  const tempPwdCount = members.filter((m) => m.mustChangePassword || m.passwordStatus === 'temporary').length;

  const statusBadge = (m: CasyumFacultyCoordinator) => (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${m.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
      {m.status}
    </span>
  );

  const passwordBadge = (m: CasyumFacultyCoordinator) =>
    m.mustChangePassword || m.passwordStatus === 'temporary' ? (
      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/30">
        Temporary Password
      </span>
    ) : (
      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
        Password Updated
      </span>
    );

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Payment Verification Access</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">CASYUM Faculty Coordinators ({members.length})</h2>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          <span>Add CASYUM Faculty Coordinator</span>
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-zinc-950/60 border border-white/10 w-fit">
        <button
          onClick={() => setTab('members')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${tab === 'members' ? 'bg-violet-600/30 text-white border border-violet-500/40' : 'text-white/50 hover:text-white border border-transparent'}`}
        >
          <Users className="w-3.5 h-3.5" />
          Coordinators
        </button>
        <button
          onClick={() => setTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${tab === 'activity' ? 'bg-violet-600/30 text-white border border-violet-500/40' : 'text-white/50 hover:text-white border border-transparent'}`}
        >
          <History className="w-3.5 h-3.5" />
          Activity Logs
        </button>
      </div>

      {tab === 'members' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2">
              <span className="text-xs font-semibold text-emerald-300/70">Active Coordinators</span>
              <span className="text-2xl font-extrabold text-white font-display">{activeCount}</span>
              <span className="text-[10px] text-emerald-400">Currently verifying payments</span>
            </div>
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
              <span className="text-xs font-semibold text-amber-300/70">Inactive Coordinators</span>
              <span className="text-2xl font-extrabold text-white font-display">{inactiveCount}</span>
              <span className="text-[10px] text-amber-400">Temporarily disabled</span>
            </div>
            <div className="p-5 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex flex-col gap-2">
              <span className="text-xs font-semibold text-violet-300/70">Total Coordinators</span>
              <span className="text-2xl font-extrabold text-white font-display">{members.length}</span>
              <span className="text-[10px] text-violet-400">Faculty portal access</span>
            </div>
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
              <span className="text-xs font-semibold text-amber-300/70">Pending Password Change</span>
              <span className="text-2xl font-extrabold text-white font-display">{tempPwdCount}</span>
              <span className="text-[10px] text-amber-400">Still using a temporary password</span>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="relative w-full lg:w-72">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone or employee ID..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>
            <div className="flex items-center gap-3 w-full lg:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="All">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select
                value={passwordFilter}
                onChange={(e) => setPasswordFilter(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="All">All Password Status</option>
                <option value="temporary">Temporary Password</option>
                <option value="updated">Password Updated</option>
              </select>
            </div>
          </div>

          {/* Members Table */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 p-12 text-white/40 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading coordinators...
            </div>
          ) : (
            <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 border-b border-white/10 text-[9px] uppercase tracking-widest text-white/40">
                    <tr>
                      <th className="px-5 py-3 font-bold">Name</th>
                      <th className="px-5 py-3 font-bold">Email</th>
                      <th className="px-5 py-3 font-bold">Phone Number</th>
                      <th className="px-5 py-3 font-bold">Department</th>
                      <th className="px-5 py-3 font-bold">Employee ID</th>
                      <th className="px-5 py-3 font-bold">Role</th>
                      <th className="px-5 py-3 font-bold">Account Status</th>
                      <th className="px-5 py-3 font-bold">Password Status</th>
                      <th className="px-5 py-3 font-bold">Created Date</th>
                      <th className="px-5 py-3 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-5 py-12 text-center text-xs text-white/40">
                          No CASYUM Faculty Coordinators found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((m) => (
                        <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-xs font-bold text-violet-300 shrink-0">
                                {m.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                              <span className="text-xs font-bold text-white">{m.full_name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-white/60">{m.email}</td>
                          <td className="px-5 py-3 text-xs text-white/60">{m.phone || '—'}</td>
                          <td className="px-5 py-3 text-xs text-white/60">{m.department || '—'}</td>
                          <td className="px-5 py-3 text-xs text-white/60">{m.employee_id || '—'}</td>
                          <td className="px-5 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-violet-500/20 text-violet-300 border-violet-500/30">
                              CASYUM Faculty Coordinator
                            </span>
                          </td>
                          <td className="px-5 py-3">{statusBadge(m)}</td>
                          <td className="px-5 py-3">{passwordBadge(m)}</td>
                          <td className="px-5 py-3 text-[10px] text-white/40">{formatDate(m.created_at)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setViewTarget(m)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer" title="View Coordinator"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => openEdit(m)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer" title="Edit Details"><Edit className="w-3.5 h-3.5" /></button>
                              <button
                                onClick={() => setStatusTarget(m)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer"
                                title={m.status === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                              >
                                {m.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => openResetDialog(m)} className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/40 hover:text-amber-400 cursor-pointer" title="Reset Temporary Password"><KeyRound className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setDeleteConfirm(m)} className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 cursor-pointer" title="Delete Coordinator"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Activity Logs */
        <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">CASYUM Faculty Coordinator Activity</span>
              <span className="text-[10px] text-white/40">Account actions performed by admins</span>
            </div>
            <button onClick={refreshActivities} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white cursor-pointer" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${activitiesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex flex-col divide-y divide-white/5 max-h-[560px] overflow-y-auto">
            {activitiesLoading ? (
              <div className="flex items-center justify-center gap-2 p-10 text-white/40 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading activity...
              </div>
            ) : activities.length === 0 ? (
              <div className="p-10 text-center text-xs text-white/40">No activity recorded yet.</div>
            ) : (
              activities.map((a) => (
                <div key={a.id} className="px-5 py-3.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${ACTIVITY_ACTION_STYLES[a.action] || 'bg-white/10 text-white/70 border-white/15'}`}>
                      {a.action}
                    </span>
                    <span className="text-[9px] text-white/35">{new Date(a.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-white/70">{a.details}</p>
                  <p className="text-[10px] text-white/40">
                    Coordinator: <span className="text-white/60">{a.member_name}</span> · By: <span className="text-white/60">{a.performed_by_name}</span>
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="cfm-member-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 select-none"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={closeModal} />

            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-full max-w-xl bg-zinc-950/95 border border-white/15 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-[1px] shrink-0">
                    <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center">
                      {editing ? <Edit className="w-5 h-5 text-violet-400" /> : <UserPlus className="w-5 h-5 text-violet-400" />}
                    </div>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h3 className="text-base font-bold font-display text-white tracking-tight truncate">{editing ? 'Edit Coordinator' : 'Add CASYUM Faculty Coordinator'}</h3>
                    <span className="text-[10px] text-white/40 tracking-widest uppercase">
                      {editing ? 'Update coordinator details' : 'Create a payment verification account'}
                    </span>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {createdCredentials ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="text-lg font-bold font-display text-white">Coordinator added successfully!</h4>
                      <p className="text-xs text-white/50">The temporary password set above is ready for this coordinator's first login.</p>
                    </div>
                    <div className="w-full max-w-sm rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-2 text-left">
                      <CredentialRow label="Email" value={createdCredentials.email} onCopy={copyToClipboard} />
                      <CredentialRow label="Username" value={createdCredentials.username} onCopy={copyToClipboard} />
                      <CredentialRow label="Temporary Password" value={createdCredentials.password} onCopy={copyToClipboard} />
                    </div>
                    <p className="flex items-center gap-1.5 text-[10px] text-amber-400/80">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      These credentials will not be shown again. Copy them before closing.
                    </p>
                    <button onClick={closeModal} className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer">
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <form id="cfm-member-form" onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs">
                    <FormSection icon={<User className="w-3.5 h-3.5" />} title="Personal Information" subtitle="Basic identity details of the coordinator">
                      <Field label="Full Name" required error={errors.full_name}>
                        <input
                          value={form.full_name}
                          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                          className={`${inputBase} border ${errors.full_name ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                          placeholder="e.g. Prof. Jane Smith"
                        />
                      </Field>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Email Address" required error={errors.email} hint={editing ? 'Email is used for login and cannot be changed.' : undefined}>
                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="email"
                              value={form.email}
                              disabled={!!editing}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                              className={`${inputBase} pl-9 border ${errors.email ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50 ${editing ? 'opacity-50 cursor-not-allowed' : ''}`}
                              placeholder="faculty@casyum.edu"
                            />
                          </div>
                        </Field>
                        <Field label="Phone Number" required error={errors.phone}>
                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              value={form.phone}
                              onChange={(e) => setForm({ ...form, phone: e.target.value })}
                              className={`${inputBase} pl-9 border ${errors.phone ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                              placeholder="+91 98765 43210"
                            />
                          </div>
                        </Field>
                      </div>
                    </FormSection>

                    <FormSection icon={<Building2 className="w-3.5 h-3.5" />} title="Department & Identity" subtitle="Where does this coordinator belong?">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Department" required error={errors.department}>
                          <select
                            value={form.department}
                            onChange={(e) => setForm({ ...form, department: e.target.value })}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border text-xs text-white focus:outline-none appearance-none cursor-pointer pr-9 transition-colors ${errors.department ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                          >
                            <option value="" disabled>Select department</option>
                            {DEPARTMENTS.map((d) => (
                              <option key={d} value={d}>{d}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Employee ID" hint="Optional staff identifier">
                          <div className="relative">
                            <IdCard className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              value={form.employee_id}
                              onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                              className={`${inputBase} pl-9 border border-white/10 focus:border-violet-500/50`}
                              placeholder="e.g. FAC-0001"
                            />
                          </div>
                        </Field>
                      </div>
                    </FormSection>

                    <FormSection icon={<ShieldCheck className="w-3.5 h-3.5" />} title="Account Settings" subtitle="Control access to the CASYUM Faculty portal">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Role">
                          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70">
                            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                            <span className="font-bold">CASYUM Faculty Coordinator</span>
                          </div>
                        </Field>
                        <Field label="Account Status">
                          <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer pr-9 transition-colors"
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                          </select>
                        </Field>
                      </div>
                      {!editing && (
                        <div className="flex flex-col gap-3 rounded-xl bg-amber-500/5 border border-amber-500/15 p-3">
                          <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-widest">Temporary Password (for first login)</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="Temporary Password" required error={errors.temp_password}>
                              <div className="relative">
                                <Lock className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type={showTempPwd ? 'text' : 'password'}
                                  value={form.temp_password}
                                  onChange={(e) => setForm({ ...form, temp_password: e.target.value })}
                                  className={`${inputBase} pl-9 pr-9 border ${errors.temp_password ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                                  placeholder="Min 8 chars with Aa1"
                                  autoComplete="new-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowTempPwd((v) => !v)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer"
                                  tabIndex={-1}
                                >
                                  {showTempPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </Field>
                            <Field label="Confirm Temporary Password" required error={errors.confirm_temp_password}>
                              <div className="relative">
                                <Lock className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type={showConfirmTempPwd ? 'text' : 'password'}
                                  value={form.confirm_temp_password}
                                  onChange={(e) => setForm({ ...form, confirm_temp_password: e.target.value })}
                                  className={`${inputBase} pl-9 pr-9 border ${errors.confirm_temp_password ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                                  placeholder="Re-enter temporary password"
                                  autoComplete="new-password"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmTempPwd((v) => !v)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer"
                                  tabIndex={-1}
                                >
                                  {showConfirmTempPwd ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </Field>
                          </div>
                        </div>
                      )}
                    </FormSection>

                    {submitError && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
                      >
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{submitError}</span>
                      </motion.div>
                    )}
                  </form>
                )}
              </div>

              {/* Footer */}
              {!createdCredentials && (
                <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-colors cursor-pointer">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="cfm-member-form"
                    disabled={submitting}
                    className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : editing ? (
                      'Update Coordinator'
                    ) : (
                      'Add Coordinator'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Coordinator Modal */}
      <AnimatePresence>
        {viewTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setViewTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-full max-w-lg bg-zinc-950/95 border border-white/15 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.15)] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-[1px]">
                    <div className="w-full h-full bg-zinc-950 rounded-[15px] flex items-center justify-center text-sm font-bold text-violet-300">
                      {viewTarget.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold font-display text-white">{viewTarget.full_name}</span>
                    <span className="text-[10px] text-white/40">Coordinator ID · {viewTarget.user_id || viewTarget.id}</span>
                  </div>
                </div>
                <button onClick={() => setViewTarget(null)} className="p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-3 text-xs">
                <InfoRow icon={Mail} label="Email" value={viewTarget.email} />
                <InfoRow icon={Phone} label="Phone Number" value={viewTarget.phone || '—'} />
                <InfoRow icon={Building2} label="Department" value={viewTarget.department || '—'} />
                <InfoRow icon={IdCard} label="Employee ID" value={viewTarget.employee_id || '—'} />
                <InfoRow icon={ShieldCheck} label="Role" value="CASYUM Faculty Coordinator" />
                <InfoRow icon={User} label="Account Status" value={viewTarget.status} valueClass={viewTarget.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'} />
                <InfoRow icon={KeyRound} label="Password Status" value={viewTarget.mustChangePassword || viewTarget.passwordStatus === 'temporary' ? 'Temporary Password' : 'Password Updated'} valueClass={viewTarget.mustChangePassword || viewTarget.passwordStatus === 'temporary' ? 'text-amber-400' : 'text-emerald-400'} />
                <InfoRow icon={CalendarDays} label="Created" value={formatDate(viewTarget.created_at)} />
                <InfoRow icon={User} label="Last Login" value={viewTarget.last_login ? formatDate(viewTarget.last_login) : 'Never logged in'} />
              </div>
              <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3">
                <button
                  onClick={() => { setViewTarget(null); openEdit(viewTarget); }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Edit Coordinator
                </button>
                <button onClick={() => { setViewTarget(null); openResetDialog(viewTarget); }} className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-colors cursor-pointer">
                  Reset Temporary Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Password Dialog */}
      <AnimatePresence>
        {resetTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => { if (!resetLoading) setResetTarget(null); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="relative w-full max-w-md bg-zinc-950/95 border border-white/15 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.15)] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-base font-bold font-display text-white">Reset Temporary Password</h3>
                    <span className="text-[10px] text-white/40">{resetTarget.full_name} · {resetTarget.email}</span>
                  </div>
                </div>
                <button onClick={() => { if (!resetLoading) setResetTarget(null); }} className="p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 flex flex-col gap-4 text-xs">
                <p className="text-white/60 leading-relaxed">
                  Enter a new temporary password for this coordinator. A secure password reset email will also be sent to{' '}
                  <span className="text-white font-semibold">{resetTarget.email}</span> so they can set a new password on their next login.
                  The coordinator will be required to change this password before accessing the CASYUM Faculty portal.
                </p>
                <Field label="New Temporary Password" required error={resetErrors.newPassword}>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={resetShow ? 'text' : 'password'}
                      value={resetPassword}
                      onChange={(e) => { setResetPassword(e.target.value); setResetErrors((p) => ({ ...p, newPassword: '' })); }}
                      className={`${inputBase} pl-9 pr-9 border ${resetErrors.newPassword ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                      placeholder="Min 8 chars with Aa1"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setResetShow((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer" tabIndex={-1}>
                      {resetShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </Field>
                <Field label="Confirm Temporary Password" required error={resetErrors.confirmPassword}>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={resetShowConfirm ? 'text' : 'password'}
                      value={resetConfirm}
                      onChange={(e) => { setResetConfirm(e.target.value); setResetErrors((p) => ({ ...p, confirmPassword: '' })); }}
                      className={`${inputBase} pl-9 pr-9 border ${resetErrors.confirmPassword ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                      placeholder="Re-enter temporary password"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setResetShowConfirm((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 cursor-pointer" tabIndex={-1}>
                      {resetShowConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </Field>
              </div>
              <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { if (!resetLoading) setResetTarget(null); }}
                  className="px-4 py-2.5 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Reset...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Send Reset Email</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete CASYUM Faculty Coordinator?"
        message={
          deleteConfirm
            ? `This will permanently delete ${deleteConfirm.full_name}'s account and revoke access to the CASYUM Faculty portal. This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Coordinator"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* Status Confirmation */}
      <ConfirmationDialog
        open={!!statusTarget}
        onCancel={() => setStatusTarget(null)}
        onConfirm={handleToggleStatus}
        loading={statusLoading}
        title={statusTarget?.status === 'Active' ? 'Deactivate Coordinator?' : 'Activate Coordinator?'}
        message={
          statusTarget
            ? statusTarget.status === 'Active'
              ? `${statusTarget.full_name} will no longer be able to access the CASYUM Faculty portal. You can re-activate the account at any time.`
              : `${statusTarget.full_name} will regain access to the CASYUM Faculty portal.`
            : ''
        }
        confirmLabel={statusTarget?.status === 'Active' ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        variant={statusTarget?.status === 'Active' ? 'danger' : 'success'}
      />
    </div>
  );
};

const CredentialRow: React.FC<{ label: string; value: string; onCopy: (text: string) => void }> = ({ label, value, onCopy }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[11px] font-bold text-white truncate">{value}</span>
      <button onClick={() => onCopy(value)} className="p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white cursor-pointer shrink-0" title="Copy">
        <Copy className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const Field: React.FC<{ label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }> = ({ label, required, error, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
      {label}
      {required && <span className="text-rose-400 ml-0.5">*</span>}
    </span>
    {children}
    {error && <span className="text-[10px] text-rose-400">{error}</span>}
    {!error && hint && <span className="text-[9px] text-white/30">{hint}</span>}
  </div>
);

const FormSection: React.FC<{ icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }> = ({ icon, title, subtitle, children }) => (
  <div className="flex flex-col gap-3 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
    <div className="flex items-center gap-2">
      <span className="p-1.5 rounded-lg bg-violet-500/15 text-violet-300">{icon}</span>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-white">{title}</span>
        <span className="text-[9px] text-white/40">{subtitle}</span>
      </div>
    </div>
    {children}
  </div>
);

const InfoRow: React.FC<{ icon: React.FC<{ className?: string }>; label: string; value: string; valueClass?: string }> = ({ icon: Icon, label, value, valueClass }) => (
  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
    <Icon className="w-3.5 h-3.5 text-violet-300/70 shrink-0" />
    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest w-32 shrink-0">{label}</span>
    <span className={`text-xs font-semibold text-white/80 ${valueClass || ''}`}>{value}</span>
  </div>
);
