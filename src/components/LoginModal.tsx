import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, User, Lock, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginAdmin: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginAdmin }) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'participant'>('admin');
  const [selectedRole, setSelectedRole] = useState('Super Admin');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [participantLoggedIn, setParticipantLoggedIn] = useState(false);

  if (!isOpen) return null;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginAdmin();
    onClose();
  };

  const handleParticipantLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setParticipantLoggedIn(true);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 selection:bg-violet-500/30 selection:text-violet-200 select-none">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-xl"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="relative w-full max-w-md bg-zinc-950/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(139,92,246,0.2)] z-10 overflow-hidden"
        >
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.4)]">
              <div className="w-full h-full bg-black rounded-[15px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-violet-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-bold font-display text-white tracking-tight">
                CASYUM <span className="text-violet-400">Portal</span>
              </h3>
              <span className="text-[10px] text-white/40 tracking-widest uppercase">
                Secure Authentication Gateway
              </span>
            </div>
          </div>

          {/* Login Type Segmented Switch */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-2xl border border-white/10 mb-6 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('admin');
                setParticipantLoggedIn(false);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin ERP</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('participant');
                setParticipantLoggedIn(false);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'participant'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Participant</span>
            </button>
          </div>

          {/* Tab 1: Admin / Coordinator Login */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Select Role Scope
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-violet-500/50"
                >
                  <option value="Super Admin">Super Admin (Full Access)</option>
                  <option value="Faculty Coordinator">Faculty Coordinator</option>
                  <option value="Student Coordinator">Student Coordinator</option>
                  <option value="Event Coordinator">Event Coordinator</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                  Access Key / Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    defaultValue="••••••••••••"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-violet-500/25 cursor-pointer flex items-center justify-center gap-2 group"
              >
                <span>Launch ERP Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </form>
          )}

          {/* Tab 2: Participant Login */}
          {activeTab === 'participant' && (
            <div>
              {!participantLoggedIn ? (
                <form onSubmit={handleParticipantLogin} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="student@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                      Register Number / ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. RA2111003010245"
                      value={regNo}
                      onChange={(e) => setRegNo(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 hover:from-cyan-400 hover:to-violet-500 text-white font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Check Ticket Status</span>
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-4 text-center py-2 animate-in fade-in duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Welcome back, {email || 'Participant'}!</h4>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-2 text-xs text-left">
                    <div className="flex justify-between">
                      <span className="text-white/50">Ticket Status:</span>
                      <span className="font-bold text-emerald-400">Verified & Approved</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Registered Events:</span>
                      <span className="text-violet-300 font-medium">Debugging, Tech Quiz</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">QR Pass:</span>
                      <span className="font-mono text-cyan-300">CASYUM-2026-PASS-9901</span>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer mt-2"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
