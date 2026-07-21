import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Trash2,
  Download,
  Eye,
  UserPlus,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { PaymentStatus } from '../../types';
import { ParticipantDrawer } from './ParticipantDrawer';
import { exportToCSV } from '../../utils/exportUtils';

export const RegistrationManagement: React.FC = () => {
  const {
    participants,
    approvePayment,
    rejectPayment,
    deleteParticipant,
    bulkDeleteParticipants,
    bulkApprovePayments,
    addRegistration,
    selectedParticipant,
    setSelectedParticipant,
  } = useAdmin();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [collegeFilter, setCollegeFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<'name' | 'registrationDate' | 'paymentAmount'>('registrationDate');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form state for manual registration modal
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    college: 'SRM Institute of Science and Technology',
    department: 'Department of Computer Applications',
    year: '1st Year',
    registerNumber: '',
    mobile: '',
    email: '',
    gender: 'Male' as const,
    studentId: '',
    registeredEvents: ['evt-1'],
    paymentStatus: 'Approved' as PaymentStatus,
    paymentScreenshotUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80',
    transactionId: `UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}`,
    paymentAmount: 350,
    paymentUploadedTime: new Date().toLocaleString(),
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  });

  const pageSize = 8;

  // Extract unique colleges for filter
  const collegesList = useMemo(() => {
    return Array.from(new Set(participants.map((p) => p.college)));
  }, [participants]);

  // Filtering & Sorting
  const filteredParticipants = useMemo(() => {
    return participants
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.email.toLowerCase().includes(search.toLowerCase()) ||
          p.mobile.includes(search) ||
          p.registerNumber.toLowerCase().includes(search.toLowerCase()) ||
          p.college.toLowerCase().includes(search.toLowerCase()) ||
          p.transactionId.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'All' || p.paymentStatus === statusFilter;
        const matchesCollege = collegeFilter === 'All' || p.college === collegeFilter;

        return matchesSearch && matchesStatus && matchesCollege;
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === 'name') comp = a.name.localeCompare(b.name);
        if (sortField === 'registrationDate') comp = a.registrationDate.localeCompare(b.registrationDate);
        if (sortField === 'paymentAmount') comp = a.paymentAmount - b.paymentAmount;
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [participants, search, statusFilter, collegeFilter, sortField, sortOrder]);

  // Pagination slice
  const totalPages = Math.ceil(filteredParticipants.length / pageSize) || 1;
  const paginatedParticipants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredParticipants.slice(start, start + pageSize);
  }, [filteredParticipants, currentPage, pageSize]);

  // Bulk Select Toggle
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedParticipants.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  const handleBulkExport = () => {
    const selectedRows = participants.filter((p) => selectedIds.includes(p.id));
    const exportData = (selectedRows.length > 0 ? selectedRows : filteredParticipants).map((p) => ({
      ID: p.id,
      Name: p.name,
      College: p.college,
      Department: p.department,
      Year: p.year,
      RegNo: p.registerNumber,
      Mobile: p.mobile,
      Email: p.email,
      Gender: p.gender,
      PaymentStatus: p.paymentStatus,
      TxnID: p.transactionId,
      Amount: p.paymentAmount,
      RegDate: p.registrationDate,
    }));
    exportToCSV(`CASYUM_Registrations_${Date.now()}`, exportData);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addRegistration(newParticipant);
    setShowAddModal(false);
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header & Main Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Database Matrix
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Registration Management ({participants.length})
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkExport}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center gap-2"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Participant</span>
          </button>
        </div>
      </div>

      {/* Bulk Action Bar (when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-violet-600/20 border border-violet-500/40 backdrop-blur-md flex items-center justify-between animate-in fade-in duration-200">
          <span className="text-xs font-bold text-violet-300">
            {selectedIds.length} participant(s) selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                bulkApprovePayments(selectedIds);
                setSelectedIds([]);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold cursor-pointer"
            >
              Bulk Approve Payments
            </button>
            <button
              onClick={() => {
                bulkDeleteParticipants(selectedIds);
                setSelectedIds([]);
              }}
              className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bulk Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search name, email, college, txn..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-white/40" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={collegeFilter}
              onChange={(e) => setCollegeFilter(e.target.value)}
              className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none max-w-[150px] truncate"
            >
              <option value="All">All Colleges</option>
              {collegesList.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-white/40" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none"
            >
              <option value="registrationDate">Date Registered</option>
              <option value="name">Participant Name</option>
              <option value="paymentAmount">Amount Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedParticipants.length > 0 &&
                      paginatedParticipants.every((p) => selectedIds.includes(p.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded bg-white/10 border-white/20"
                  />
                </th>
                <th className="p-4">Participant</th>
                <th className="p-4">College & Dept</th>
                <th className="p-4">Mobile / Email</th>
                <th className="p-4">Txn ID</th>
                <th className="p-4">Payment Status</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedParticipants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-xs text-white/40">
                    No registrations found matching criteria.
                  </td>
                </tr>
              ) : (
                paginatedParticipants.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-violet-500/5 transition-all ${
                        isSelected ? 'bg-violet-500/10' : ''
                      }`}
                    >
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                          className="rounded bg-white/10 border-white/20"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.photo}
                            alt={p.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/10"
                          />
                          <div className="flex flex-col">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              {p.name}
                              {p.isDuplicateTransaction && (
                                <span title="Duplicate Txn">
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-white/40">{p.id} · {p.registerNumber}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white/90 truncate max-w-[160px]">{p.college}</span>
                          <span className="text-[10px] text-white/40">{p.department} ({p.year})</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col font-mono text-[11px]">
                          <span className="text-white/80">{p.mobile}</span>
                          <span className="text-[10px] text-white/40">{p.email}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-mono text-[11px] text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                          {p.transactionId}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.paymentStatus === 'Approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : p.paymentStatus === 'Pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="p-4 text-white/50 text-[11px]">{p.registrationDate}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedParticipant(p)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                            title="View Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {p.paymentStatus !== 'Approved' && (
                            <button
                              onClick={() => approvePayment(p.id)}
                              className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {p.paymentStatus !== 'Rejected' && (
                            <button
                              onClick={() => rejectPayment(p.id, 'Invalid screenshot')}
                              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 cursor-pointer"
                              title="Reject"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteParticipant(p.id)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>
            Showing {paginatedParticipants.length} of {filteredParticipants.length} entries
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Participant Detail Side Drawer */}
      {selectedParticipant && (
        <ParticipantDrawer
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
        />
      )}

      {/* Add Participant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <h3 className="text-lg font-bold font-display text-white">Add Manual Participant</h3>
            <form onSubmit={handleAddSubmit} className="flex flex-col gap-3 text-xs">
              <input
                type="text"
                required
                placeholder="Full Name"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="College Name"
                  value={newParticipant.college}
                  onChange={(e) => setNewParticipant({ ...newParticipant, college: e.target.value })}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Department"
                  value={newParticipant.department}
                  onChange={(e) => setNewParticipant({ ...newParticipant, department: e.target.value })}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Register Number"
                  value={newParticipant.registerNumber}
                  onChange={(e) => setNewParticipant({ ...newParticipant, registerNumber: e.target.value })}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Mobile"
                  value={newParticipant.mobile}
                  onChange={(e) => setNewParticipant({ ...newParticipant, mobile: e.target.value })}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none"
                />
              </div>
              <input
                type="email"
                required
                placeholder="Email Address"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold"
                >
                  Create Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
