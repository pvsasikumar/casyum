import React, { useState } from 'react';
import {
  Award,
  Download,
  FileText,
  Plus,
  X,
  Trophy,
  Users,
  GraduationCap,
  Heart,
  Sparkles,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import type { CertificateType, Certificate } from '../../types';
import { exportToPrintableReport } from '../../utils/exportUtils';

export const CertificateManagement: React.FC = () => {
  const { certificates, participants, events } = useAdmin();
  const [filter, setFilter] = useState<string>('All');
  const [showPreview, setShowPreview] = useState<Certificate | null>(null);

  const filteredCerts = filter === 'All' ? certificates : certificates.filter((c) => c.type === filter);

  const certTypes: { type: CertificateType; icon: React.ElementType; color: string; count: number }[] = [
    {
      type: 'Participation',
      icon: Users,
      color: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      count: certificates.filter((c) => c.type === 'Participation').length,
    },
    {
      type: 'Winner',
      icon: Trophy,
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      count: certificates.filter((c) => c.type === 'Winner').length,
    },
    {
      type: 'Coordinator',
      icon: GraduationCap,
      color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      count: certificates.filter((c) => c.type === 'Coordinator').length,
    },
    {
      type: 'Volunteer',
      icon: Heart,
      color: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
      count: certificates.filter((c) => c.type === 'Volunteer').length,
    },
  ];

  const handleDownloadCert = (cert: Certificate) => {
    exportToPrintableReport(
      `Certificate - ${cert.participantName}`,
      ['Field', 'Value'],
      [
        ['Certificate Code', cert.certificateCode],
        ['Participant', cert.participantName],
        ['College', cert.college],
        ['Type', cert.type],
        ['Event', cert.eventName || 'All Events'],
        ['Issue Date', cert.issueDate],
        ['Issued By', 'CASYUM 2K26 - Department of Computer Applications, SRM IST'],
      ]
    );
  };

  const handleBulkGenerate = (type: CertificateType) => {
    const rows = certificates
      .filter((c) => c.type === type)
      .map((c) => [c.certificateCode, c.participantName, c.college, c.eventName || 'All', c.issueDate]);

    exportToPrintableReport(
      `Bulk ${type} Certificates - CASYUM 2K26`,
      ['Certificate Code', 'Participant', 'College', 'Event', 'Issued'],
      rows
    );
  };

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Credential Engine
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Certificate Management ({certificates.length})
          </h2>
        </div>
      </div>

      {/* Certificate Type Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {certTypes.map((ct) => {
          const Icon = ct.icon;
          return (
            <div
              key={ct.type}
              className="p-5 rounded-2xl bg-zinc-950/60 border border-white/10 hover:border-white/20 flex flex-col gap-3 transition-all cursor-pointer"
              onClick={() => setFilter(ct.type)}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/50">{ct.type}</span>
                <div className={`p-2 rounded-xl border ${ct.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <span className="text-2xl font-extrabold text-white font-display">{ct.count}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBulkGenerate(ct.type);
                }}
                className="self-start px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-[10px] font-bold border border-white/10 cursor-pointer"
              >
                Bulk Generate PDFs
              </button>
            </div>
          );
        })}
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2">
        {['All', 'Participation', 'Winner', 'Coordinator', 'Volunteer'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filter === f
                ? 'bg-violet-600 text-white shadow-md'
                : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Certificate List Table */}
      <div className="rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-wider text-white/50">
              <tr>
                <th className="p-4">Certificate Code</th>
                <th className="p-4">Participant</th>
                <th className="p-4">College</th>
                <th className="p-4">Type</th>
                <th className="p-4">Event</th>
                <th className="p-4">Issue Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs text-white/40">
                    No certificates issued yet for this category.
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-white/5 transition-all">
                    <td className="p-4 font-mono font-bold text-violet-300">{cert.certificateCode}</td>
                    <td className="p-4 font-semibold text-white">{cert.participantName}</td>
                    <td className="p-4 text-white/70">{cert.college}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          cert.type === 'Winner'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : cert.type === 'Coordinator'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            : cert.type === 'Volunteer'
                            ? 'bg-pink-500/20 text-pink-300 border-pink-500/30'
                            : 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                        }`}
                      >
                        {cert.type}
                      </span>
                    </td>
                    <td className="p-4 text-white/60">{cert.eventName || 'All Events'}</td>
                    <td className="p-4 text-white/50">{cert.issueDate}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setShowPreview(cert)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                          title="Preview Certificate"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadCert(cert)}
                          className="p-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificate Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-white/20 rounded-3xl overflow-hidden shadow-2xl">
            {/* Certificate Canvas Preview */}
            <div className="relative p-12 bg-gradient-to-br from-violet-950/80 via-zinc-950 to-cyan-950/60 border-b border-white/10 flex flex-col items-center justify-center text-center gap-4">
              <div className="absolute inset-0 border-8 border-double border-violet-500/20 m-4 rounded-2xl pointer-events-none" />

              <Award className="w-12 h-12 text-amber-400" />
              <span className="text-[10px] font-bold tracking-[0.4em] text-violet-400 uppercase">
                CASYUM 2K26 · National Level Technical Symposium
              </span>
              <h2 className="text-2xl font-extrabold font-display text-white">
                Certificate of {showPreview.type}
              </h2>
              <p className="text-sm text-white/70">This is to certify that</p>
              <h3 className="text-xl font-extrabold text-violet-300 font-display">
                {showPreview.participantName}
              </h3>
              <p className="text-xs text-white/60">of {showPreview.college}</p>
              <p className="text-xs text-white/50 mt-2">
                has successfully {showPreview.type === 'Winner' ? 'won' : 'participated in'}{' '}
                <strong className="text-white">{showPreview.eventName || 'CASYUM 2K26'}</strong>
              </p>
              <div className="mt-4 text-[10px] text-white/30 font-mono">
                Certificate Code: {showPreview.certificateCode}
              </div>
            </div>

            <div className="p-4 flex items-center justify-between bg-white/5">
              <button
                onClick={() => setShowPreview(null)}
                className="px-4 py-2 rounded-xl text-white/60 hover:text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  handleDownloadCert(showPreview);
                  setShowPreview(null);
                }}
                className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold cursor-pointer flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
