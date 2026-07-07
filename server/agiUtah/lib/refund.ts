/**
 * Two-phase pro-rata refund calculation. Pure and unit-tested.
 *
 * Rules from the catalog: the application fee is always non-refundable and itemized; the
 * first-term deposit is non-refundable (and is separately capped at ≤10% of first-term
 * tuition). Tuition is refunded pro-rata by Percentage Completed until a phase boundary
 * (default 75%), after which no tuition is refunded.
 *
 * All monetary inputs are placeholders until Logan sends the approved fee schedule; the
 * calculation is what matters and will pick up the real numbers as data.
 */

export const REFUND_PHASE_BOUNDARY = 0.75;

/** Any owed refund must be issued within 30 days of a valid request (Logan). */
export const REFUND_DUE_WITHIN_DAYS = 30;

/** The date by which an owed refund must be issued, given the request date. */
export function refundDueBy(requestedAt: Date): Date {
  return new Date(requestedAt.getTime() + REFUND_DUE_WITHIN_DAYS * 24 * 60 * 60 * 1000);
}

export interface RefundInput {
  tuitionCharged: number;
  applicationFee: number;
  deposit: number;
  /** Percentage of the program completed, 0..1 (credit hours completed ÷ total). */
  percentCompleted: number;
  phaseBoundary?: number;
}

export interface RefundBreakdown {
  applicationFeeRefund: number;
  depositRefund: number;
  tuitionRefund: number;
  totalRefund: number;
  phase: 1 | 2;
}

export function calculateRefund(input: RefundInput): RefundBreakdown {
  const boundary = input.phaseBoundary ?? REFUND_PHASE_BOUNDARY;
  const pct = clamp01(input.percentCompleted);
  const inPhase2 = pct >= boundary;

  // Phase 1: refund the unearned portion of tuition. Phase 2: no tuition refund.
  const tuitionRefund = inPhase2 ? 0 : round2(input.tuitionCharged * (1 - pct));

  return {
    applicationFeeRefund: 0, // always non-refundable
    depositRefund: 0, // non-refundable
    tuitionRefund,
    totalRefund: tuitionRefund,
    phase: inPhase2 ? 2 : 1,
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
