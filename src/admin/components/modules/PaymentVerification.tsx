import React, { useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ZoomIn,
  Download,
  X,
  Clock,
  Filter,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { Participant } from '../../types';

export const PaymentVerification: React.FC = () => {
  const { participants, approvePayment, rejectPayment, setSelectedParticipant, setActiveTab } = useAdmin();
  const [filter, setFilter] = useState<'Pending' | 'Approved' | 'Rejected' | 'All'>('Pending');
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');

  const filtered = participants.filter((p) => {
    if (filter === 'All') return true;
    return p.paymentStatus === filter;
  });

  const duplicateTxnIds = new Set<string>();
  const seenTxnIds = new Set<string>();
  participants.forEach((p) => {
    if (seenTxnIds.has(p.transactionId)) {
      duplicateTxnIds.add(p.transactionId);
    }
    seenTxnIds.add(p.transactionId);
  });

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Payment Audit Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Payment Verification Queue ({filtered.length})
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10 text-xs">
          {(['Pending', 'Approved', 'Rejected', 'All'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer ${
                filter === status
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Verification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-white/40 rounded-3xl bg-zinc-950/60 border border-white/10">
            No payment receipts found under status &quot;{filter}&quot;.
          </div>
        ) : (
          filtered.map((p) => {
            const isDuplicate = duplicateTxnIds.has(p.transactionId) || p.isDuplicateTransaction;

            return (
              <div
                key={p.id}
                className="rounded-3xl bg-zinc-950/60 border border-white/10 hover:border-violet-500/30 backdrop-blur-md overflow-hidden flex flex-col justify-between transition-all"
              >
                {/* Header info */}
                <div className="p-5 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={p.photo} alt={p.name} className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white line-clamp-1">{p.name}</span>
                      <span className="text-[10px] text-white/50">{p.college}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                      p.paymentStatus === 'Approved'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : p.paymentStatus === 'Pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {p.paymentStatus}
                  </span>
                </div>

                {/* Screenshot Box */}
                <div className="relative h-48 bg-black overflow-hidden group">
                  <img
                    src={p.paymentScreenshotUrl}
                    alt="UPI Payment Screenshot"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Duplicate Alert Overlay Badge */}
                  {isDuplicate && (
                    <div className="absolute top-3 left-3 bg-rose-600/90 text-white px-2.5 py-1 rounded-full text-[9px] font-extrabold flex items-center gap-1 border border-rose-400/50 shadow-lg">
                      <ShieldAlert className="w-3 h-3" />
                      <span>DUPLICATE TXN ID</span>
                    </div>
                  )}

                  <button
                    onClick={() => setZoomImage(p.paymentScreenshotUrl)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-xs font-bold text-white transition-opacity cursor-pointer"
                  >
                    <ZoomIn className="w-4 h-4" />
                    <span>Zoom Screenshot</span>
                  </button>
                </div>

                {/* Transaction Metadata */}
                <div className="p-5 flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Transaction ID:</span>
                    <span className="font-mono font-bold text-violet-300 bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">
                      {p.transactionId}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-white/50">Amount:</span>
                    <span className="font-mono font-extrabold text-emerald-400">₹{p.paymentAmount}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-white/40">
                    <span>Uploaded:</span>
                    <span>{p.paymentUploadedTime}</span>
                  </div>

                  {p.paymentRemarks && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px]">
                      <strong>Remarks:</strong> {p.paymentRemarks}
                    </div>
                  )}
                </div>

                {/* Footer Action Buttons */}
                <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-2">
                  {rejectId === p.id ? (
                    <div className="flex flex-col gap-2 w-full">
                      <input
                        type="text"
                        value={rejectRemarks}
                        onChange={(e) => setRejectRemarks(e.target.value)}
                        placeholder="Rejection reason..."
                        className="w-full p-2 rounded-xl bg-black border border-white/20 text-xs text-white"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setRejectId(null)}
                          className="text-xs text-white/50 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            rejectPayment(p.id, rejectRemarks || 'Invalid transaction screenshot');
                            setRejectId(null);
                          }}
                          className="px-3 py-1 rounded-xl bg-rose-500 text-white text-xs font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        {p.paymentStatus !== 'Approved' && (
                          <button
                            onClick={() => approvePayment(p.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}
                        {p.paymentStatus !== 'Rejected' && (
                          <button
                            onClick={() => setRejectId(p.id)}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          setSelectedParticipant(p);
                          setActiveTab('Registrations');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs cursor-pointer"
                      >
                        Profile
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden border border-white/20">
            <img src={zoomImage} alt="Payment Receipt Zoom" className="w-full h-full object-contain" />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/80 text-white border border-white/20 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
