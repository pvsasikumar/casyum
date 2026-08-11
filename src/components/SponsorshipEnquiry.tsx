import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Handshake,
  FileText,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Mail,
  Phone,
} from 'lucide-react';
import { createSponsorshipEnquiry } from '../services/sponsorshipService';
import { readSponsorshipSettings } from '../services/sponsorshipService';
import { DEFAULT_SPONSOR_CATEGORIES } from '../types/sponsorship';

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30';

const emptyForm = {
  companyName: '',
  contactPerson: '',
  designation: '',
  email: '',
  phone: '',
  website: '',
  categoryInterest: '',
  packageInterest: '',
  budget: '',
  message: '',
  howDidYouHear: '',
};

const PACKAGE_OPTIONS = [
  'Title Sponsor',
  'Powered By',
  'Presenting Sponsor',
  'Gold Sponsor',
  'Silver Sponsor',
  'Bronze Sponsor',
  'Associate Sponsor',
  'Media Partner',
  'Education Partner',
  'Technology Partner',
  'Community Partner',
];

const BUDGET_OPTIONS = [
  'Below ₹25,000',
  '₹25,000 – ₹50,000',
  '₹50,000 – ₹1,00,000',
  '₹1,00,000 – ₹2,50,000',
  '₹2,50,000 – ₹5,00,000',
  'Above ₹5,00,000',
  'In-kind contribution',
];

