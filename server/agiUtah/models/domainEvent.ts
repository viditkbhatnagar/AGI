import mongoose, { Schema, Document, Model } from 'mongoose';
import type { EntityRef } from '../types';

/**
 * Append-only audit / compliance event log for the AGI Utah module.
 *
 * Every compliance-relevant action (enrollment, grade posted, credential issued, live
 * attendance, SAP change, …) is recorded here. The contact-hour / RSI ledger and the
 * accreditation reports are all built by querying these events — so this log is the
 * backbone the rest of the module depends on.
 *
 * Isolated: uses the dedicated `agiutah_domain_events` collection and never touches any
 * existing collection.
 */
export interface IAgiUtahDomainEvent {
  eventType: string;
  actor?: EntityRef;
  subjects: EntityRef[];
  payload: Record<string, unknown>;
  occurredAt: Date;
}

export interface IAgiUtahDomainEventDocument extends IAgiUtahDomainEvent, Document {}

const EntityRefSchema = new Schema<EntityRef>(
  {
    kind: { type: String, required: true },
    ref: { type: String, required: true },
  },
  { _id: false },
);

const AgiUtahDomainEventSchema = new Schema<IAgiUtahDomainEventDocument>(
  {
    eventType: { type: String, required: true, index: true },
    actor: { type: EntityRefSchema, required: false },
    subjects: { type: [EntityRefSchema], default: [] },
    payload: { type: Schema.Types.Mixed, default: {} },
    occurredAt: { type: Date, required: true, default: () => new Date(), index: true },
  },
  { timestamps: true, collection: 'agiutah_domain_events' },
);

// Guarded registration prevents OverwriteModelError on repeated imports (e.g. dev hot reload).
export const AgiUtahDomainEvent: Model<IAgiUtahDomainEventDocument> =
  (mongoose.models.AgiUtahDomainEvent as Model<IAgiUtahDomainEventDocument>) ||
  mongoose.model<IAgiUtahDomainEventDocument>('AgiUtahDomainEvent', AgiUtahDomainEventSchema);
