import { describe, it, expect } from 'vitest';
import { computeBillingSchedule, progressByCredits } from './billing';

describe('progressByCredits', () => {
  it('computes progress from credit hours', () => {
    expect(progressByCredits(24, 48)).toBe(0.5);
    expect(progressByCredits(0, 48)).toBe(0);
    expect(progressByCredits(48, 48)).toBe(1);
  });

  it('is 0 when total is zero', () => {
    expect(progressByCredits(0, 0)).toBe(0);
  });
});

describe('computeBillingSchedule', () => {
  it('bills in four 25% increments unlocked by progress', () => {
    expect(computeBillingSchedule({ totalTuition: 4000, progressFraction: 0 }).quartersDue).toBe(1);
    expect(computeBillingSchedule({ totalTuition: 4000, progressFraction: 0.25 }).quartersDue).toBe(2);
    expect(computeBillingSchedule({ totalTuition: 4000, progressFraction: 0.5 }).quartersDue).toBe(3);
    expect(computeBillingSchedule({ totalTuition: 4000, progressFraction: 0.75 }).quartersDue).toBe(4);
    expect(computeBillingSchedule({ totalTuition: 4000, progressFraction: 1 }).quartersDue).toBe(4);
  });

  it('computes amounts due and remaining', () => {
    const s = computeBillingSchedule({ totalTuition: 4000, progressFraction: 0.5 });
    expect(s.quarterAmount).toBe(1000);
    expect(s.amountDue).toBe(3000);
    expect(s.amountRemaining).toBe(1000);
  });
});
