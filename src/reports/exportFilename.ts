import type { ReportFilters } from './types';

function sanitize(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXTRA_FILTER_KEYS: Array<{ label: string; get: (f: ReportFilters) => string }> = [
  { label: 'Dept', get: (f) => f.department },
  { label: 'Year', get: (f) => f.year },
  { label: 'Payment', get: (f) => f.paymentStatus },
  { label: 'Verification', get: (f) => f.verificationStatus },
  { label: 'Attendance', get: (f) => f.attendanceStatus },
  { label: 'Type', get: (f) => f.eventType },
];

/** Builds e.g. CASYUM_Fine_Arts_Participants.xlsx / CASYUM_Participants.pdf */
export function buildExportFilename(
  eventName: string,
  filters: ReportFilters,
  extension: 'xlsx' | 'pdf'
): string {
  const parts: string[] = ['CASYUM'];
  const event = eventName ? sanitize(eventName) : '';
  if (event && event.toLowerCase() !== 'all events') {
    parts.push(event);
  } else if (!event) {
    parts.push('All Events');
  }

  // Short suffixes only when extra filters narrow the data.
  EXTRA_FILTER_KEYS.forEach(({ label, get }) => {
    const v = sanitize(get(filters));
    if (v && v.length <= 20) parts.push(`${label}-${v.replace(/ /g, '')}`);
  });

  let name = `${parts.join('_')}_Participants`;
  name = name.replace(/ /g, '_');
  if (name.length > 120) name = name.slice(0, 120);
  return `${name}.${extension}`;
}

export function triggerDownload(data: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
