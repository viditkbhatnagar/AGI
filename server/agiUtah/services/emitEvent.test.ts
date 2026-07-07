import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the model so the test never touches a database.
vi.mock('../models/domainEvent', () => ({
  AgiUtahDomainEvent: {
    create: vi.fn(async (doc: Record<string, unknown>) => ({ toObject: () => doc })),
  },
}));

import { emitEvent } from './emitEvent';
import { AgiUtahDomainEvent } from '../models/domainEvent';

const createMock = vi.mocked(AgiUtahDomainEvent.create);

describe('emitEvent', () => {
  beforeEach(() => {
    createMock.mockClear();
  });

  it('writes one event and defaults subjects/payload/occurredAt', async () => {
    const result = await emitEvent({ eventType: 'enrollment.completed' });

    expect(createMock).toHaveBeenCalledTimes(1);
    const written = createMock.mock.calls[0][0] as Record<string, unknown>;
    expect(written.eventType).toBe('enrollment.completed');
    expect(written.subjects).toEqual([]);
    expect(written.payload).toEqual({});
    expect(written.occurredAt).toBeInstanceOf(Date);
    expect(result.eventType).toBe('enrollment.completed');
  });

  it('preserves actor, subjects and payload', async () => {
    await emitEvent({
      eventType: 'grade.posted',
      actor: { kind: 'faculty', ref: 'f-1' },
      subjects: [{ kind: 'student', ref: 's-1' }],
      payload: { courseCode: 'CR01', grade: 'B-' },
    });

    const written = createMock.mock.calls[0][0] as Record<string, unknown>;
    expect(written.actor).toEqual({ kind: 'faculty', ref: 'f-1' });
    expect(written.subjects).toEqual([{ kind: 'student', ref: 's-1' }]);
    expect(written.payload).toEqual({ courseCode: 'CR01', grade: 'B-' });
  });

  it('rejects invalid input before writing (empty eventType)', async () => {
    await expect(emitEvent({ eventType: '' })).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed subject ref', async () => {
    await expect(
      emitEvent({ eventType: 'x', subjects: [{ kind: 'student', ref: '' }] }),
    ).rejects.toThrow();
    expect(createMock).not.toHaveBeenCalled();
  });
});
