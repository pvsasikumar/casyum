import React, { useEffect, useRef, useState } from 'react';
import {
  Save,
  CheckCircle2,
  Loader2,
  QrCode,
  Eye,
  EyeOff,
  AlertCircle,
  Landmark,
  CreditCard,
  Hash,
  Building2,
  Wallet,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';
import { useRBAC } from '../../../rbac/context/RBACContext';
import {
  subscribePaymentSettings,
  savePaymentSettings,
  type PaymentSettings,
} from '../../../services/paymentSettingsService';
import { PAYMENT_CONFIG } from '../../../config/paymentConfig';

const inputClass =
  'w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-violet-500/50 transition-all';

export const PaymentSettingsModule: React.FC = () => {
  const rbac = useRBAC();
  const { addToast, logAction } = useAdmin();
  const [form, setForm] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrPreviewOpen, setQrPreviewOpen] = useState(false);
  const [qrPreviewFailed, setQrPreviewFailed] = useState(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribePaymentSettings(
      (settings) => {
        setForm((prev) => (dirtyRef.current ? prev : settings));
        setLoading(false);
      },
      () => {
        addToast('Error', 'Failed to load payment settings.', 'error');
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [addToast]);

  const update = (partial: Partial<PaymentSettings>) => {
    dirtyRef.current = true;
    setForm((prev) => (prev ? { ...prev, ...partial } : prev));
  };

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const saved = await savePaymentSettings(form, {
        id: rbac.user?.id || '',
        name: rbac.user?.name || '',
      });
      dirtyRef.current = false;
      setForm(saved);
      logAction('Payment Settings Updated', 'Updated payment collection settings (UPI, bank details).');
      addToast('Saved', 'Payment settings saved successfully.', 'success');
    } catch (err) {
      addToast('Error', err instanceof Error ? err.message : 'Failed to save payment settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-white/50 text-sm py-10">
        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
        <span>Loading payment settings...</span>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="flex flex-col gap-6 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-violet-400 uppercase tracking-widest">
            Payment Collection
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold font-display text-white">
            Payment Settings
          </h2>
          <p className="text-[11px] text-white/50">
            QR code, UPI and bank details shown to participants on the payment form.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg cursor-pointer flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saving ? 'Saving...' : 'Save Payment Settings'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UPI / QR */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>UPI & QR Code</span>
          </h3>

          {/* QR code info */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Payment QR Code</label>
            <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.04] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0 border border-white/10">
                  {qrPreviewFailed ? (
                    <QrCode className="w-6 h-6 text-zinc-400" />
                  ) : (
                    <img
                      src={PAYMENT_CONFIG.qrCodeImage}
                      alt="CASYUM Payment QR Code"
                      loading="eager"
                      className="w-full h-full object-contain"
                      onError={() => {
                        setQrPreviewFailed(true);
                        console.error('Failed to load payment QR image:', PAYMENT_CONFIG.qrCodeImage);
                      }}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <span className="text-xs font-bold text-emerald-300">
                    QR image is managed from the project public folder.
                  </span>
                  <span className="text-[10px] text-white/50 break-all">
                    Current QR path: {PAYMENT_CONFIG.qrCodeImage}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrPreviewOpen((v) => !v)}
                className="w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 text-xs font-bold text-white/70 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {qrPreviewOpen ? (
                  <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{qrPreviewOpen ? 'Hide QR Preview' : 'Preview QR'}</span>
              </button>
              {qrPreviewOpen && (
                <div className="rounded-xl bg-white p-4 flex items-center justify-center">
                  {qrPreviewFailed ? (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        Payment QR code is currently unavailable. Please use the bank payment details or contact
                        CASYUM management.
                      </span>
                    </div>
                  ) : (
                    <img
                      src={PAYMENT_CONFIG.qrCodeImage}
                      alt="CASYUM Payment QR Code"
                      className="max-h-64 object-contain"
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* UPI ID */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50 flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5 text-emerald-400" />
              <span>UPI ID</span>
            </label>
            <input
              type="text"
              value={form.upiId}
              onChange={(e) => update({ upiId: e.target.value })}
              placeholder="e.g. casyum@okicici"
              className={inputClass}
            />
          </div>
        </div>

        {/* Bank Transfer Details */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-sky-400" />
            <span>Bank Transfer Details</span>
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Bank Name</span>
            </label>
            <input
              type="text"
              value={form.bankName}
              onChange={(e) => update({ bankName: e.target.value })}
              placeholder="e.g. State Bank of India"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-white/50">Account Holder Name</label>
            <input
              type="text"
              value={form.accountName}
              onChange={(e) => update({ accountName: e.target.value })}
              placeholder="e.g. CASYUM 2K26 Event Account"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/50 flex items-center gap-2">
                <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                <span>Account Number</span>
              </label>
              <input
                type="text"
                value={form.accountNumber}
                onChange={(e) => update({ accountNumber: e.target.value })}
                placeholder="Account number"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-white/50 flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-sky-400" />
                <span>IFSC Code</span>
              </label>
              <input
                type="text"
                value={form.ifsc}
                onChange={(e) => update({ ifsc: e.target.value.toUpperCase() })}
                placeholder="e.g. SBIN0001234"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="p-6 rounded-3xl bg-zinc-950/60 border border-white/10 backdrop-blur-md flex flex-col gap-5 lg:col-span-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Payment Instructions</span>
          </h3>
          <textarea
            value={form.paymentInstructions}
            onChange={(e) => update({ paymentInstructions: e.target.value })}
            rows={4}
            placeholder="Instructions shown above the payment form, e.g. 'Make the payment via the QR code or UPI ID below, then upload your transaction screenshot.'"
            className={`${inputClass} resize-none`}
          />
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              These details are displayed to every participant on the event payment form before they submit their
              payment proof.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
