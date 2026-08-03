import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  CircleDollarSign,
  Copy,
  Wallet,
  Landmark,
  CalendarDays,
} from 'lucide-react';
import {
  validateTransactionId,
  PAYMENT_METHODS,
} from '../../services/paymentProofService';
import {
  subscribePaymentSettings,
  type PaymentSettings,
} from '../../services/paymentSettingsService';
import { PAYMENT_CONFIG } from '../../config/paymentConfig';
import {
  calculateRegistrationFee,
  type EventSelectionLike,
} from '../../services/eventSelection';

export interface PaymentFormData {
  payment_method: string;
  transaction_id: string;
  payment_date: string;
}

interface PaymentDetailsSectionProps {
  eventName: string;
  fee: number;
  /** Optional fee breakdown for bundled selections (regular + gaming). */
  regularFee?: number;
  gamingFee?: number;
  /**
   * The currently selected events. When provided, the fee shown (registration
   * fee, payment breakdown and QR "Amount to Pay") is always derived from the
   * live selection through the shared `calculateRegistrationFee` utility so the
   * amount can never go stale or fall back to ₹0.
   */
  selectedEvents?: EventSelectionLike[];
  isSubmitting: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (payment: PaymentFormData) => void;
}

const methodStyles: Record<string, string> = {
  upi: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300',
  bank_transfer: 'from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-300',
  other: 'from-violet-500/15 to-violet-500/5 border-violet-500/30 text-violet-300',
};

const methodIdle =
  'from-white/[0.02] to-white/[0.01] border-white/10 text-white/50 hover:text-white/80 hover:border-white/25';

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30';

const labelClass = 'text-[10px] font-bold uppercase tracking-widest text-white/50';

