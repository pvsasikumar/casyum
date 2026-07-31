import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Eye,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { ConfirmationDialog } from '../common/ConfirmationDialog';
import { ParticipantDrawer } from './ParticipantDrawer';
import { exportToCSV } from '../../utils/exportUtils';

export const ParticipantsModule: React.FC = () => {
  const { participants, deleteParticipant, selectedParticipant, setSelectedParticipant } = useAdmin();
  const [search, setSearch] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pageSize = 10;

  const collegeList = useMemo(() => Array.from(new Set(participants.map((p) => p.college))), [participants]);

  const filtered = useMemo(() => {
    return participants.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.email.toLowerCase().includes(search.toLowerCase()) || p.registerNumber.toLowerCase().includes(search.toLowerCase());
      const matchesCollege = collegeFilter === 'All' || p.college === collegeFilter;
      return matchesSearch && matchesCollege;
    });
  }, [participants, search, collegeFilter]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = () => {
    const data = filtered.map((p) => ({
      ID: p.id,
      Name: p.name,
      College: p.college,
      Department: p.department,
      Year: p.year,
      RegNo: p.registerNumber,
      Mobile: p.mobile,
      Email: p.email,
      Gender: p.gender,
      'Registered Events': p.registeredEvents?.length || 0,
      'Reg Date': p.registrationDate,
    }));
    exportToCSV(`CASYUM_Participants_${Date.now()}`, data);
  };

  const handleDelete = () => {
    if (deleteConfirm) {
      deleteParticipant(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">Participant Directory</span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">All Participants ({participants.length})</h2>
        </div>
        <button onClick={handleExport} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2">
          <Download className="w-3.5 h-3.5" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="p-4 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} placeholder="Search participants..." className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder-white/30 focus:outline-none focus:border-violet-500/50" />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <select value={collegeFilter} onChange={(e) => { setCollegeFilter(e.target.value); setCurrentPage(1); }} className="bg-zinc-900 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none">
            <option value="All">All Colleges</option>
            {collegeList.map((col) => <option key={col} value={col}>{col}</option>)}
          </select>
        </div>
      </div>

      {/* Participants Table */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Participant</th>
                <th className="p-4">College</th>
                <th className="p-4">Department</th>
                <th className="p-4">Year</th>
                <th className="p-4">Reg No.</th>
                <th className="p-4">Registered Events</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginated.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-xs text-white/40">No participants found.</td></tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-violet-500/5 transition-all">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={p.photo} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{p.name}</span>
                          <span className="text-[10px] text-white/40">{p.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-white/80 truncate max-w-[140px]">{p.college}</td>
                    <td className="p-4 text-white/60">{p.department}</td>
                    <td className="p-4 text-white/60">{p.year}</td>
                    <td className="p-4 font-mono text-[11px] text-white/60">{p.registerNumber}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 text-[10px] font-semibold border border-violet-500/20">{p.registeredEvents?.length || 0} Events</span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setSelectedParticipant(p)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer" title="View Profile"><Eye className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(p.id)} className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 cursor-pointer" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <span>Showing {paginated.length} of {filtered.length} entries</span>
          <div className="flex items-center gap-2">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 cursor-pointer">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white">Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-30 cursor-pointer">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Participant Drawer */}
      {selectedParticipant && <ParticipantDrawer participant={selectedParticipant} onClose={() => setSelectedParticipant(null)} />}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={!!deleteConfirm}
        title="Delete Participant"
        message="Are you sure you want to delete this participant? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
