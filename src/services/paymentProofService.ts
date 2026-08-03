/**
 * Trim whitespace and normalize a transaction ID/UTR for duplicate detection.
 * The original trimmed value is preserved for display; this normalized form is
 * only used for uniqueness comparisons.
 */
export function normalizeTransactionId(value: string): string {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Validate a transaction ID/UTR. Returns null when valid, otherwise a
 * human-readable error message. Rules: required, no leading/trailing
 * whitespace, 6-100 characters, and not made entirely of spaces.
 */
export function validateTransactionId(value: string): string | null {
  const raw = String(value || '');
  if (!raw.trim()) {
    return 'Please enter your Transaction ID / UTR number.';
  }
  if (raw !== raw.trim()) {
    return 'Please remove extra spaces before or after the Transaction ID.';
  }
  const normalized = normalizeTransactionId(raw);
  if (/^\s*$/.test(raw)) {
    return 'Transaction ID cannot contain only spaces.';
  }
  if (normalized.length < 6) {
    return 'Transaction ID must be at least 6 characters long.';
  }
  if (normalized.length > 100) {
    return 'Transaction ID cannot exceed 100 characters.';
  }
  return null;
}

export const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI', description: 'GPay, PhonePe, Paytm, BHIM, etc.' },
  { value: 'bank_transfer', label: 'Bank Transfer', description: 'NEFT / IMPS / RTGS' },
  { value: 'other', label: 'Other Digital Payment', description: 'Net banking, wallets, cards, etc.' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label || value || '—';
}
