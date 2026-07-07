/**
 * The single classifier for the contact-hour / RSI ledger — the #1 accreditation asset.
 *
 * CONTACT = live faculty lectures (L1) + faculty-led RSI (L2: moderated discussion, published
 * feedback, graded assessment). ENGAGEMENT = self-directed activity (AI tutor, content views)
 * that must NEVER be counted as contact. Keeping this in one place means a leak of, say, an
 * AI-tutor event into contact hours is a single, auditable line — not scattered logic.
 */

export type EventClass = 'contact' | 'engagement' | 'other';

/** DomainEvent types that count as faculty CONTACT (L1 + L2). */
export const CONTACT_EVENT_TYPES: ReadonlySet<string> = new Set([
  'live.attended', // L1 — live lecture attendance (or recording view)
  'discussion.posted', // L2 — instructor-moderated discussion
  'feedback.published', // L2 — faculty feedback
  'assessment.graded', // L2 — faculty grading
]);

/** DomainEvent types that are academic ENGAGEMENT, explicitly NOT contact. */
export const ENGAGEMENT_EVENT_TYPES: ReadonlySet<string> = new Set([
  'aitutor.interaction',
  'module.viewed',
  'content.viewed',
]);

export function classifyEvent(eventType: string): EventClass {
  if (CONTACT_EVENT_TYPES.has(eventType)) return 'contact';
  if (ENGAGEMENT_EVENT_TYPES.has(eventType)) return 'engagement';
  return 'other';
}

export function isContactEvent(eventType: string): boolean {
  return CONTACT_EVENT_TYPES.has(eventType);
}