export const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({
  eventName,
  fee,
  regularFee,
  gamingFee,
  selectedEvents,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [transactionId, setTransactionId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ method?: string; transactionId?: string }>({});
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrImageFailed, setQrImageFailed] = useState(false);

  const breakdown = useMemo(() => {
    if (!selectedEvents || selectedEvents.length === 0) return null;
    const b = calculateRegistrationFee(selectedEvents);
    if (b.total === 0) {
      console.error(
        '[CASYUM Payment] Selected events exist but the computed registration fee is 0. Inspect the event category/type data:',
        selectedEvents.map((e) => ({
          id: e.id ?? e.eventId,
          name: e.name ?? e.eventName,
          category: e.category,
          type: e.type,
          event_type: e.event_type,
          is_gaming: e.is_gaming,
        }))
      );
    }
    return b;
  }, [selectedEvents]);

  /**
   * A single source of truth for the amount owed. Every part of the checkout
   * (top chip, registration fee, payment breakdown, QR section, "Amount to
   * Pay", submit button) reads from this one value so the amount can never
   * differ between sections.
   */
  const totalAmount = breakdown ? breakdown.total : Number(fee) || 0;
  const displayRegularFee = breakdown ? breakdown.regularFee : Number(regularFee) || 0;
  const displayGamingFee = breakdown ? breakdown.gamingFee : Number(gamingFee) || 0;
  const hasBreakdown = displayRegularFee > 0 || displayGamingFee > 0;

  useEffect(() => {
    const unsubscribe = subscribePaymentSettings(
      (settings) => setPaymentSettings(settings),
      () => {
        // Payment settings are optional; hide the instructions panel when unreadable.
      }
    );
    return unsubscribe;
  }, []);

  const copyText = useCallback(async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const el = document.createElement('textarea');
      el.value = value;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopiedField(label);
    window.setTimeout(() => setCopiedField(null), 1500);
  }, []);

  const hasInstructions = Boolean(paymentSettings?.paymentInstructions);
  const hasUpiId = Boolean(paymentSettings?.upiId);
  const hasBankDetails = Boolean(
    paymentSettings &&
      (paymentSettings.bankName ||
        paymentSettings.accountName ||
        paymentSettings.accountNumber ||
        paymentSettings.ifsc)
  );

  const handleQrImageError = () => {
    setQrImageFailed(true);
    console.error('Failed to load payment QR image:', PAYMENT_CONFIG.qrCodeImage);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { method?: string; transactionId?: string } = {};
    if (!paymentMethod) errors.method = 'Please select a payment method.';
    const txnError = validateTransactionId(transactionId);
    if (txnError) errors.transactionId = txnError;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    onSubmit({
      payment_method: paymentMethod,
      transaction_id: transactionId.trim(),
      payment_date: paymentDate.trim(),
    });
  };

  return (
    <div className="payment-modal w-full max-w-[900px] mx-auto rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.08] via-[#151021] to-cyan-500/[0.04] p-5 sm:p-6 lg:p-7 shadow-2xl shadow-violet-500/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Payment Details</span>
          <h3 className="text-base sm:text-lg font-extrabold font-display text-white">Register for {eventName}</h3>
        </div>
        <span className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-sm font-extrabold">
          <CircleDollarSign className="w-4 h-4" />
          ₹{totalAmount}
        </span>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="payment-layout grid grid-cols-1 lg:grid-cols-[minmax(360px,1fr)_minmax(320px,0.9fr)] gap-6 lg:gap-7"
      >
        {/* ============ LEFT COLUMN: amount, breakdown, QR ============ */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Total Amount */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Total Amount</label>
            <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 flex items-center gap-2">
              <CircleDollarSign className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="text-xl font-extrabold font-display text-emerald-300">₹{totalAmount}</span>
              <span className="text-[10px] font-normal text-white/40 ml-auto">non-refundable</span>
            </div>
          </div>

          {/* Payment breakdown */}
          {hasBreakdown && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-col gap-1.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/40">Payment Breakdown</span>
              {displayRegularFee > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Regular Events (1–3)</span>
                  <span className="text-emerald-300 font-bold">₹{displayRegularFee}</span>
                </div>
              )}
              {displayGamingFee > 0 && (
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60">Gaming Event</span>
                  <span className="text-emerald-300 font-bold">₹{displayGamingFee}</span>
                </div>
              )}
              <div className="h-px bg-white/10" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white">Total Amount</span>
                <span className="font-extrabold text-emerald-300">₹{totalAmount}</span>
              </div>
            </div>
          )}

          {/* Scan to Pay */}
          {paymentMethod === 'upi' && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400">Scan to Pay</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {qrImageFailed ? (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>Payment QR could not be loaded. Please contact the event administration.</span>
                </div>
              ) : (
                <div className="flex justify-center">
                  <div className="w-full max-w-[min(85vw,340px)] md:max-w-[340px] lg:max-w-[360px] aspect-square rounded-2xl bg-white p-5 border border-white/10 shadow-lg shadow-emerald-500/10 flex items-center justify-center">
                    <img
                      src={PAYMENT_CONFIG.qrCodeImage}
                      alt="CASYUM Payment QR Code"
                      loading="eager"
                      onError={handleQrImageError}
                      className="w-full h-full object-contain aspect-square"
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-white/70 text-center">Scan the QR code using any supported payment app</p>
              <div className="flex items-center justify-center gap-1.5 text-sm font-extrabold font-display text-emerald-300">
                <span>Amount to Pay:</span>
                <span>₹{totalAmount}</span>
              </div>

              {hasUpiId && (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-3 h-3 text-emerald-400" />
                      UPI ID
                    </span>
                    <span className="text-xs font-bold text-white truncate">{paymentSettings?.upiId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyText(paymentSettings?.upiId || '', 'upi')}
                    className="flex items-center gap-1 text-[10px] font-bold text-violet-400 hover:text-violet-300 transition-colors cursor-pointer"
                  >
                    {copiedField === 'upi' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copiedField === 'upi' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============ RIGHT COLUMN: instructions, method, txn, date, submit ============ */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* How to Pay instructions */}
          {hasInstructions && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">How to Pay</span>
              <p className="text-xs text-white/70 leading-relaxed whitespace-pre-line">
                {paymentSettings?.paymentInstructions}
              </p>
            </div>
          )}

          {/* Payment method */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Payment Method</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPaymentMethod(m.value)}
                  className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left cursor-pointer bg-gradient-to-br transition-[border-color,background-color,transform] duration-[180ms] ${
                    paymentMethod === m.value
                      ? methodStyles[m.value]
                      : `${methodIdle} hover:-translate-y-0.5`
                  }`}
                >
                  <span className="text-xs font-bold">{m.label}</span>
                  <span className="text-[9px] text-white/40">{m.description}</span>
                </button>
              ))}
            </div>
            {fieldErrors.method && <span className="text-[10px] text-rose-400 px-1">{fieldErrors.method}</span>}
          </div>

          {/* Bank transfer details */}
          {hasBankDetails && (
            <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark className="w-3 h-3 text-sky-400" />
                Bank Transfer (NEFT / IMPS / RTGS)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {paymentSettings?.bankName && (
                  <span className="text-white/70">
                    <span className="text-white/40">Bank:</span> {paymentSettings.bankName}
                  </span>
                )}
                {paymentSettings?.accountName && (
                  <span className="text-white/70">
                    <span className="text-white/40">Account:</span> {paymentSettings.accountName}
                  </span>
                )}
                {paymentSettings?.accountNumber && (
                  <span className="text-white/70 flex items-center gap-1.5">
                    <span className="text-white/40">A/c No:</span> {paymentSettings.accountNumber}
                    <button
                      type="button"
                      onClick={() => copyText(paymentSettings?.accountNumber || '', 'acct')}
                      className="text-violet-400 hover:text-violet-300 cursor-pointer"
                      title="Copy account number"
                    >
                      {copiedField === 'acct' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </span>
                )}
                {paymentSettings?.ifsc && (
                  <span className="text-white/70">
                    <span className="text-white/40">IFSC:</span> {paymentSettings.ifsc}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Transaction ID */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Transaction ID / UTR <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => {
                setTransactionId(e.target.value);
                if (fieldErrors.transactionId) setFieldErrors((f) => ({ ...f, transactionId: undefined }));
              }}
              placeholder="e.g. 412345678901 or UTR123456789"
              maxLength={100}
              className={`${inputClass} ${fieldErrors.transactionId ? 'border-rose-500/60' : ''}`}
            />
            {fieldErrors.transactionId && (
              <span className="text-[10px] text-rose-400 px-1">{fieldErrors.transactionId}</span>
            )}
          </div>

          {/* Payment Date (optional) */}
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>
              Payment Date <span className="text-white/30 normal-case font-normal">(optional)</span>
            </label>
            <div className="relative">
              <CalendarDays className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={paymentDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
            <span className="text-[10px] text-white/40 px-1">When did you make the payment? (if known)</span>
          </div>

          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              Submit Payment & Register
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-extrabold">
                ₹{totalAmount}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
