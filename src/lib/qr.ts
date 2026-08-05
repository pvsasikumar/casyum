/**
 * QR payload encoding, decoding and normalization for CASYUM.
 *
 * QR generation itself is delegated to the `qrcode` npm package (see
 * `ParticipantQRCard`). This module only owns the *payload contract*:
 *
 *   - New participant passes encode exactly the stable CASYUM id — e.g.
 *     `CAS-02`. Never PII (name, email, phone, college, department), never a
 *     Firebase Auth UID, never payment/verification data, never JSON.
 *   - The shared parser still accepts legacy payloads so previously printed
 *     QRs keep working:
 *       - `CAS-02`                                (canonical, current)
 *       - `CASYUM:PARTICIPANT:CAS-02`             (previous canonical)
 *       - `CASYUM:REG:REG-25` / `CASYUM:REG:CAS-02` (legacy registration tokens)
 *       - `casyum:reg:REG-25`, `casyum://checkin/<id>`
 *       - `REG-25`                                (legacy bare registration id)
 *       - base64 `{participantId,...}`            (legacy check-in payload)
 *   - The same parser and normalizer run for BOTH camera scans and manual
 *     CASYUM id entry, so the two paths always resolve to the same participant.
 */

export const QR_PREFIX = 'casyum:reg:';
export const QR_PREFIX_REG = 'CASYUM:REG:';
export const QR_PREFIX_PARTICIPANT = 'CASYUM:PARTICIPANT:';
export const QR_URI_PREFIX = 'casyum://checkin/';

const REG_PREFIX_LEN = QR_PREFIX.length;
const PARTICIPANT_PREFIX_LEN = QR_PREFIX_PARTICIPANT.length;
const URI_PREFIX_LEN = QR_URI_PREFIX.length;

/**
 * Normalize a registration/participant identifier extracted from a QR payload
 * or pasted token.
 *
 * CASYUM registration ids are of the form `REG-<number>` with NO fixed digit
 * count and NO year embedded (e.g. `REG-22`, `REG-23`, `REG-24`). The id is
 * never padded, re-formatted or re-generated — only surrounding whitespace is
 * trimmed and a lower/mixed-case `REG-` prefix is canonicalized to uppercase
 * so the value matches what is stored in Firestore (the stored ids are never
 * rewritten).
 */
export function normalizeRegistrationId(id: string): string {
  const trimmed = String(id || '').trim();
  if (!trimmed) return '';
  return /^reg-/i.test(trimmed) ? trimmed.replace(/^reg-/i, 'REG-') : trimmed;
}

/**
 * Build the QR payload for a participant pass.
 *
 * The payload is the participant's stable CASYUM id and nothing else
 * (`CAS-02`). The id is resolved to the full participant profile server-side
 * after scanning via `participants where casyum_id == "CAS-02"` — the QR data
 * is never trusted. Only surrounding whitespace is trimmed.
 */
export function encodeParticipantQR(identifier: string): string {
  return String(identifier || '').trim();
}

/** True when the payload is a participant-id QR (`CASYUM:PARTICIPANT:...`). */
export function isParticipantPrefixed(data: string): boolean {
  return String(data || '').toLowerCase().startsWith('casyum:participant:');
}

/**
 * Extract the value from a participant-id QR payload
 * (`CASYUM:PARTICIPANT:<casyumId>`, e.g. `CASYUM:PARTICIPANT:CAS-01`). Returns
 * null for every other payload format so callers never route a registration
 * token through this path.
 */
export function decodeParticipantQR(data: string): string | null {
  const raw = String(data || '').trim();
  if (!isParticipantPrefixed(raw)) return null;
  const id = raw.slice(PARTICIPANT_PREFIX_LEN).trim();
  return id || null;
}

export function decodeQRPayload(data: string): string | null {
  const raw = String(data || '').trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  if (lower.startsWith('casyum:participant:')) {
    return decodeParticipantQR(raw);
  }

  if (lower.startsWith('casyum:reg:')) {
    const id = raw.slice(REG_PREFIX_LEN).trim();
    return normalizeRegistrationId(id) || null;
  }

  if (lower.startsWith('casyum://checkin/')) {
    const id = raw.slice(URI_PREFIX_LEN).trim();
    return normalizeRegistrationId(id) || null;
  }

  try {
    const decoded = atob(raw);
    if (decoded.startsWith('{')) {
      const parsed = JSON.parse(decoded) as { participantId?: string };
      if (parsed && parsed.participantId) return normalizeRegistrationId(String(parsed.participantId));
    }
  } catch {
    // Not a base64 payload — fall through to treating it as a bare id.
  }

  return normalizeRegistrationId(raw);
}

/** Zero-width / invisible characters injected around QR payloads by some
 * encoders (BOM, soft hyphens, word-joiner, zero-width space/joiner/non-joiner). */
const QR_INVISIBLE_CHARS =
  /\u200B|\u200C|\u200D|\u2060|\u2061|\u2062|\u2063|\uFEFF/g;
/** Line separators / carriage returns embedded by some QR encoders. */
const QR_LINE_BREAKS = /\r\n|[\r\n\u0085\u2028\u2029]+/g;