export const SponsorshipEnquiry: React.FC<{ openSignal?: number }> = ({ openSignal = 0 }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [tariffUrl, setTariffUrl] = useState('');
  const [tariffLoading, setTariffLoading] = useState(true);

  useEffect(() => {
    if (openSignal > 0) {
      setSubmitted(false);
      setFormOpen(true);
    }
  }, [openSignal]);

  useEffect(() => {
    readSponsorshipSettings()
      .then((settings) => {
        const t = settings.tariff;
        if (t && t.enabled && t.pdfUrl) {
          setTariffUrl(t.pdfUrl);
        }
      })
      .catch(() => {})
      .finally(() => setTariffLoading(false));
  }, []);

  const openTariff = () => {
    if (tariffUrl) {
      window.open(tariffUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.companyName.trim()) errs.companyName = 'Company name is required.';
    if (!form.contactPerson.trim()) errs.contactPerson = 'Contact person is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Enter a valid email.';
    if (!form.phone.trim()) errs.phone = 'Phone number is required.';
    else if (!/^[+\d\s()-]{7,20}$/.test(form.phone.trim())) errs.phone = 'Enter a valid phone number.';
    if (!form.categoryInterest.trim()) errs.categoryInterest = 'Select a sponsorship category.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!validate()) return;
    setSubmitting(true);
    try {
      await createSponsorshipEnquiry(form);
      setSubmitted(true);
      setForm(emptyForm);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit your enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setErrors({});
    setErrorMsg('');
    setTimeout(() => setSubmitted(false), 300);
  };

  return (
    <section id="sponsor-us" className="relative py-20 sm:py-24 px-6 select-none bg-black overflow-hidden">
      <div className="absolute top-1/3 right-0 w-[30vw] h-[30vw] bg-violet-600/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[24vw] h-[24vw] bg-cyan-500/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
            <Handshake className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold tracking-[0.3em] text-violet-400 uppercase">Partnerships</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-display">
          Looking for <span className="text-gradient">Sponsors</span>
        </h2>
        <p className="text-white/50 text-sm sm:text-base max-w-xl leading-relaxed">
          Partner with CASYUM 2026 and get your brand in front of our student community.
          Reach thousands of students, faculty and industry guests across a national-level technical symposium.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-2">
          <button
            onClick={() => {
              setSubmitted(false);
              setFormOpen(true);
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-violet-500/25 transition-all cursor-pointer active:scale-95"
          >
            <Handshake className="w-4 h-4" />
            Become a Sponsor
          </button>
          <button
            onClick={openTariff}
            disabled={tariffLoading || !tariffUrl}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest border transition-all cursor-pointer active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              tariffUrl
                ? 'border-white/15 bg-white/5 text-white/80 hover:text-white hover:bg-white/10'
                : 'border-white/10 bg-white/5 text-white/40'
            }`}
            title={tariffUrl ? 'Open sponsorship packages PDF' : 'Sponsorship tariff not available yet'}
          >
            {tariffLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : tariffUrl ? (
              <FileText className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            View Sponsorship Packages
          </button>
        </div>

        {tariffUrl && (
          <span className="text-[10px] text-white/30 uppercase tracking-widest flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Sponsorship tariff available as PDF
          </span>
        )}
      </div>

      {/* Enquiry Form Modal */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl custom-scrollbar my-auto"
            >
              <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-500/15 border border-violet-500/30 text-violet-300">
                    <Handshake className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-extrabold font-display text-white">Sponsorship Enquiry</h3>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">CASYUM 2026</span>
                  </div>
                </div>
                <button
                  onClick={closeForm}
                  className="p-2 rounded-lg text-white/50 hover:text-white bg-white/5 hover:bg-white/10 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6">
                {submitted ? (
                  <div className="flex flex-col items-center gap-4 text-center py-10">
                    <div className="p-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-extrabold font-display text-white">Enquiry Submitted</h4>
                    <p className="text-sm text-white/60 max-w-sm leading-relaxed">
                      Thank you for your interest in sponsoring CASYUM 2026. Our Sponsorship Head will
                      review your enquiry and contact you shortly.
                    </p>
                    <button
                      onClick={closeForm}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white text-xs font-bold uppercase tracking-widest cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Organization / Company Name *</label>
                        <input
                          type="text"
                          value={form.companyName}
                          onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                          placeholder="e.g. ABC Technologies"
                          className={inputClass}
                        />
                        {errors.companyName && <span className="text-[10px] text-rose-400">{errors.companyName}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Contact Person Name *</label>
                        <input
                          type="text"
                          value={form.contactPerson}
                          onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                          placeholder="Full name"
                          className={inputClass}
                        />
                        {errors.contactPerson && <span className="text-[10px] text-rose-400">{errors.contactPerson}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Designation</label>
                        <input
                          type="text"
                          value={form.designation}
                          onChange={(e) => setForm({ ...form, designation: e.target.value })}
                          placeholder="e.g. Marketing Manager"
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Email *</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          placeholder="you@company.com"
                          className={inputClass}
                        />
                        {errors.email && <span className="text-[10px] text-rose-400">{errors.email}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Phone Number *</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          placeholder="+91 ..."
                          className={inputClass}
                        />
                        {errors.phone && <span className="text-[10px] text-rose-400">{errors.phone}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Website (Optional)</label>
                        <input
                          type="url"
                          value={form.website}
                          onChange={(e) => setForm({ ...form, website: e.target.value })}
                          placeholder="https://..."
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Sponsorship Category / Interest *</label>
                        <select
                          value={form.categoryInterest}
                          onChange={(e) => setForm({ ...form, categoryInterest: e.target.value })}
                          className={`${inputClass} appearance-none cursor-pointer`}
                        >
                          <option value="">Select a category...</option>
                          {DEFAULT_SPONSOR_CATEGORIES.map((c) => (
                            <option key={c} value={c} className="bg-zinc-900">{c}</option>
                          ))}
                        </select>
                        {errors.categoryInterest && <span className="text-[10px] text-rose-400">{errors.categoryInterest}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Preferred Sponsorship Package</label>
                        <select
                          value={form.packageInterest}
                          onChange={(e) => setForm({ ...form, packageInterest: e.target.value })}
                          className={`${inputClass} appearance-none cursor-pointer`}
                        >
                          <option value="">Select a package...</option>
                          {PACKAGE_OPTIONS.map((c) => (
                            <option key={c} value={c} className="bg-zinc-900">{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Approximate Sponsorship Budget</label>
                        <select
                          value={form.budget}
                          onChange={(e) => setForm({ ...form, budget: e.target.value })}
                          className={`${inputClass} appearance-none cursor-pointer`}
                        >
                          <option value="">Select a budget range...</option>
                          {BUDGET_OPTIONS.map((c) => (
                            <option key={c} value={c} className="bg-zinc-900">{c}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">How did you hear about CASYUM? (Optional)</label>
                        <input
                          type="text"
                          value={form.howDidYouHear}
                          onChange={(e) => setForm({ ...form, howDidYouHear: e.target.value })}
                          placeholder="Social media, word of mouth..."
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Message / Requirements</label>
                      <textarea
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us about your branding goals, requirements, or any questions..."
                        rows={4}
                        className={`${inputClass} resize-none`}
                      />
                    </div>

                    {errorMsg && (
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 hover:from-violet-600 hover:to-indigo-700 text-white text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-violet-500/25 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Submit Sponsorship Enquiry
                        </>
                      )}
                    </button>

                    <p className="text-center text-[10px] text-white/30 flex items-center justify-center gap-1.5">
                      <Mail className="w-3 h-3" />
                      <Phone className="w-3 h-3" />
                      Our Sponsorship Head will review and contact you.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default SponsorshipEnquiry;
