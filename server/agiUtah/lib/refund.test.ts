import { describe, it, expect } from 'vitest';
import { calculateRefund, refundDueBy, REFUND_DUE_WITHIN_DAYS } from './refund';

describe('refundDueBy', () => {
  it('is 30 days after the request', () => {
    const requestedAt = new Date(Date.UTC(2026, 8, 1));
    const due = refundDueBy(requestedAt);
    const days = (due.getTime() - requestedAt.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(REFUND_DUE_WITHIN_DAYS);
    expect(REFUND_DUE_WITHIN_DAYS).toBe(30);
  });
});

const fees = { tuitionCharged: 1000, applicationFee: 100, deposit: 100 };

describe('calculateRefund', () => {
  it('phase 1: refunds the unearned tuition pro-rata', () => {
    const r = calculateRefund({ ...fees, percentCompleted: 0.5 });
    expect(r.phase).toBe(1);
    expect(r.tuitionRefund).toBe(500);
    expect(r.totalRefund).toBe(500);
  });

  it('phase 2 (>=75% complete): no tuition refund', () => {
    const r = calculateRefund({ ...fees, percentCompleted: 0.8 });
    expect(r.phase).toBe(2);
    expect(r.tuitionRefund).toBe(0);
  });

  it('treats exactly the 75% boundary as phase 2', () => {
    expect(calculateRefund({ ...fees, percentCompleted: 0.75 }).phase).toBe(2);
  });

  it('never refunds the application fee or deposit', () => {
    const r = calculateRefund({ ...fees, percentCompleted: 0 });
    expect(r.applicationFeeRefund).toBe(0);
    expect(r.depositRefund).toBe(0);
    expect(r.tuitionRefund).toBe(1000);
  });
});
