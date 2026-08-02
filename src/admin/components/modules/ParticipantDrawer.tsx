import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Download,
  Trash2,
  Mail,
  Phone,
  Building,
  GraduationCap,
  Calendar,
  CreditCard,
  ZoomIn,
  Award,
  ShieldAlert,
} from 'lucide-react';
import type { Participant } from '../../types';
import { useAdmin } from '../../context/AdminContext';
import { exportToPrintableReport } from '../../utils/exportUtils';

interface ParticipantDrawerProps {
  participant: Participant;
  onClose: () => void;
}

export const ParticipantDrawer: React.FC<ParticipantDrawerProps> = ({ participant, onClose }) => {
  const { approvePayment, rejectPayment, deleteParticipant, events, attendance } = useAdmin();
  const [zoomImage, setZoomImage] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const participantEvents = events.filter((e) => participant.registeredEvents?.includes(e.id));
  const participantAtt = attendance.filter((a) => a.participantId === participant.id);

  const handleDownloadPDF = () => {
    exportToPrintableReport(
      `Participant Profile - ${participant.name}`,
      ['Attribute', 'Details'],
      [
        ['Register ID', participant.id],
        ['Full Name', participant.name],
        ['College', participant.college],
        ['City', participant.city],
        ['Department', participant.department],
        ['Year of Study', participant.year],
        ['Register Number', participant.registerNumber],
        ['Mobile', participant.mobile],
        ['Email', participant.email],
        ['Gender', participant.gender],
        ['Student ID', participant.studentId],
        ['Registered Events', participantEvents.map((e) => e.name).join(', ')],
        ['Payment Status', participant.paymentStatus],
        ['Transaction ID', participant.transactionId],
        ['Amount Paid', `₹${participant.paymentAmount}`],
      ]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-950 border-l border-white/10 h-full flex flex-col justify-between shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <img
              src={participant.photo}
              alt={participant.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-violet-500/50 shadow-md"
            />
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                <span>{participant.name}</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    participant.paymentStatus === 'Approved'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : participant.paymentStatus === 'Pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {participant.paymentStatus}
                </span>
              </h2>
              <span className="text-xs text-white/50">{participant.id} · {participant.college} · {participant.city}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/60 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Profile Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          {/* Duplicate Transaction Warning */}
          {participant.isDuplicateTransaction && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>
                <strong>Warning:</strong> Transaction ID <code>{participant.transactionId}</code> has been used by another registration!
              </span>
            </div>
          )}

          {/* Contact Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <GraduationCap className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Department</span>
                <span className="text-xs font-medium text-white truncate">{participant.department}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <Building className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Year / Reg No</span>
                <span className="text-xs font-medium text-white truncate">
                  {participant.year} ({participant.registerNumber})
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Email</span>
                <span className="text-xs font-medium text-white truncate">{participant.email}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3">
              <Phone className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/40 uppercase">Mobile</span>
                <span className="text-xs font-medium text-white truncate">{participant.mobile}</span>
              </div>
            </div>
          </div>

          {/* Payment Details & Screenshot */}
          <div className="p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-violet-400" />
                <span>Payment Details</span>
              </div>
              <span className="text-xs font-mono font-extrabold text-emerald-400">
                ₹{participant.paymentAmount}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Transaction ID:</span>
              <span className="font-mono font-semibold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">
                {participant.transactionId}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Uploaded Time:</span>
              <span>{participant.paymentUploadedTime}</span>
            </div>

            {participant.paymentRemarks && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <strong>Remarks:</strong> {participant.paymentRemarks}
              </div>
            )}

            {/* Screenshot Thumbnail */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 group h-40 bg-black">
              <img
                src={participant.paymentScreenshotUrl}
                alt="Payment Screenshot"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <button
                onClick={() => setZoomImage(true)}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 text-xs font-bold text-white transition-opacity cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Click to Zoom</span>
              </button>
            </div>
          </div>

          {/* Registered Events */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span>Registered Events ({participantEvents.length})</span>
            </span>

            <div className="flex flex-col gap-2">
              {participantEvents.map((e) => (
                <div
                  key={e.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-white">{e.name}</span>
                    <span className="text-[10px] text-white/50">{e.venue} · {e.time}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 text-[10px] font-semibold border border-violet-500/20">
                    ₹{e.fee}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance History */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-400" />
              <span>Attendance History</span>
            </span>

            {participantAtt.length === 0 ? (
              <div className="p-3 text-center text-xs text-white/40 bg-white/5 rounded-xl border border-white/5">
                No attendance scans recorded yet.
              </div>
            ) : (
              participantAtt.map((a) => (
                <div key={a.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                  <span className="text-white font-medium">{a.eventName}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                    {a.status} ({a.timestamp})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer Action Bar */}
        <div className="p-6 border-t border-white/10 bg-white/5 flex flex-col gap-3">
          {showRejectForm ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
                placeholder="Enter rejection reason / remarks..."
                className="w-full p-2.5 rounded-xl bg-black border border-white/20 text-xs text-white placeholder-white/40 focus:outline-none"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    rejectPayment(participant.id, rejectRemarks || 'Invalid screenshot');
                    setShowRejectForm(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold"
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {participant.paymentStatus !== 'Approved' && (
                  <button
                    onClick={() => approvePayment(participant.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                )}

                {participant.paymentStatus !== 'Rejected' && (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white cursor-pointer"
                  title="Download Profile PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    deleteParticipant(participant.id);
                    onClose();
                  }}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 cursor-pointer"
                  title="Delete Participant"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Zoom Modal Overlay */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6"
          onClick={() => setZoomImage(false)}
        >
          <div className="relative max-w-3xl max-h-[85vh] rounded-3xl overflow-hidden border border-white/20">
            <img src={participant.paymentScreenshotUrl} alt="Zoomed Screenshot" className="w-full h-full object-contain" />
            <button
              onClick={() => setZoomImage(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/80 text-white border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
