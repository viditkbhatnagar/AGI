import { AgiUtahDomainEvent } from '../models/domainEvent';
import { classifyEvent } from '../lib/contactClassification';

/**
 * Builds the contact-hour / RSI ledger projection for a student by classifying their domain
 * events. CONTACT = live attendance + faculty RSI; ENGAGEMENT (AI tutor, content views) is
 * reported separately and never as contact. Event counts are the projection; precise hour
 * attribution is layered on with the delivery-model hour maps. Read-only.
 */
export interface ContactLedger {
  contactEvents: number;
  engagementEvents: number;
  byType: Record<string, number>;
}

export async function computeContactLedger(studentRef: string, courseCode?: string): Promise<ContactLedger> {
  const events = await AgiUtahDomainEvent.find({ 'subjects.ref': studentRef }).lean();

  let contactEvents = 0;
  let engagementEvents = 0;
  const byType: Record<string, number> = {};

  for (const event of events) {
    if (courseCode) {
      const matchesCourse =
        Array.isArray(event.subjects) &&
        event.subjects.some((s) => s.kind === 'course' && s.ref === courseCode);
      if (!matchesCourse) continue;
    }

    const eventClass = classifyEvent(event.eventType);
    if (eventClass === 'contact') contactEvents += 1;
    else if (eventClass === 'engagement') engagementEvents += 1;

    byType[event.eventType] = (byType[event.eventType] ?? 0) + 1;
  }

  return { contactEvents, engagementEvents, byType };
}
