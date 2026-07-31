import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Shield,
  CheckCircle2,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  RefreshCw,
  CalendarDays,
  Loader2,
  UserPlus,
  Sparkles,
  AlertCircle,
  AtSign,
  Lock,
  GraduationCap,
  ClipboardCheck,
  ChevronDown,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { Coordinator, CoordinatorAssignedEvent } from '../../types';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { api } from '../../../services/api';

const COORDINATOR_TYPES = ['Event Coordinator (Student)', 'Event Coordinator (Faculty)'];

const DEPARTMENTS = ['BCA', 'BCA GenAI'];

const PASSWORD_STRENGTH = [
  { label: '', color: '' },
  { label: 'Weak', color: 'bg-rose-500' },
  { label: 'Weak', color: 'bg-rose-500' },
  { label: 'Fair', color: 'bg-amber-500' },
  { label: 'Strong', color: 'bg-emerald-500' },
  { label: 'Very strong', color: 'bg-emerald-500' },
];

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatEventDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

interface FormData {
  full_name: string;
  email: string;
  phone: string;
  department: string;
  coordinator_type: string;
  username: string;
  password: string;
  status: 'Active' | 'Inactive';
  notes: string;
  event_ids: number[];
}

const emptyForm: FormData = {
  full_name: '',
  email: '',
  phone: '',
  department: '',
  coordinator_type: 'Event Coordinator (Student)',
  username: '',
  password: '',
  status: 'Active',
  notes: '',
  event_ids: [],
};

const inputBase =
  'w-full px-3.5 py-2.5 rounded-xl bg-white/5 text-xs text-white placeholder-white/30 focus:outline-none transition-colors';

