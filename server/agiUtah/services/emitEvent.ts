import { z } from 'zod';
import { AgiUtahDomainEvent, type IAgiUtahDomainEvent } from '../models/domainEvent';

const entityRefSchema = z.object({
  kind: z.string().min(1),
  ref: z.string().min(1),
});

const emitEventInputSchema = z.object({
  eventType: z.string().min(1),
  actor: entityRefSchema.optional(),
  subjects: z.array(entityRefSchema).optional(),
  payload: z.record(z.unknown()).optional(),
  occurredAt: z.date().optional(),
});

export type EmitEventInput = z.infer<typeof emitEventInputSchema>;

/**
 * Append a single event to the AGI Utah audit log.
 *
 * Validates its input, then writes one document to `agiutah_domain_events`. This is the
 * ONLY supported way to write the event log — the log is append-only, so there are no
 * update or delete helpers.
 *
 * Throws if validation or the write fails; callers must not silently swallow the error,
 * because these events are compliance evidence.
 */
export async function emitEvent(input: EmitEventInput): Promise<IAgiUtahDomainEvent> {
  const parsed = emitEventInputSchema.parse(input);

  const created = await AgiUtahDomainEvent.create({
    eventType: parsed.eventType,
    actor: parsed.actor,
    subjects: parsed.subjects ?? [],
    payload: parsed.payload ?? {},
    occurredAt: parsed.occurredAt ?? new Date(),
  });

  return created.toObject();
}
