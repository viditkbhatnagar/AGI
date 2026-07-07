import { describe, it, expect } from 'vitest';
import { computePrice, installmentsApplyToTier } from './pricing';

describe('computePrice', () => {
  it('defaults to list price with a 10% deposit cap', () => {
    const p = computePrice({ listTuitionUsd: 8000, applicationFeeUsd: 60 });
    expect(p.effectiveTuitionUsd).toBe(8000);
    expect(p.applicationFeeUsd).toBe(60);
    expect(p.depositCapUsd).toBe(800);
  });

  it('applies a percent-off promo', () => {
    const p = computePrice({ listTuitionUsd: 8000, applicationFeeUsd: 60, promo: { percentOff: 0.15 } });
    expect(p.effectiveTuitionUsd).toBe(6800);
    expect(p.depositCapUsd).toBe(680);
  });

  it('applies a flat amount-off promo', () => {
    const p = computePrice({ listTuitionUsd: 4500, applicationFeeUsd: 60, promo: { amountOff: 500 } });
    expect(p.effectiveTuitionUsd).toBe(4000);
  });
});

describe('installmentsApplyToTier', () => {
  it('applies to diploma and MBA, not certificate', () => {
    expect(installmentsApplyToTier('mba')).toBe(true);
    expect(installmentsApplyToTier('diploma')).toBe(true);
    expect(installmentsApplyToTier('certificate')).toBe(false);
  });
});
