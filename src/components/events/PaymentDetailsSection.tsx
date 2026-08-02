import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  CheckCircle2,
  X,
  FileText,
  Loader2,
  AlertCircle,
  RefreshCw,
  CircleDollarSign,
} from 'lucide-react';
import {
  validatePaymentProofFile,
  isPaymentProofImage,
  isPaymentProofPdf,
  formatFileSize,
  validateTransactionId,
  PAYMENT_METHODS,
} from '../../services/paymentProofService';

export interface PaymentFormData {
  payment_method: string;
  transaction_id: string;
  file: File;
}

interface PaymentDetailsSectionProps {
  eventName: string;
  fee: number;
  isSubmitting: boolean;
  uploadProgress: number | null;
  error: string;
  onCancel: () => void;
  onSubmit: (payment: PaymentFormData) => void;
}

const methodStyles: Record<string, string> = {
  upi: 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/30 text-emerald-300',
  bank_transfer: 'from-sky-500/15 to-sky-500/5 border-sky-500/30 text-sky-300',
  other: 'from-violet-500/15 to-violet-500/5 border-violet-500/30 text-violet-300',
};

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-violet-500/50 transition-all font-sans text-white placeholder-white/30';

export const PaymentDetailsSection: React.FC<PaymentDetailsSectionProps> = ({
  eventName,
  fee,
  isSubmitting,
  uploadProgress,
  error,
  onCancel,
  onSubmit,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [transactionId, setTransactionId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ method?: string; transactionId?: string; file?: string }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploading = uploadProgress !== null;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(
    (selected: File | null) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFieldErrors((prev) => ({ ...prev, file: undefined }));
      if (!selected) {
        setFile(null);
        setPreviewUrl(null);
        return;
      }
      try {
        validatePaymentProofFile(selected);
        setFile(selected);
        setPreviewUrl(URL.createObjectURL(selected));
      } catch (err) {
        setFile(null);
        setPreviewUrl(null);
        setFieldErrors((prev) => ({
          ...prev,
          file: err instanceof Error ? err.message : 'Invalid payment proof file.',
        }));
      }
    },
    [previewUrl]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { method?: string; transactionId?: string; file?: string } = {};
    if (!paymentMethod) errors.method = 'Please select a payment method.';
    const txnError = validateTransactionId(transactionId);
    if (txnError) errors.transactionId = txnError;
    try {
      validatePaymentProofFile(file);
    } catch (err) {
      errors.file = err instanceof Error ? err.message : 'Please upload a payment proof.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !file) return;
    onSubmit({
      payment_method: paymentMethod,
      transaction_id: transactionId.trim(),
      file,
    });
  };

  const fileKind: 'image' | 'pdf' | 'none' =
    file && previewUrl
      ? isPaymentProofPdf(file.type) || file.type === '' && file.name.toLowerCase().endsWith('.pdf')
        ? 'pdf'
        : isPaymentProofImage(file.type)
          ? 'image'
          : 'none'
      : 'none';

  return (
    <div className="rounded-3xl border border-violet-500/30 bg-gradient-to-br from-violet-500/[0.07] via-white/[0.02] to-cyan-500/[0.03] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Payment Details</span>
          <h3 className="text-sm font-extrabold font-display text-white">Register for {eventName}</h3>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-bold">
          <CircleDollarSign className="w-3.5 h-3.5" />
          ₹{Number(fee) || 0}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* Registration fee (read-only, auto-loaded) */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Registration Fee</label>
          <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-emerald-300 font-bold flex items-center gap-2">
            <CircleDollarSign className="w-4 h-4 text-emerald-400" />
            ₹{Number(fee) || 0}
            <span className="text-[10px] font-normal text-white/40 ml-auto">non-refundable</span>
          </div>
        </div>

        {/* Payment method */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Payment Method</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setPaymentMethod(m.value)}
                className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer bg-gradient-to-br ${
                  paymentMethod === m.value
                    ? methodStyles[m.value]
                    : 'from-white/[0.02] to-white/[0.01] border-white/10 text-white/50 hover:text-white/80 hover:border-white/25'
                }`}
              >
                <span className="text-xs font-bold">{m.label}</span>
                <span className="text-[9px] text-white/40">{m.description}</span>
              </button>
            ))}
          </div>
          {fieldErrors.method && <span className="text-[10px] text-rose-400 px-1">{fieldErrors.method}</span>}
        </div>

        {/* Transaction ID */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">
            Transaction ID / UTR
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

        {/* Payment proof upload */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-white/50">Payment Proof</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          />

          {file && previewUrl ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-black flex items-center justify-center shrink-0">
                {fileKind === 'pdf' ? (
                  <FileText className="w-6 h-6 text-rose-400" />
                ) : (
                  <img src={previewUrl} alt="Payment proof preview" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate">{file.name}</span>
                <span className="text-[10px] text-white/50">{formatFileSize(file.size)}</span>
                {fileKind === 'pdf' ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 w-fit"
                  >
                    Open PDF
                  </a>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Payment proof uploaded successfully
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Replace file"
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleFileSelect(null)}
                  title="Remove file"
                  className="p-2 rounded-lg bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-white/15 hover:border-violet-500/50 bg-white/[0.02] p-6 flex flex-col items-center gap-2 text-white/50 hover:text-white transition-all cursor-pointer"
            >
              <UploadCloud className="w-6 h-6 text-violet-400" />
              <span className="text-xs font-bold">Click to upload payment proof</span>
              <span className="text-[10px] text-white/40">JPG, JPEG, PNG, WEBP or PDF · Max 5 MB</span>
            </button>
          )}
          {fieldErrors.file && <span className="text-[10px] text-rose-400 px-1">{fieldErrors.file}</span>}
        </div>

        {/* Upload progress */}
        {uploading && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-xs text-white/70">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-400" />
              <span>Uploading payment proof... {uploadProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-200"
                style={{ width: `${uploadProgress ?? 0}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
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
            disabled={isSubmitting || uploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting || uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {uploading ? `Uploading ${uploadProgress}%...` : 'Submitting...'}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Payment & Register
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
