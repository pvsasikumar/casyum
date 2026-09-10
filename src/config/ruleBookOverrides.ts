/**
 * Event-specific Rule Book overrides.
 *
 * Maps event slugs to their own Rule Book PDF URLs. These override the
 * global CASYUM Rule Book for the listed events. Each entry is independent
 * so different events can link to different PDFs without affecting others.
 */

export const RULE_BOOK_URL =
  'https://drive.google.com/file/d/1Gxf-SmDjmwTyLCv0AphnoNHZKvBERZ8-/view?usp=drivesdk';

/** Slug → Rule Book URL mapping for per-event overrides. */
export const EVENT_RULE_BOOK_OVERRIDES: Record<string, string> = {
  'paper-presentation': RULE_BOOK_URL,
  'tech-quiz': RULE_BOOK_URL,
};
