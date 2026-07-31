import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Sparkles, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await api.forgotPassword(email);
      setIsSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 selection:bg-violet-500/30 selection:text-violet-200">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md bg-zinc-950/90 border border-white/15 rounded-3xl p-8 shadow-[0_0_50px_rgba(139,92,246,0.2)]"
      >
        <button
          onClick={() => navigate('/')}
          className="absolute top-5 left-5 p-2 rounded-xl text-white/50 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-6 mt-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1px] shadow-[0_0_15px_rgba(139,92,246,0.4)]">
            <div className="w-full h-full bg-black rounded-[15px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold font-display text-white tracking-tight">
              Forgot <span className="text-violet-400">Password</span>
            </h3>
            <span className="text-[10px] text-white/40 tracking-widest uppercase">
              Reset your account password
            </span>
          </div>
        </div>

        {isSent ? (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 py-6"
          >
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-bold text-white mb-1">Check Your Email</h4>
              <p className="text-xs text-white/50">
                If an account exists for <span className="text-violet-400 font-medium">{email}</span>,
                we've sent a password reset link.
              </p>
              <p className="text-[10px] text-white/30 mt-3">
                Check the server console for the reset token (development mode).
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              Back to Login
            </button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}

            <p className="text-xs text-white/40 leading-relaxed">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-white/50 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="your@email.com"
                  disabled={isLoading}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 disabled:opacity-50"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white rounded-xl font-bold uppercase tracking-widest text-xs transition-all duration-300 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};