export const CoordinatorManagement: React.FC = () => {
  const { coordinators, addCoordinator, updateCoordinator, deleteCoordinator, addToast } = useAdmin();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coordinator | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<Coordinator | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; username: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetPwdTarget, setResetPwdTarget] = useState<Coordinator | null>(null);
  const [resetPwdValue, setResetPwdValue] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const eventDropdownRef = useRef<HTMLDivElement>(null);

  const [allEvents, setAllEvents] = useState<CoordinatorAssignedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventSearch, setEventSearch] = useState('');
  const [eventDropdownOpen, setEventDropdownOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.event
      .list()
      .then((res) => {
        if (mounted) setAllEvents((res.events || []).map((ev: any) => ({ ...ev, id: Number(ev.id), event_id: String(ev.id) })));
      })
      .catch(() => {
        if (mounted) setAllEvents([]);
      })
      .finally(() => {
        if (mounted) setEventsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!eventDropdownOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (eventDropdownRef.current && !eventDropdownRef.current.contains(e.target as Node)) {
        setEventDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, [eventDropdownOpen]);

  const availableEvents = useMemo(() => {
    const term = eventSearch.toLowerCase();
    return allEvents.filter(
      (e) =>
        e.name.toLowerCase().includes(term) ||
        e.category.toLowerCase().includes(term) ||
        (e.venue || '').toLowerCase().includes(term)
    );
  }, [allEvents, eventSearch]);

  const selectedEvents = useMemo(() => {
    return allEvents.filter((e) => form.event_ids.includes(e.id));
  }, [allEvents, form.event_ids]);

  const toggleEvent = (id: number) => {
    setForm((prev) => ({
      ...prev,
      event_ids: prev.event_ids.includes(id)
        ? prev.event_ids.filter((eid) => eid !== id)
        : [...prev.event_ids, id],
    }));
  };

  const filtered = useMemo(() => {
    return coordinators.filter((c) => {
      const matchesSearch = c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search);
      const matchesStatus = statusFilter === 'All' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [coordinators, search, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setUsernameTouched(false);
    setErrors({});
    setSubmitError('');
    setCreatedCredentials(null);
    setEventSearch('');
    setEventDropdownOpen(false);
    setShowForm(true);
  };

  const openEdit = (c: Coordinator) => {
    setEditing(c);
    setUsernameTouched(true);
    setForm({
      full_name: c.full_name,
      email: c.email,
      phone: c.phone,
      department: DEPARTMENTS.includes(c.department) ? c.department : DEPARTMENTS[0],
      coordinator_type: c.coordinator_type || COORDINATOR_TYPES[0],
      username: c.username,
      password: '',
      status: c.status,
      notes: c.notes,
      event_ids: (c.assigned_events || []).map((e) => e.id),
    });
    setErrors({});
    setSubmitError('');
    setCreatedCredentials(null);
    setEventSearch('');
    setEventDropdownOpen(false);
    setShowForm(true);
  };

  const closeModal = () => {
    setShowForm(false);
    setEditing(null);
    setCreatedCredentials(null);
    setErrors({});
    setSubmitError('');
    setEventDropdownOpen(false);
  };

  const departmentValue = form.department;

  const canSubmit = editing
    ? !!(form.full_name.trim() && form.email.trim() && form.phone.trim() && departmentValue && form.coordinator_type && form.event_ids.length > 0)
    : !!(form.full_name.trim() && form.email.trim() && form.phone.trim() && departmentValue && form.coordinator_type && form.password.trim() && form.event_ids.length > 0);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email format';
    if (!form.phone.trim()) errs.phone = 'Phone number is required';
    else if (!/^[\d\s+()-]{7,20}$/.test(form.phone.trim())) errs.phone = 'Enter a valid phone number';
    if (!departmentValue) errs.department = 'Department is required';
    if (!form.coordinator_type) errs.coordinator_type = 'Coordinator type is required';
    else if (!COORDINATOR_TYPES.includes(form.coordinator_type)) errs.coordinator_type = 'Invalid coordinator type';
    if (form.event_ids.length === 0) errs.event_ids = 'Assign at least one event';
    if (!editing && !form.password.trim()) errs.password = 'Temporary password is required';
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
        const updateData: any = {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          department: departmentValue,
          coordinator_type: form.coordinator_type,
          username: form.username,
          status: form.status,
          notes: form.notes,
          event_ids: form.event_ids,
        };
        if (form.password) updateData.password = form.password;
        await updateCoordinator(editing.id, updateData);
        setShowForm(false);
        setEditing(null);
        addToast('Coordinator updated', `${form.full_name} has been updated successfully.`, 'success');
      } else {
        const res = await addCoordinator({
          full_name: form.full_name,
          email: form.email,
          phone: form.phone,
          department: departmentValue,
          coordinator_type: form.coordinator_type,
          username: form.username || undefined,
          password: form.password,
          status: form.status,
          notes: form.notes,
          event_ids: form.event_ids,
        });
        if (res?.credentials) {
          setCreatedCredentials(res.credentials);
        }
        addToast('Coordinator added successfully', 'Welcome email with temporary password has been sent.', 'success');
        setForm(emptyForm);
        setEditing(null);
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to save coordinator';
      const errs: Record<string, string> = {};
      if (/email/i.test(msg)) errs.email = msg;
      else if (/username/i.test(msg)) errs.username = msg;
      else if (/event/i.test(msg)) errs.event_ids = msg;
      else if (/phone/i.test(msg)) errs.phone = msg;
      setErrors((prev) => ({ ...prev, ...errs }));
      if (Object.keys(errs).length === 0) setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteCoordinator(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwdTarget || !resetPwdValue) return;
    try {
      await updateCoordinator(resetPwdTarget.id, { password: resetPwdValue } as any);
      setResetPwdTarget(null);
      setResetPwdValue('');
    } catch {
      // handled by context
    }
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password: pwd }));
  };

  const handleNameChange = (name: string) => {
    if (!usernameTouched) {
      const base = name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
      setForm((prev) => ({ ...prev, full_name: name, username: base }));
    } else {
      setForm((prev) => ({ ...prev, full_name: name }));
    }
  };

  const generateUsername = () => {
    if (!form.full_name.trim()) return;
    const base = form.full_name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.{2,}/g, '.').replace(/^\.|\.$/g, '');
    setUsernameTouched(true);
    setForm((prev) => ({ ...prev, username: base }));
  };

  const passwordStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return Math.min(score, 4);
  };

  const strength = passwordStrength(form.password);
  const strengthMeta = PASSWORD_STRENGTH[strength + 1] || PASSWORD_STRENGTH[PASSWORD_STRENGTH.length - 1];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Access Control & Delegation</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">Event Coordinators ({coordinators.length})</h2>
        </div>
        <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Coordinator</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2">
          <span className="text-xs font-semibold text-emerald-300/70">Active Coordinators</span>
          <span className="text-2xl font-extrabold text-white font-display">{coordinators.filter((c) => c.status === 'Active').length}</span>
          <span className="text-[10px] text-emerald-400">Currently managing events</span>
        </div>
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
          <span className="text-xs font-semibold text-amber-300/70">Inactive Coordinators</span>
          <span className="text-2xl font-extrabold text-white font-display">{coordinators.filter((c) => c.status === 'Inactive').length}</span>
          <span className="text-[10px] text-amber-400">Temporarily disabled</span>
        </div>
        <div className="p-5 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex flex-col gap-2">
          <span className="text-xs font-semibold text-violet-300/70">Total Coordinators</span>
          <span className="text-2xl font-extrabold text-white font-display">{coordinators.length}</span>
          <span className="text-[10px] text-violet-400">All time registrations</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search coordinators..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Coordinator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">No coordinators found.</div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/30 backdrop-blur-md overflow-hidden flex flex-col transition-all">
              <div className="p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-300">
                    {c.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white">{c.full_name}</span>
                    <span className="text-[10px] text-white/50">{c.department}</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${c.status === 'Active' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                  {c.status}
                </span>
              </div>
              <div className="p-5 flex flex-col gap-3 flex-1">
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Mail className="w-3.5 h-3.5 text-white/40" />
                  {c.email}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Phone className="w-3.5 h-3.5 text-white/40" />
                  {c.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <User className="w-3.5 h-3.5 text-white/40" />
                  {c.username}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/70">
                  <Shield className="w-3.5 h-3.5 text-white/40" />
                  {c.coordinator_type || 'Coordinator'}
                </div>
                {(c.assigned_events || []).length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-white/70">
                    <CalendarDays className="w-3.5 h-3.5 text-white/40 mt-0.5" />
                    <div className="flex flex-wrap gap-1.5">
                      {c.assigned_events!.map((ev) => (
                        <span key={ev.id} className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[9px] font-semibold text-violet-300">
                          {ev.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {c.notes && (
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-white/50 italic">
                    {c.notes}
                  </div>
                )}
              </div>
              <div className="p-3 border-t border-white/10 bg-white/5 flex items-center justify-end gap-1.5">
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer" title="Edit"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => { setResetPwdTarget(c); setResetPwdValue(''); }} className="p-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-white/40 hover:text-amber-400 cursor-pointer" title="Reset Password"><KeyRound className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeleteConfirm(c)} className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="coordinator-modal"
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
              className="relative w-full max-w-2xl bg-zinc-950/95 border border-white/15 rounded-3xl shadow-[0_0_60px_rgba(139,92,246,0.15)] overflow-hidden flex flex-col max-h-[92vh]"
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
                    <h3 className="text-base font-bold font-display text-white tracking-tight truncate">{editing ? 'Edit Coordinator' : 'Add Coordinator'}</h3>
                    <span className="text-[10px] text-white/40 tracking-widest uppercase">
                      {editing ? 'Update profile & assignments' : 'Create a new coordinator account'}
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
                      <p className="text-xs text-white/50">A welcome email with the temporary password has been sent to the coordinator.</p>
                    </div>
                    <div className="w-full max-w-sm rounded-2xl bg-white/[0.03] border border-white/10 p-4 flex flex-col gap-2 text-left">
                      <CredentialRow label="Email" value={createdCredentials.email} onCopy={copyToClipboard} />
                      <CredentialRow label="Username" value={createdCredentials.username} onCopy={copyToClipboard} />
                      <CredentialRow label="Password" value={createdCredentials.password} onCopy={copyToClipboard} />
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
                  <form id="coordinator-form" onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs">
                    {/* Personal Information */}
                    <FormSection icon={<User className="w-3.5 h-3.5" />} title="Personal Information" subtitle="Basic identity details of the coordinator">
                      <div className="flex flex-col gap-4">
                        <Field label="Full Name" required error={errors.full_name}>
                          <input
                            value={form.full_name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className={`${inputBase} border ${errors.full_name ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                            placeholder="e.g. John Doe"
                          />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <Field label="Email Address" required error={errors.email}>
                            <div className="relative">
                              <Mail className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={`${inputBase} pl-9 border ${errors.email ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                                placeholder="email@casyum.edu"
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
                      </div>
                    </FormSection>

                    {/* Role & Department */}
                    <FormSection icon={<Shield className="w-3.5 h-3.5" />} title="Role & Department" subtitle="Where does this coordinator belong?">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Department" required error={errors.department}>
                          <div className="relative">
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
                            <ChevronDown className="w-3.5 h-3.5 text-white/30 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </Field>
                        <Field label="Coordinator Type" required error={errors.coordinator_type}>
                          <div className="relative">
                            <select
                              value={form.coordinator_type}
                              onChange={(e) => setForm({ ...form, coordinator_type: e.target.value })}
                              className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border text-xs text-white focus:outline-none appearance-none cursor-pointer pr-9 transition-colors ${errors.coordinator_type ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                            >
                              {COORDINATOR_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-white/30 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </Field>
                      </div>
                    </FormSection>

                    {/* Login Credentials */}
                    <FormSection icon={<KeyRound className="w-3.5 h-3.5" />} title="Login Credentials" subtitle="Sign-in details for the coordinator portal">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Username" hint="Auto-generated from full name. Editable." error={errors.username}>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <AtSign className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                value={form.username}
                                onChange={(e) => { setUsernameTouched(true); setForm({ ...form, username: e.target.value }); }}
                                className={`${inputBase} pl-9 border ${errors.username ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                                placeholder="Auto-generated"
                              />
                            </div>
                            <button type="button" onClick={generateUsername} title="Regenerate from full name" className="px-3 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-violet-300 hover:border-violet-500/30 transition-colors cursor-pointer flex items-center justify-center shrink-0">
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </Field>
                        <Field label="Temporary Password" required={!editing} error={errors.password} hint={editing ? 'Leave blank to keep the current password.' : 'Enter one manually or generate a secure password.'}>
                          <div className="relative">
                            <Lock className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={form.password}
                              onChange={(e) => setForm({ ...form, password: e.target.value })}
                              className={`${inputBase} pl-9 pr-20 border ${errors.password ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50`}
                              placeholder={editing ? 'New password (optional)' : 'Enter or generate a password'}
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                              <button type="button" onClick={generatePassword} title="Generate secure password" className="p-1.5 rounded-lg text-white/40 hover:text-violet-300 hover:bg-violet-500/10 transition-colors cursor-pointer">
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? 'Hide password' : 'Show password'} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                          {form.password && (
                            <div className="flex items-center gap-2 mt-2">
                              <div className="flex gap-1">
                                {[1, 2, 3, 4].map((i) => (
                                  <span key={i} className={`h-1 w-6 rounded-full transition-colors ${i <= strength ? strengthMeta.color : 'bg-white/10'}`} />
                                ))}
                              </div>
                              <span className="text-[9px] text-white/40">{strengthMeta.label}</span>
                            </div>
                          )}
                        </Field>
                      </div>
                    </FormSection>

                    {/* Event Assignment */}
                    <FormSection icon={<GraduationCap className="w-3.5 h-3.5" />} title="Event Assignment" subtitle="Choose the events this coordinator will manage">
                      <Field label="Assigned Events" required error={errors.event_ids} hint="At least one event must be selected.">
                        {eventsLoading ? (
                          <div className="px-4 py-6 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2 text-white/50">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading events...
                          </div>
                        ) : (
                          <div ref={eventDropdownRef} className="relative">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                type="text"
                                value={eventSearch}
                                onChange={(e) => setEventSearch(e.target.value)}
                                onFocus={() => setEventDropdownOpen(true)}
                                placeholder="Search events to assign..."
                                className={`${inputBase} pl-9 pr-9 border ${errors.event_ids ? 'border-rose-500/50' : 'border-white/10'} focus:border-violet-500/50 cursor-pointer`}
                              />
                              <ChevronDown className="w-3.5 h-3.5 text-white/30 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                            </div>

                            <AnimatePresence>
                              {eventDropdownOpen && (
                                <motion.div
                                  key="event-dropdown"
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute z-30 top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-zinc-900 border border-white/15 shadow-2xl p-1.5 flex flex-col gap-0.5"
                                >
                                  {availableEvents.length === 0 ? (
                                    <span className="px-3 py-3 text-[10px] text-white/40">No events found.</span>
                                  ) : (
                                    availableEvents.map((ev) => {
                                      const checked = form.event_ids.includes(ev.id);
                                      return (
                                        <button
                                          key={ev.id}
                                          type="button"
                                          onClick={() => toggleEvent(ev.id)}
                                          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-left cursor-pointer transition-colors ${checked ? 'bg-violet-600/20 text-violet-200' : 'hover:bg-white/5 text-white/70'}`}
                                        >
                                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${checked ? 'bg-violet-500 border-violet-400' : 'border-white/25'}`}>
                                            {checked && <CheckCircle2 className="w-3 h-3 text-white" />}
                                          </span>
                                          <span className="flex flex-col min-w-0">
                                            <span className="text-[11px] font-semibold truncate">{ev.name}</span>
                                            <span className="text-[9px] text-white/40">{ev.category} • {formatEventDate(ev.event_date)}</span>
                                            {ev.venue && <span className="text-[9px] text-white/30 truncate">{ev.venue}</span>}
                                          </span>
                                        </button>
                                      );
                                    })
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {selectedEvents.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {selectedEvents.map((ev) => (
                                  <span key={ev.id} className="px-2 py-1 rounded-lg bg-violet-600/20 border border-violet-500/30 text-[9px] font-semibold text-violet-300 flex items-center gap-1.5">
                                    {ev.name}
                                    <button type="button" onClick={() => toggleEvent(ev.id)} className="text-violet-400 hover:text-white cursor-pointer">
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Field>
                    </FormSection>

                    {/* Account Settings */}
                    <FormSection icon={<ClipboardCheck className="w-3.5 h-3.5" />} title="Account Settings" subtitle="Control account access and add internal notes">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Status">
                          <div className="relative">
                            <select
                              value={form.status}
                              onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white focus:outline-none focus:border-violet-500/50 appearance-none cursor-pointer pr-9 transition-colors"
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-white/30 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
                          </div>
                        </Field>
                      </div>
                      <Field label="Notes" hint="Optional internal notes visible only to admins.">
                        <textarea
                          value={form.notes}
                          onChange={(e) => setForm({ ...form, notes: e.target.value })}
                          className={`${inputBase} border border-white/10 focus:border-violet-500/50 resize-none`}
                          placeholder="Optional notes..."
                          rows={2}
                        />
                      </Field>
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
                    form="coordinator-form"
                    disabled={submitting || !canSubmit}
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

      {/* Reset Password Dialog */}
      <ConfirmationDialog
        open={!!resetPwdTarget}
        title="Reset Password"
        message={
          <div className="flex flex-col gap-3">
            <p className="text-sm text-white/70">Set a new password for <span className="text-white font-semibold">{resetPwdTarget?.full_name}</span></p>
            <input
              type="text"
              value={resetPwdValue}
              onChange={(e) => setResetPwdValue(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:outline-none"
              placeholder="Enter new password"
              autoFocus
            />
          </div>
        }
        confirmLabel="Reset"
        variant="warning"
        onConfirm={handleResetPassword}
        onCancel={() => { setResetPwdTarget(null); setResetPwdValue(''); }}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteConfirm}
        title="Delete Coordinator"
        message={`Are you sure you want to permanently delete "${deleteConfirm?.full_name}"? The coordinator will no longer be able to log in and will be removed from the list.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};

const FormSection: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }> = ({ icon, title, subtitle, children }) => (
  <section className="flex flex-col gap-4 rounded-2xl bg-white/[0.03] border border-white/10 p-4">
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0">{icon}</div>
      <div className="flex flex-col gap-0.5">
        <span className="text-[10px] font-bold text-white uppercase tracking-widest">{title}</span>
        {subtitle && <span className="text-[10px] text-white/40">{subtitle}</span>}
      </div>
    </div>
    {children}
  </section>
);

const Field: React.FC<{ label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode }> = ({ label, required, error, hint, children }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    {children}
    {hint && !error && <span className="text-[9px] text-white/35">{hint}</span>}
    {error && <span className="text-[9px] text-rose-400">{error}</span>}
  </div>
);

const CredentialRow: React.FC<{ label: string; value: string; onCopy: (text: string) => void }> = ({ label, value, onCopy }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
    <div className="flex flex-col min-w-0">
      <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">{label}</span>
      <span className="text-xs font-semibold text-white font-mono truncate">{value}</span>
    </div>
    <button type="button" onClick={() => onCopy(value)} title={`Copy ${label.toLowerCase()}`} className="p-1.5 rounded-lg text-white/40 hover:text-violet-300 hover:bg-violet-500/10 transition-colors cursor-pointer shrink-0">
      <Copy className="w-3.5 h-3.5" />
    </button>
  </div>
);