const CASYUM_PARTICIPANT_PREFIX = 'casyum:participant:';
const CASYUM_REG_PREFIX = 'casyum:reg:';
const CASYUM_URI_PREFIX = 'casyum://checkin/';

/**
 * Normalize a raw QR payload (or a pasted/manual token) into the canonical
 * CASYUM participant id form (`CAS-01`, `CAS-100`, ...).
 *
 * Handles — all case-insensitively:
 *   - `CAS-01`
 *   - `cas-01`
 *   - ` CAS-01 ` / `CAS-01\n` / trailing CR / zero-width / BOM characters
 *   - `CASYUM:PARTICIPANT:CAS-01` / `casyum:participant:cas-01`
 *   - `CASYUM:REG:CAS-01` (a CAS id carried by a legacy registration prefix)
 *   - `casyum://checkin/CAS-01` and nested prefixes
 *
 * The `CAS-` prefix is never stripped or rewritten and no new id is generated.
 * Returns null when the payload does not contain a valid CASYUM id
 * (`^CAS-\d+$`, so `CAS-100` / `CAS-800` remain valid). Legacy registration
 * tokens (`REG-*`, base64 payloads, raw document ids) are intentionally left
 * untouched so the registration-token fallback paths can still resolve them.
 */
export function normalizeCasyumQrValue(rawValue: unknown): string | null {
  let raw = String(rawValue ?? '');
  if (!raw) return null;

  // Remove hidden zero-width / BOM characters anywhere in the payload.
  raw = raw.replace(QR_INVISIBLE_CHARS, '');
  // Remove hidden line breaks and carriage returns, then trim whitespace.
  raw = raw.replace(QR_LINE_BREAKS, '').trim();
  if (!raw) return null;

  // Iteratively strip known prefixes so nested payloads
  // (`casyum://checkin/CASYUM:PARTICIPANT:CAS-01`) normalize in one pass and
  // any unknown `casyum:`-style prefix (e.g. `CASYUM:CAS-02`) cannot recurse
  // unbounded.
  let previous = '';
  while (previous !== raw) {
    const lower = raw.toLowerCase();
    previous = raw;
    if (lower.startsWith(CASYUM_PARTICIPANT_PREFIX)) {
      raw = raw.slice(CASYUM_PARTICIPANT_PREFIX.length).trim();
    } else if (lower.startsWith(CASYUM_REG_PREFIX)) {
      raw = raw.slice(CASYUM_REG_PREFIX.length).trim();
    } else if (lower.startsWith(CASYUM_URI_PREFIX)) {
      raw = raw.slice(CASYUM_URI_PREFIX.length).trim();
    } else if (/^casyum[:/]/i.test(raw.trim())) {
      // Unknown `casyum:...` / `casyum://...` prefix — there is no CASYUM id
      // to extract; stop instead of recursing forever.
      break;
    }
  }

  // Strip stray separators/artifacts left around the id.
  raw = raw.replace(/^[\s:]+/, '').trim();
  if (!raw) return null;

  const normalized = raw.toUpperCase();
  if (!/^CAS-\d+$/.test(normalized)) return null;
  return normalized;
}

export interface CasyumQRPayload {
  /** Cleaned raw payload (invisible characters removed, whitespace collapsed). */
  raw: string;
  /** Extracted CASYUM id with its prefix preserved, e.g. `CAS-02` (null when absent). */
  casyumId: string | null;
  /** Extracted registration id with its prefix preserved, e.g. `REG-25` (null when absent). */
  registrationId: string | null;
}

/**
 * Single shared QR payload parser used by BOTH camera scans and manual entry
 * (Registration Desk and Event Coordinator check-in).
 *
 * It removes invisible characters, normalizes line breaks and whitespace,
 * trims the value, then extracts the participant's CASYUM id (`CAS-02`) and
 * registration id (`REG-25`) case-insensitively. Prefixes are always preserved —
 * `CAS-02` is never reduced to `02` and `REG-25` is never reduced to `25`.
 *
 * Accepts (all case-insensitively):
 *   - `CAS-02`
 *   - `CAS-02, REG-25` / `CAS-02|REG-25` / `CAS-02 REG-25`
 *   - `CASYUM:CAS-02`
 *   - `CASYUM:PARTICIPANT:CAS-02` (legacy canonical payload)
 *   - `CASYUM:REG:CAS-02` / `CASYUM:REG:REG-25` (legacy prefixes)
 *   - `casyum://checkin/CAS-02`
 *   - payloads polluted with zero-width / BOM characters or line breaks
 *
 * A QR is never rejected merely because it carries both a CASYUM id and a
 * registration id. Callers apply the lookup priority themselves (CASYUM id,
 * then registration id, then legacy token fallback).
 */
export function parseCasyumQRPayload(rawValue: unknown): CasyumQRPayload {
  const cleaned = String(rawValue ?? '')
    .replace(QR_INVISIBLE_CHARS, '')
    .replace(QR_LINE_BREAKS, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const casyumMatch = /(CAS-\d+)/i.exec(cleaned);
  const regMatch = /\b(REG-\d+)/i.exec(cleaned);

  return {
    raw: cleaned,
    casyumId: casyumMatch ? casyumMatch[1].toUpperCase() : null,
    registrationId: regMatch ? regMatch[1].toUpperCase() : null,
  };
}
