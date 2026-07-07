import { describe, it, expect } from 'vitest';
import { evaluateInactivity } from './inactivity';

const now = new Date(Date.UTC(2026, 9, 30));
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

describe('evaluateInactivity', () => {
  it('takes no action before 14 days', () => {
    expect(evaluateInactivity(daysAgo(10), now).action).toBe('none');
  });

  it('warns at 14 days', () => {
    const r = evaluateInactivity(daysAgo(14), now);
    expect(r.daysInactive).toBe(14);
    expect(r.action).toBe('warn');
  });

  it('withdraws at 21 days', () => {
    expect(evaluateInactivity(daysAgo(21), now).action).toBe('withdraw');
    expect(evaluateInactivity(daysAgo(30), now).action).toBe('withdraw');
  });
});
